import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as schema from "../../src/lib/ledger/schema";
import { createDelivery } from "../../src/lib/delivery/service";
import { readOrderSnapshot } from "../../src/lib/ledger/snapshot";
import { createRecoveryHandlers } from "../../src/lib/delivery/recovery-http";
import { historyWindow, reconcileHistory } from "../../src/lib/ledger/history";
import { digest, newToken } from "../../src/lib/delivery/security";
import { browserToken, browserCookie } from "../../src/lib/delivery/security";
import { deliveryConfig } from "../../src/lib/delivery/config";
import { stripeFixture, ledgerSettings, sessionId, chargeId, created } from "./ledger-fixtures";

export async function exerciseRecovery<T extends PgQueryResultHKT>(t: TestContext, db: PgDatabase<T, typeof schema>) {
  let now = new Date("2026-10-24T00:00:00Z");
  let fixture = stripeFixture();
  const service = createDelivery(db, false, (id, known) => readOrderSnapshot(fixture.stripe, ledgerSettings, id, known), () => now);
  const browser = newToken(), other = newToken();
  const reset = async () => {
    await db.execute(sql`TRUNCATE commerce_reviews, commerce_delivery_recovery, commerce_delivery_tickets, commerce_delivery_grants,
      commerce_delivery_limits, commerce_entitlements, commerce_disputes, commerce_refunds,
      commerce_order_items, commerce_orders, commerce_webhook_events`);
    fixture = stripeFixture(); now = new Date("2026-10-24T00:00:00Z");
  };
  const prepare = () => service.prepareRecovery(sessionId, " TEST-BUYER@example.invalid ", browser);

  await t.test("recovery requires a paid purchase and its actual Stripe receipt email", async () => {
    await reset();
    assert.equal(await service.prepareRecovery(sessionId, "attacker@example.invalid", browser), null);
    assert.equal((await db.select().from(schema.deliveryRecovery)).length, 0);
    fixture.session.payment_status = "unpaid"; fixture.payment.status = "processing"; fixture.payment.latest_charge = null;
    assert.equal(await prepare(), null);
  });

  await t.test("an old order without any browser grant recovers only after email dispatch and browser-bound proof", async () => {
    await reset();
    const challenge = await prepare(); assert.ok(challenge);
    assert.equal(challenge.recipient, "test-buyer@example.invalid");
    const [record] = await db.select().from(schema.deliveryRecovery);
    assert.equal(record.tokenHash, digest(challenge.token));
    assert.equal(record.emailHash, digest("test-buyer@example.invalid"));
    assert.ok(!JSON.stringify(record).includes(challenge.token));
    assert.equal(await service.recover(challenge.token, browser), null, "an unsent challenge cannot grant access");
    assert.equal(await service.markRecoverySent(challenge.token), true);
    assert.equal(await service.recover(challenge.token, other), null);
    assert.equal(await service.recover(challenge.token, browser), sessionId);
    assert.equal((await service.status(sessionId, browser)).state, "paid");
    assert.equal((await service.status(sessionId, other)).state, "unverified");
    assert.equal(await service.recover(challenge.token, browser), null);
  });

  await t.test("only one concurrent recovery redeems the proof and the old browser cookie may expire", async () => {
    await reset();
    const challenge = await prepare(); assert.ok(challenge);
    await service.markRecoverySent(challenge.token);
    const results = await Promise.all([service.recover(challenge.token, browser), service.recover(challenge.token, browser)]);
    assert.equal(results.filter(Boolean).length, 1);
    now = new Date(now.getTime() + 31 * 24 * 60 * 60_000);
    const again = await service.prepareRecovery(sessionId, "test-buyer@example.invalid", other); assert.ok(again);
    await service.markRecoverySent(again.token);
    assert.equal(await service.recover(again.token, other), sessionId);
  });

  await t.test("expired email proofs and receipt-address changes cannot restore access", async () => {
    await reset();
    const challenge = await prepare(); assert.ok(challenge); await service.markRecoverySent(challenge.token);
    now = new Date(now.getTime() + 15 * 60_000);
    assert.equal(await service.recover(challenge.token, browser), null);
    const changed = await prepare(); assert.ok(changed); await service.markRecoverySent(changed.token);
    fixture.session.customer_details.email = "different@example.invalid";
    assert.equal(await service.recover(changed.token, browser), null);
  });

  await t.test("full refunds or disputes after email dispatch prevent new browser grants", async () => {
    await reset();
    const challenge = await prepare(); assert.ok(challenge); await service.markRecoverySent(challenge.token);
    fixture.charge.amount_refunded = 34900;
    fixture.refunds.push({ id: "re_recovery", charge: chargeId, currency: "thb", amount: 34900, status: "succeeded", created });
    assert.equal(await service.recover(challenge.token, browser), null);
    assert.equal((await db.select().from(schema.deliveryGrants)).length, 0);
    assert.equal(await prepare(), null);
    await reset();
    const disputed = await prepare(); assert.ok(disputed); await service.markRecoverySent(disputed.token);
    fixture.charge.disputed = true;
    fixture.disputes.push({ id: "du_recovery", charge: chargeId, currency: "thb", livemode: false, amount: 34900, status: "needs_response", created });
    assert.equal(await service.recover(disputed.token, browser), null);
  });

  await t.test("private email lookup finds eligible ledger orders without trusting user-supplied payment identifiers", async () => {
    await reset();
    assert.deepEqual(await service.recoverySessions("test-buyer@example.invalid"), []);
    await prepare();
    assert.deepEqual(await service.recoverySessions(" TEST-BUYER@example.invalid "), [sessionId]);
    assert.deepEqual(await service.recoverySessions("stranger@example.invalid"), []);
    assert.deepEqual(await service.recoverySessions("test-buyer@example.invalid\r\nBcc: victim@example.invalid"), []);
  });

  await t.test("recovery HTTP hides lookup outcomes and restores a new browser only through a confirmed email proof", async () => {
    await reset();
    const origin = "https://store.example";
    const delivery = deliveryConfig({ INKZ_SALES: "test", INKZ_ORDER_LEDGER: "test", INKZ_SECURE_DELIVERY: "test",
      STRIPE_SECRET_KEY: ledgerSettings.key, STRIPE_WEBHOOK_SECRET: ledgerSettings.webhookSecret, STRIPE_COMBAT_PRICE_ID: ledgerSettings.price,
      DATABASE_URL: ledgerSettings.databaseUrl, COMBAT_FILE_KEY: Buffer.alloc(32, 3).toString("base64"), STORE_ORIGIN: origin });
    assert.ok(delivery);
    const queued: (() => Promise<void>)[] = [];
    const sent: { recipient: string; token: string }[] = [];
    let accepted = true;
    const handlers = createRecoveryHandlers({ config: () => ({ delivery, email: { key: "re_testFixture", testRecipient: "test-buyer@example.invalid" } }),
      service: () => service,
      schedule: (work: () => Promise<void>) => queued.push(work),
      send: async (_config: unknown, recipient: string, _origin: string, token: string) => { sent.push({ recipient, token }); return accepted; },
    });
    const request = (email: string, site = origin) => new Request(origin + "/api/delivery/recovery", { method: "POST",
      headers: { origin: site, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ email, session_id: sessionId }) });
    assert.equal((await handlers.requestRecovery(request("test-buyer@example.invalid", "https://evil.example"))).status, 403);
    const response = await handlers.requestRecovery(request("test-buyer@example.invalid"));
    assert.equal(response.status, 303); assert.equal(response.headers.get("location"), "/recover?sent=1");
    assert.equal(fixture.calls.length, 0, "financial lookup runs after the generic response");
    assert.equal(sent.length, 0);
    const cookie = response.headers.get("set-cookie"); assert.ok(cookie);
    const credential = browserToken(cookie, origin); assert.ok(credential);
    for (const work of queued.splice(0)) await work();
    assert.equal(sent.length, 1); assert.equal(sent[0].recipient, "test-buyer@example.invalid");
    const unknown = await handlers.requestRecovery(request("unknown@example.invalid"));
    assert.equal(unknown.status, response.status); assert.equal(unknown.headers.get("location"), response.headers.get("location"));
    for (const work of queued.splice(0)) await work();
    assert.equal(sent.length, 1);
    const confirm = (token: string, buyer = credential) => new Request(origin + "/api/delivery/recovery/confirm", { method: "POST",
      headers: { origin, cookie: browserCookie(buyer, origin).split(";")[0], "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }) });
    assert.equal((await handlers.confirmRecovery(new Request(origin + "/api/delivery/recovery/confirm"))).status, 405);
    assert.equal((await handlers.confirmRecovery(confirm(sent[0].token, other))).headers.get("location"), "/recover?error=1");
    const confirmed = await handlers.confirmRecovery(confirm(sent[0].token));
    assert.equal(confirmed.status, 303);
    assert.equal(confirmed.headers.get("location"), `/download?session_id=${sessionId}`);
    assert.equal((await service.status(sessionId, credential)).state, "paid");
    assert.equal((await handlers.confirmRecovery(confirm(sent[0].token))).headers.get("location"), "/recover?error=1");
    accepted = false;
    const failed = await handlers.requestRecovery(request("test-buyer@example.invalid"));
    const failedBrowser = browserToken(failed.headers.get("set-cookie"), origin); assert.ok(failedBrowser);
    for (const work of queued.splice(0)) await work();
    assert.equal(await service.recover(sent.at(-1)!.token, failedBrowser), null, "email rejection cannot leave an active proof");
  });

  await t.test("historical reconciliation is dry-run by default and imports only explicit approved prices without browser grants", async () => {
    await reset();
    const options = { from: created - 60, to: created + 60, apply: false, legacyPrices: [] as string[] };
    const dry = await reconcileHistory(db, fixture.stripe, ledgerSettings, options);
    assert.equal(dry.active, 1); assert.equal(dry.recognized, 1);
    assert.equal((await db.select().from(schema.orders)).length, 0);
    fixture.session.line_items.data[0].price.id = "price_explicitHistorical349";
    const unknown = await reconcileHistory(db, fixture.stripe, ledgerSettings, { ...options, apply: true });
    assert.equal(unknown.unrecognized, 1);
    assert.equal((await db.select().from(schema.orders)).length, 0);
    const approved = await reconcileHistory(db, fixture.stripe, ledgerSettings, { ...options, apply: true, legacyPrices: ["price_explicitHistorical349"] });
    assert.equal(approved.recognized, 1);
    assert.equal((await db.select().from(schema.orders)).length, 1);
    assert.equal((await db.select().from(schema.deliveryGrants)).length, 0);
    assert.equal((await db.select().from(schema.webhookEvents)).length, 0);
    // Once persisted, the immutable item is sufficient even after removing the import allowlist.
    assert.equal((await reconcileHistory(db, fixture.stripe, ledgerSettings, { ...options, apply: true })).recognized, 1);
    assert.deepEqual(await service.recoverySessions("test-buyer@example.invalid"), [sessionId]);
    assert.throws(() => historyWindow("2026-02-30", "2026-03-02"));
    assert.throws(() => historyWindow("2026-01-01", "2026-06-01"));
    assert.throws(() => historyWindow("2026-10-24", "2026-10-01"));
  });
}
