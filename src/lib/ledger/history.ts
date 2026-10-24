import "server-only";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import type { LedgerConfig } from "./config";
import { createLedger } from "./ledger";
import { entitlementFor, readOrderSnapshot, type KnownItem } from "./snapshot";
import { COMBAT_SALE } from "../store/config";

/** Explicit bounded windows; --to is exclusive. Invalid calendar dates never normalize silently. */
export function historyWindow(from: string, to: string) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use YYYY-MM-DD dates.");
    const ms = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date.");
    return ms / 1000;
  };
  const start = parse(from), end = parse(to);
  if (end <= start || end - start > 31 * 86400) throw new Error("Choose an increasing window of at most 31 days.");
  return { from: start, to: end };
}

export async function reconcileHistory<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof schema>, stripe: Stripe,
  config: LedgerConfig, options: { from: number; to: number; apply: boolean; legacyPrices: string[] }) {
  if (!Number.isSafeInteger(options.from) || !Number.isSafeInteger(options.to) || options.to <= options.from ||
    options.to - options.from > 31 * 86400 || options.legacyPrices.length > 5 ||
    options.legacyPrices.some(price => !/^price_[A-Za-z0-9]+$/.test(price))) throw new Error("Invalid reconciliation scope.");
  const summary = { scanned: 0, recognized: 0, active: 0, unavailable: 0, ignored: 0, unrecognized: 0, errors: 0, truncated: false };
  const live = config.mode === "live", ledger = createLedger(db);
  for await (const session of stripe.checkout.sessions.list({ created: { gte: options.from, lt: options.to }, limit: 100 })) {
    if (summary.scanned === 500) { summary.truncated = true; break; }
    summary.scanned++;
    if (session.livemode !== live) throw new Error("Stripe mode mismatch.");
    if (session.metadata?.product !== COMBAT_SALE.slug) { summary.ignored++; continue; }
    const reader = async (id: string, known?: KnownItem) => {
      if (known) return readOrderSnapshot(stripe, config, id, known);
      // Explicit operator-approved historic prices must still match the exact product,
      // version, 349 THB amount, quantity, payment relationships and financial state.
      for (const price of new Set([config.price, ...options.legacyPrices])) {
        const snapshot = await readOrderSnapshot(stripe, { ...config, price }, id);
        if (snapshot) return snapshot;
      }
      return null;
    };
    try {
      let snapshot;
      if (options.apply) snapshot = await ledger.current(live, session.id, reader, async (_tx, current) => current);
      else {
        const [existing] = await db.select({ item: schema.orderItems }).from(schema.orders)
          .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
          .where(and(eq(schema.orders.live, live), eq(schema.orders.sessionId, session.id)));
        snapshot = await reader(session.id, existing?.item);
      }
      if (!snapshot) { summary.unrecognized++; continue; }
      summary.recognized++;
      if (entitlementFor(snapshot).state === "active") summary.active++;
      else summary.unavailable++;
    } catch { summary.errors++; }
  }
  return summary;
}
