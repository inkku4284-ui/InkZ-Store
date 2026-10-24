import "server-only";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../ledger/schema";

export type SalesRange = { from: Date; to: Date; interval: "day" | "week" | "month" };
export type SalesMetrics = {
  totals: { orders: number; grossMinor: number; refundedMinor: number; netMinor: number; disputedMinor: number };
  products: { product: string; sales: number; grossMinor: number }[];
  trend: { period: string; sales: number; grossMinor: number; refundedMinor: number; netMinor: number }[];
  latestSync: string | null;
};

/** Revenue cohorts use the ORIGINAL UTC paid_at date, including subsequent successful refunds.
 * Net = captured gross - succeeded refunds. Stripe fees and dispute deductions are excluded;
 * disputed amounts appear separately. This is commerce reporting, not settlement accounting. */
export async function salesMetrics<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof schema>, live: boolean, range: SalesRange): Promise<SalesMetrics> {
  const from = range.from.getTime(); const to = range.to.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 366 * 86_400_000 ||
    !["day", "week", "month"].includes(range.interval)) throw new Error("Invalid sales reporting range.");
  return db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL statement_timeout = '8s'`);
    const scope = and(eq(schema.orders.live, live), eq(schema.orders.paymentState, "paid"),
      gte(schema.orders.paidAt, range.from), lt(schema.orders.paidAt, range.to), sql`${schema.orders.captured} > 0`);
    // Aggregate adjustments before joining so multiple refunds cannot multiply captures or sales.
    const refundTotals = tx.select({ orderId: schema.refunds.orderId,
      amount: sql<number>`sum(${schema.refunds.amount})`.mapWith(Number).as("succeeded_refund_total") })
      .from(schema.refunds).where(eq(schema.refunds.status, "succeeded")).groupBy(schema.refunds.orderId).as("succeeded_refunds");
    const [totals] = await tx.select({
      orders: sql<number>`count(*)`.mapWith(Number),
      grossMinor: sql<number>`coalesce(sum(${schema.orders.captured}),0)`.mapWith(Number),
      refundedMinor: sql<number>`coalesce(sum(${refundTotals.amount}),0)`.mapWith(Number),
    }).from(schema.orders).leftJoin(refundTotals, eq(refundTotals.orderId, schema.orders.id)).where(scope);
    const products = await tx.select({ product: schema.orderItems.product,
      sales: sql<number>`sum(${schema.orderItems.quantity})`.mapWith(Number),
      grossMinor: sql<number>`sum(${schema.orders.captured})`.mapWith(Number),
    }).from(schema.orders).innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id)).where(scope)
      .groupBy(schema.orderItems.product).orderBy(schema.orderItems.product);
    const period = sql<string>`to_char(date_trunc(${range.interval}, ${schema.orders.paidAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`.as("report_period");
    const rows = await tx.select({ period,
      sales: sql<number>`count(*)`.mapWith(Number),
      grossMinor: sql<number>`sum(${schema.orders.captured})`.mapWith(Number),
      refundedMinor: sql<number>`coalesce(sum(${refundTotals.amount}),0)`.mapWith(Number),
    }).from(schema.orders).leftJoin(refundTotals, eq(refundTotals.orderId, schema.orders.id)).where(scope)
      .groupBy(sql`report_period`).orderBy(sql`report_period`);
    const [disputed] = await tx.select({ amount: sql<number>`coalesce(sum(${schema.disputes.amount}),0)`.mapWith(Number) })
      .from(schema.disputes).innerJoin(schema.orders, eq(schema.orders.id, schema.disputes.orderId))
      .where(and(scope, ne(schema.disputes.status, "won"), ne(schema.disputes.status, "warning_closed")));
    const [synced] = await tx.select({ at: sql<string | null>`max(${schema.orders.syncedAt})::text` })
      .from(schema.orders).where(eq(schema.orders.live, live));
    return { totals: { ...totals, netMinor: totals.grossMinor - totals.refundedMinor, disputedMinor: disputed.amount },
      products, trend: rows.map(row => ({ ...row, netMinor: row.grossMinor - row.refundedMinor })), latestSync: synced.at };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export function salesRange(period: string | undefined, now = new Date()): SalesRange {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const interval = period === "week" || period === "month" ? period : "day";
  const days = interval === "month" ? 365 : interval === "week" ? 84 : 30;
  return { from: new Date(to.getTime() - days * 86_400_000), to, interval };
}
