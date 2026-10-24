import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../ledger/schema";
import { createLedger, type SnapshotReader } from "../ledger/ledger";
import { entitlementFor } from "../ledger/snapshot";
import { createDelivery } from "../delivery/service";
import { TOKEN, digest } from "../delivery/security";
import { SESSION_ID } from "../store/stripe";
import { COMBAT_SALE } from "../store/config";
import { validateReview } from "./validation";
import { reviews } from "./schema";

export type ReviewStatus = "pending" | "approved" | "rejected";
export type PublicReview = { id: string; rating: number; displayName: string; body: string; createdAt: Date; verified: true };
export type PublicReviews = { reviews: PublicReview[]; total: number; average: number | null; page: number; hasMore: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createReviews<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof schema>,
  live: boolean, readSnapshot: SnapshotReader, clock = () => new Date()) {
  const ledger = createLedger(db), delivery = createDelivery(db, live, readSnapshot, clock);
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  async function granted(source: typeof db | Transaction, id: string, browser: string) {
    if (!SESSION_ID.test(id) || !id.startsWith(live ? "cs_live_" : "cs_test_") || !TOKEN.test(browser)) return false;
    return (await source.select({ id: schema.deliveryGrants.id }).from(schema.deliveryGrants).where(and(
      eq(schema.deliveryGrants.live, live), eq(schema.deliveryGrants.sessionId, id),
      eq(schema.deliveryGrants.browserHash, digest(browser)), gt(schema.deliveryGrants.expiresAt, clock()))).limit(1)).length === 1;
  }
  const published = (product: string) => and(eq(schema.orders.live, live), eq(schema.orderItems.product, product),
    eq(reviews.status, "approved"), eq(schema.entitlements.state, "active"));
  return {
    allow: delivery.allow,
    async submit(id: string, browser: string, raw: unknown): Promise<"submitted" | "unverified" | "invalid" | "limited"> {
      const input = validateReview(raw);
      if (!input) return "invalid";
      // Never disclose or query a Stripe Session from an unbound browser.
      if (!await granted(db, id, browser)) return "unverified";
      if (!await delivery.allow(`review:order:${id}`, 3, 24 * 60 * 60) ||
        !await delivery.allow(`review:browser:${browser}`, 10, 24 * 60 * 60)) return "limited";
      return ledger.current(live, id, readSnapshot, async (tx, snapshot) => {
        if (!snapshot || snapshot.item.product !== COMBAT_SALE.slug || entitlementFor(snapshot).state !== "active" ||
          !await granted(tx, id, browser)) return "unverified";
        const [item] = await tx.select({ id: schema.orderItems.id }).from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
          .where(and(eq(schema.orders.live, live), eq(schema.orders.sessionId, id))).limit(1);
        if (!item) return "unverified";
        // One review per purchased item. Every edit returns to moderation.
        await tx.insert(reviews).values({ orderItemId: item.id, ...input, updatedAt: clock() })
          .onConflictDoUpdate({ target: reviews.orderItemId, set: { ...input, status: "pending", moderatedAt: null,
            updatedAt: clock(), revision: sql`${reviews.revision} + 1` } });
        return "submitted";
      });
    },
    async publicList(product: string, page = 1): Promise<PublicReviews> {
      const current = Number.isInteger(page) && page >= 1 && page <= 100 ? page : 1;
      if (product !== COMBAT_SALE.slug) return { reviews: [], total: 0, average: null, page: current, hasMore: false };
      const join = () => db.select({ total: sql<number>`count(*)::integer`, average: sql<string | null>`avg(${reviews.rating})` })
        .from(reviews).innerJoin(schema.orderItems, eq(schema.orderItems.id, reviews.orderItemId))
        .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
        .innerJoin(schema.entitlements, eq(schema.entitlements.orderItemId, schema.orderItems.id));
      const [stats] = await join().where(published(product));
      const rows = await db.select({ id: reviews.id, rating: reviews.rating, displayName: reviews.displayName,
        body: reviews.body, createdAt: reviews.createdAt }).from(reviews)
        .innerJoin(schema.orderItems, eq(schema.orderItems.id, reviews.orderItemId))
        .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
        .innerJoin(schema.entitlements, eq(schema.entitlements.orderItemId, schema.orderItems.id))
        .where(published(product)).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(10).offset((current - 1) * 10);
      return { reviews: rows.map(row => ({ ...row, verified: true })), total: stats.total,
        average: stats.average === null ? null : Number(stats.average), page: current, hasMore: current * 10 < stats.total };
    },
    /** Trusted server use only: the owner route must authenticate before calling. No receipt data is selected. */
    async ownerList(status: ReviewStatus = "pending") {
      if (!["pending", "approved", "rejected"].includes(status)) return [];
      return db.select({ id: reviews.id, rating: reviews.rating, displayName: reviews.displayName, body: reviews.body,
        status: reviews.status, revision: reviews.revision, createdAt: reviews.createdAt, updatedAt: reviews.updatedAt,
        product: schema.orderItems.product, entitlement: schema.entitlements.state }).from(reviews)
        .innerJoin(schema.orderItems, eq(schema.orderItems.id, reviews.orderItemId))
        .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
        .innerJoin(schema.entitlements, eq(schema.entitlements.orderItemId, schema.orderItems.id))
        .where(and(eq(schema.orders.live, live), eq(reviews.status, status))).orderBy(desc(reviews.updatedAt)).limit(100);
    },
    /** Revision prevents approval of text edited after the owner opened the moderation page. */
    async moderate(id: string, status: "approved" | "rejected", revision: number) {
      if (!UUID.test(id) || !["approved", "rejected"].includes(status) || !Number.isSafeInteger(revision) || revision < 1) return false;
      const changed = await db.update(reviews).set({ status, moderatedAt: clock() }).where(and(
        eq(reviews.id, id), eq(reviews.revision, revision),
        sql`${reviews.orderItemId} IN (SELECT i.id FROM commerce_order_items i JOIN commerce_orders o ON o.id = i.order_id WHERE o.live = ${live})`))
        .returning({ id: reviews.id });
      return changed.length === 1;
    },
  };
}
