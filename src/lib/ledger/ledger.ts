import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { entitlementFor, type KnownItem, type OrderSnapshot } from "./snapshot";

type Receipt = { id: string; type: string; live: boolean };
export type SnapshotReader = (sessionId: string, known?: KnownItem) => Promise<OrderSnapshot | null>;

export function createLedger<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof schema>) {
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  async function sync(tx: Transaction, live: boolean, sessionId: string, readSnapshot: SnapshotReader) {
    // A transaction-scoped lock also serializes the FIRST events, before an order row exists.
    // Acquire it before reading Stripe so two distinct events cannot overwrite a refund with stale paid state.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${live}:${sessionId}`}, 0))`);
    const [existing] = await tx.select({ order: schema.orders, item: schema.orderItems }).from(schema.orders)
      .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
      .where(and(eq(schema.orders.sessionId, sessionId), eq(schema.orders.live, live)));
    const known = existing ? {
      product: existing.item.product, version: existing.item.version, priceId: existing.item.priceId,
      unitAmount: existing.item.unitAmount, quantity: existing.item.quantity,
    } : undefined;
    const snapshot = await readSnapshot(sessionId, known);
    if (!snapshot) return null;
    if (snapshot.sessionId !== sessionId || snapshot.live !== live) throw new Error("Ledger scope mismatch.");
    const { item, refunds, disputes, ...order } = snapshot;
    const now = new Date();
    const [saved] = await tx.insert(schema.orders).values({ ...order, syncedAt: now })
      .onConflictDoUpdate({ target: [schema.orders.live, schema.orders.sessionId], set: { ...order, syncedAt: now } })
      .returning({ id: schema.orders.id });
    const [savedItem] = await tx.insert(schema.orderItems).values({ ...item, orderId: saved.id })
      .onConflictDoNothing().returning({ id: schema.orderItems.id });
    const itemId = savedItem?.id ?? existing?.item.id;
    if (!itemId) throw new Error("Ledger item missing.");
    // All adjustments were read in full from Stripe. Replace them atomically with that current snapshot.
    await tx.delete(schema.refunds).where(eq(schema.refunds.orderId, saved.id));
    await tx.delete(schema.disputes).where(eq(schema.disputes.orderId, saved.id));
    if (refunds.length) await tx.insert(schema.refunds).values(refunds.map(r => ({ ...r, orderId: saved.id })));
    if (disputes.length) await tx.insert(schema.disputes).values(disputes.map(d => ({ ...d, orderId: saved.id })));
    const entitlement = { ...entitlementFor(snapshot), updatedAt: now };
    await tx.insert(schema.entitlements).values({ ...entitlement, orderItemId: itemId })
      .onConflictDoUpdate({ target: schema.entitlements.orderItemId, set: entitlement });
    return snapshot;
  }
  async function timeouts(tx: Transaction) {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
  }
  return {
    async record(event: Receipt, sessionId: string | null, readSnapshot: SnapshotReader) {
      return db.transaction(async tx => {
        await timeouts(tx);
        const claimed = await tx.insert(schema.webhookEvents).values({ ...event, outcome: "ignored" })
          .onConflictDoNothing().returning({ id: schema.webhookEvents.id });
        if (!claimed.length) return "duplicate" as const;
        if (!sessionId || !await sync(tx, event.live, sessionId, readSnapshot)) return "ignored" as const;
        await tx.update(schema.webhookEvents).set({ outcome: "processed" }).where(eq(schema.webhookEvents.id, event.id));
        return "processed" as const;
      });
    },
    /** Read reconciliation and capability consumption share the webhook's order lock.
     * No synthetic webhook receipts; financial state and the action commit together. */
    async current<R>(live: boolean, sessionId: string, readSnapshot: SnapshotReader,
      action: (tx: Transaction, snapshot: OrderSnapshot | null) => Promise<R>) {
      return db.transaction(async tx => {
        await timeouts(tx);
        return action(tx, await sync(tx, live, sessionId, readSnapshot));
      });
    },
  };
}
