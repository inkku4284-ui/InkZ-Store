import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../ledger/schema";
import { createLedger, type SnapshotReader } from "../ledger/ledger";
import { entitlementFor } from "../ledger/snapshot";
import { SESSION_ID } from "../store/stripe";
import { BROWSER_TTL, TICKET_TTL, TOKEN, digest, newToken } from "./security";
import { normalizeReceiptEmail } from "./email-address";

export function createDelivery<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof schema>,
  live: boolean, readSnapshot: SnapshotReader, clock = () => new Date()) {
  const ledger = createLedger(db);
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  const validSession = (id: string) => SESSION_ID.test(id) && id.startsWith(live ? "cs_live_" : "cs_test_");
  const grantCondition = (id: string, browser: string) => and(
    eq(schema.deliveryGrants.live, live), eq(schema.deliveryGrants.sessionId, id),
    eq(schema.deliveryGrants.browserHash, digest(browser)), gt(schema.deliveryGrants.expiresAt, clock()));
  const hasGrant = async (source: typeof db | Transaction, id: string, browser: string) => {
    if (!validSession(id) || !TOKEN.test(browser)) return false;
    return (await source.select({ id: schema.deliveryGrants.id }).from(schema.deliveryGrants)
      .where(grantCondition(id, browser)).limit(1)).length === 1;
  };
  const saveGrant = async (source: typeof db | Transaction, id: string, browser: string) => {
    const expiresAt = new Date(clock().getTime() + BROWSER_TTL * 1000);
    await source.insert(schema.deliveryGrants).values({ live, sessionId: id, browserHash: digest(browser), expiresAt })
      .onConflictDoUpdate({ target: [schema.deliveryGrants.live, schema.deliveryGrants.sessionId, schema.deliveryGrants.browserHash], set: { expiresAt } });
  };
  return {
    /** Called only with the Session returned directly by Stripe's create operation. */
    async bindCheckout(id: string, browser: string) {
      if (!validSession(id) || !TOKEN.test(browser)) throw new Error("Invalid purchase binding.");
      await saveGrant(db, id, browser);
    },
    /** Private lookup for customers who lost their order URL. Never return candidates to HTTP clients. */
    async recoverySessions(address: string) {
      const email = normalizeReceiptEmail(address);
      if (!email) return [];
      const candidates = await db.select({ id: schema.orders.sessionId }).from(schema.orders)
        .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
        .innerJoin(schema.entitlements, eq(schema.entitlements.orderItemId, schema.orderItems.id))
        .where(and(eq(schema.orders.live, live), eq(schema.entitlements.state, "active"),
          sql`lower(btrim(${schema.orders.email})) = ${email}`))
        .orderBy(desc(schema.orders.paidAt)).limit(10);
      return candidates.map(row => row.id);
    },
    /** Return a secret only to the trusted server email sender, never to the requesting customer. */
    async prepareRecovery(id: string, address: string, browser: string) {
      const email = normalizeReceiptEmail(address);
      if (!validSession(id) || !email || !TOKEN.test(browser)) return null;
      return ledger.current(live, id, readSnapshot, async (tx, snapshot) => {
        if (!snapshot || entitlementFor(snapshot).state !== "active" ||
          !snapshot.email || normalizeReceiptEmail(snapshot.email) !== email) return null;
        const token = newToken();
        await tx.insert(schema.deliveryRecovery).values({ tokenHash: digest(token), live, sessionId: id,
          browserHash: digest(browser), emailHash: digest(email), expiresAt: new Date(clock().getTime() + 15 * 60_000) });
        return { token, recipient: snapshot.email.trim() };
      });
    },
    async markRecoverySent(token: string) {
      if (!TOKEN.test(token)) return false;
      const changed = await db.update(schema.deliveryRecovery).set({ sent: true }).where(and(
        eq(schema.deliveryRecovery.tokenHash, digest(token)), eq(schema.deliveryRecovery.live, live),
        gt(schema.deliveryRecovery.expiresAt, clock()), isNull(schema.deliveryRecovery.consumedAt)))
        .returning({ id: schema.deliveryRecovery.tokenHash });
      return changed.length === 1;
    },
    async recover(token: string, browser: string) {
      if (!TOKEN.test(token) || !TOKEN.test(browser)) return null;
      const match = () => and(eq(schema.deliveryRecovery.tokenHash, digest(token)), eq(schema.deliveryRecovery.live, live),
        eq(schema.deliveryRecovery.browserHash, digest(browser)), eq(schema.deliveryRecovery.sent, true),
        gt(schema.deliveryRecovery.expiresAt, clock()), isNull(schema.deliveryRecovery.consumedAt));
      const [challenge] = await db.select().from(schema.deliveryRecovery).where(match()).limit(1);
      if (!challenge || !validSession(challenge.sessionId)) return null;
      return ledger.current(live, challenge.sessionId, readSnapshot, async (tx, snapshot) => {
        const email = snapshot?.email ? normalizeReceiptEmail(snapshot.email) : null;
        if (!snapshot || entitlementFor(snapshot).state !== "active" || !email || digest(email) !== challenge.emailHash) return null;
        const used = await tx.update(schema.deliveryRecovery).set({ consumedAt: clock() }).where(match())
          .returning({ id: schema.deliveryRecovery.tokenHash });
        if (!used.length) return null;
        await saveGrant(tx, challenge.sessionId, browser);
        return challenge.sessionId;
      });
    },
    /** Persistent limits across function instances. Store only hashes, never IPs or emails. */
    async allow(key: string, maximum: number, seconds: number) {
      const now = clock();
      const expiresAt = new Date(now.getTime() + seconds * 1000);
      const [result] = await db.insert(schema.deliveryLimits).values({ keyHash: digest(`${live}:${key}`), hits: 1, expiresAt })
        .onConflictDoUpdate({ target: schema.deliveryLimits.keyHash, set: {
          hits: sql`CASE WHEN ${schema.deliveryLimits.expiresAt} <= ${now} THEN 1 ELSE ${schema.deliveryLimits.hits} + 1 END`,
          expiresAt: sql`CASE WHEN ${schema.deliveryLimits.expiresAt} <= ${now} THEN ${expiresAt} ELSE ${schema.deliveryLimits.expiresAt} END`,
        } }).returning({ hits: schema.deliveryLimits.hits });
      return result.hits <= maximum;
    },
    async status(id: string, browser: string) {
      if (!await hasGrant(db, id, browser)) return { state: "unverified" as const };
      return ledger.current(live, id, readSnapshot, async (tx, snapshot) => {
        if (!snapshot || !await hasGrant(tx, id, browser)) return { state: "unverified" as const };
        const entitlement = entitlementFor(snapshot);
        if (entitlement.state === "active") return { state: "paid" as const, created: snapshot.createdAt };
        if (snapshot.paymentState === "pending") return { state: "pending" as const };
        return { state: "unavailable" as const };
      });
    },
    async issue(id: string, browser: string) {
      if (!await hasGrant(db, id, browser)) return null;
      return ledger.current(live, id, readSnapshot, async (tx, snapshot) => {
        if (!snapshot || entitlementFor(snapshot).state !== "active" || !await hasGrant(tx, id, browser)) return null;
        const token = newToken();
        await tx.insert(schema.deliveryTickets).values({ tokenHash: digest(token), live, sessionId: id,
          browserHash: digest(browser), expiresAt: new Date(clock().getTime() + TICKET_TTL * 1000) });
        return token;
      });
    },
    async redeem(token: string, browser: string) {
      if (!TOKEN.test(token) || !TOKEN.test(browser)) return false;
      const match = () => and(eq(schema.deliveryTickets.tokenHash, digest(token)), eq(schema.deliveryTickets.live, live),
        eq(schema.deliveryTickets.browserHash, digest(browser)), gt(schema.deliveryTickets.expiresAt, clock()), isNull(schema.deliveryTickets.consumedAt));
      const [ticket] = await db.select().from(schema.deliveryTickets).where(match()).limit(1);
      if (!ticket || !await hasGrant(db, ticket.sessionId, browser)) return false;
      return ledger.current(live, ticket.sessionId, readSnapshot, async (tx, snapshot) => {
        if (!snapshot || entitlementFor(snapshot).state !== "active" || !await hasGrant(tx, ticket.sessionId, browser)) return false;
        // The conditional update is the single-use boundary, including simultaneous requests.
        const used = await tx.update(schema.deliveryTickets).set({ consumedAt: clock() }).where(match())
          .returning({ tokenHash: schema.deliveryTickets.tokenHash });
        return used.length === 1;
      });
    },
  };
}
