import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../src/lib/ledger/schema";
import { createDelivery } from "../../src/lib/delivery/service";
import { createLedger } from "../../src/lib/ledger/ledger";
import { readOrderSnapshot } from "../../src/lib/ledger/snapshot";
import { newToken, digest, browserCookie } from "../../src/lib/delivery/security";
import { createDeliveryHandlers } from "../../src/lib/delivery/http";
import { deliveryConfig } from "../../src/lib/delivery/config";
import { stripeFixture, ledgerSettings, sessionId, chargeId, created } from "./ledger-fixtures";

export async function exerciseDelivery<T extends PgQueryResultHKT>(t: TestContext, db: PgDatabase<T, typeof schema>) {
  let now = new Date("2026-10-22T00:00:00Z");
  let f = stripeFixture();
  const read = (id: string, known?: Parameters<typeof readOrderSnapshot>[3]) => readOrderSnapshot(f.stripe, ledgerSettings, id, known);
  const service = createDelivery(db, false, read, () => now);
  const buyer = newToken(), stranger = newToken();
  const reset = async () => {
    await db.execute(sql`TRUNCATE commerce_reviews, commerce_delivery_tickets, commerce_delivery_grants, commerce_delivery_limits,
      commerce_entitlements, commerce_disputes, commerce_refunds, commerce_order_items, commerce_orders, commerce_webhook_events`);
    f = stripeFixture();
    now = new Date("2026-10-22T00:00:00Z");
  };
  const refund = () => {
    f.charge.amount_refunded = 34900;
    f.refunds.push({ id: "re_deliveryFull", charge: chargeId, currency: "thb", amount: 34900, status: "succeeded", created });
  };

  await t.test("Session IDs alone and other browsers cannot query a buyer's purchase or mint tickets", async () => {
    await reset();
    assert.equal((await service.status(sessionId, buyer)).state, "unverified");
    assert.equal(await service.issue(sessionId, buyer), null);
    await service.bindCheckout(sessionId, buyer);
    assert.equal((await service.status(sessionId, stranger)).state, "unverified");
    assert.equal(await service.issue(sessionId, stranger), null);
    assert.equal(f.calls.length, 0, "no Stripe lookup before a matching browser grant");
    assert.equal((await db.select().from(schema.orders)).length, 0);
    const [grant] = await db.select().from(schema.deliveryGrants);
    assert.equal(grant.browserHash, digest(buyer));
    assert.ok(!JSON.stringify(grant).includes(buyer));
    await assert.rejects(service.bindCheckout(sessionId.replace("cs_test_", "cs_live_"), buyer));
  });

  await t.test("paid checkout reconciles without a webhook and tickets are browser-bound, hashed and single-use", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    assert.equal((await service.status(sessionId, buyer)).state, "paid");
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    const [ticket] = await db.select().from(schema.deliveryTickets);
    assert.equal(ticket.tokenHash, digest(token));
    assert.ok(!JSON.stringify(ticket).includes(token));
    assert.equal(await service.redeem(token, stranger), false);
    assert.equal(await service.redeem(token, buyer), true);
    assert.equal(await service.redeem(token, buyer), false);
    assert.equal((await db.select().from(schema.webhookEvents)).length, 0, "reads never invent webhook events");
    assert.ok(await service.issue(sessionId, buyer), "a legitimate buyer can request another download");
  });

  await t.test("simultaneous redemption returns exactly one winner", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    const outcomes = await Promise.all([service.redeem(token, buyer), service.redeem(token, buyer), service.redeem(token, buyer)]);
    assert.equal(outcomes.filter(Boolean).length, 1);
  });

  await t.test("expired tickets and expired grants cannot deliver; a new ticket does not revive an expired grant", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    now = new Date(now.getTime() + 90_000);
    assert.equal(await service.redeem(token, buyer), false);
    assert.ok(await service.issue(sessionId, buyer));
    now = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
    assert.equal(await service.issue(sessionId, buyer), null);
  });

  await t.test("refund after ticket issuance blocks delivery even before its webhook arrives", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    refund();
    assert.equal(await service.redeem(token, buyer), false);
    assert.equal(await service.issue(sessionId, buyer), null);
    assert.equal((await db.select().from(schema.entitlements))[0].state, "revoked");
    // A late paid event cannot resurrect the permission.
    await createLedger(db).record({ id: "evt_deliveryLatePaid", type: "checkout.session.completed", live: false }, sessionId, read);
    assert.equal(await service.redeem(token, buyer), false);
  });

  await t.test("disputes suspend issued tickets and unknown payment relationships fail closed", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    f.charge.disputed = true;
    f.disputes.push({ id: "du_delivery", charge: chargeId, livemode: false, currency: "thb", amount: 34900, status: "needs_response", created });
    assert.equal(await service.redeem(token, buyer), false);
    f.disputes[0].status = "won";
    f.charge.disputed = false;
    assert.equal(await service.redeem(token, buyer), true);
    f.payment.latest_charge = "ch_unrelated";
    await assert.rejects(service.issue(sessionId, buyer));
  });

  await t.test("pending PromptPay cannot mint, outages leave tickets retryable and known historical items remain immutable", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    f.session.payment_status = "unpaid"; f.payment.status = "processing"; f.payment.latest_charge = null;
    assert.equal((await service.status(sessionId, buyer)).state, "pending");
    assert.equal(await service.issue(sessionId, buyer), null);
    f.session.payment_status = "paid"; f.payment.status = "succeeded"; f.payment.latest_charge = chargeId;
    const token = await service.issue(sessionId, buyer);
    assert.ok(token);
    const unavailable = createDelivery(db, false, async () => { throw new Error("simulated transport outage"); }, () => now);
    await assert.rejects(unavailable.redeem(token, buyer));
    assert.equal((await db.select().from(schema.deliveryTickets).where(eq(schema.deliveryTickets.tokenHash, digest(token))))[0].consumedAt, null);
    const changedPrice = createDelivery(db, false, (id, known) => readOrderSnapshot(f.stripe, { ...ledgerSettings, price: "price_new" }, id, known), () => now);
    assert.equal(await changedPrice.redeem(token, buyer), true);
  });

  await t.test("persistent rate limits are shared across service instances, atomic under load, and reset on expiry", async () => {
    await reset();
    const other = createDelivery(db, false, read, () => now);
    const outcomes = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? other : service).allow("ip:private-address", 5, 60)));
    assert.equal(outcomes.filter(Boolean).length, 5);
    const [limit] = await db.select().from(schema.deliveryLimits);
    assert.equal(limit.hits, 12);
    assert.ok(!JSON.stringify(limit).includes("private-address"));
    now = new Date(now.getTime() + 60_000);
    assert.equal(await other.allow("ip:private-address", 5, 60), true);
  });

  await t.test("HTTP form issues 303 and file endpoint rejects copied/replayed links without decrypting", async () => {
    await reset();
    await service.bindCheckout(sessionId, buyer);
    const config = deliveryConfig({ INKZ_SALES: "test", INKZ_ORDER_LEDGER: "test", INKZ_SECURE_DELIVERY: "test",
      STRIPE_SECRET_KEY: ledgerSettings.key, STRIPE_WEBHOOK_SECRET: ledgerSettings.webhookSecret, STRIPE_COMBAT_PRICE_ID: ledgerSettings.price,
      DATABASE_URL: ledgerSettings.databaseUrl, COMBAT_FILE_KEY: Buffer.alloc(32, 3).toString("base64"), STORE_ORIGIN: "https://store.example" });
    assert.ok(config);
    let decrypted = 0;
    const handlers = createDeliveryHandlers({ config: () => config, service: () => service,
      file: async () => { decrypted++; return Buffer.from("private test package"); } });
    const cookie = (token: string) => browserCookie(token, config.store.origin).split(";")[0];
    const form = (origin: string, token = buyer) => new Request(`${config.store.origin}/api/delivery/ticket`, {
      method: "POST", headers: { origin, cookie: cookie(token), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ session_id: sessionId }),
    });
    assert.equal((await handlers.issueDownload(form("https://evil.example"))).status, 403);
    assert.equal((await handlers.issueDownload(form(config.store.origin, stranger))).status, 403);
    const issue = await handlers.issueDownload(form(config.store.origin));
    assert.equal(issue.status, 303);
    const path = issue.headers.get("location"); assert.ok(path);
    const get = (token: string) => new Request(config.store.origin + path, { headers: { cookie: cookie(token) } });
    assert.equal((await handlers.secureDownload(get(stranger))).status, 403);
    assert.equal(decrypted, 0);
    const response = await handlers.secureDownload(get(buyer));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "private test package");
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal((await handlers.secureDownload(get(buyer))).status, 403);
    assert.equal(decrypted, 1);
    assert.equal((await handlers.secureDownload(new Request(config.store.origin + `/api/download?session_id=${sessionId}`, { headers: { cookie: cookie(buyer) } }))).status, 403);
  });
}
