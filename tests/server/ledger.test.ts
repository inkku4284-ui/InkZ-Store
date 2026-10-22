import { test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { createLedgerDatabase } from "../../src/lib/ledger/database";
import { createLedger } from "../../src/lib/ledger/ledger";
import { readOrderSnapshot, sessionForEvent } from "../../src/lib/ledger/snapshot";
import * as schema from "../../src/lib/ledger/schema";
import { stripeFixture, ledgerSettings, sessionId, chargeId, created } from "./ledger-fixtures";
import type Stripe from "stripe";
import { exerciseDelivery } from "./delivery-cases";

async function exerciseLedger<T extends PgQueryResultHKT>(t: TestContext, db: PgDatabase<T, typeof schema>) {
  const ledger = createLedger(db);
  let sequence = 0;
  const nextEvent = (type = "checkout.session.completed") => ({ id: `evt_integration_${++sequence}`, type, live: false });
  const reset = async () => {
    await db.execute(sql`TRUNCATE commerce_entitlements, commerce_disputes, commerce_refunds, commerce_order_items, commerce_orders, commerce_webhook_events`);
  };
  const record = (f: ReturnType<typeof stripeFixture>, event = nextEvent()) => ledger.record(event, sessionId,
    (id, known) => readOrderSnapshot(f.stripe, ledgerSettings, id, known));

  await t.test("migrated tables persist a discounted purchase and immutable product snapshot", async () => {
    await reset();
    const f = stripeFixture();
    f.session.amount_total = 29900;
    f.session.total_details.amount_discount = 5000;
    f.payment.amount = 29900;
    f.charge.amount = f.charge.amount_captured = 29900;
    assert.equal(await record(f), "processed");
    const [order] = await db.select().from(schema.orders);
    const [item] = await db.select().from(schema.orderItems);
    const [entitlement] = await db.select().from(schema.entitlements);
    assert.equal(order.total, 29900);
    assert.equal(order.captured, 29900);
    assert.equal(order.discount, 5000);
    assert.equal(order.paidAt?.getTime(), (created + 60) * 1000);
    assert.equal(order.email, "test-buyer@example.invalid");
    assert.equal(item.version, "1.0");
    assert.equal(item.priceId, ledgerSettings.price);
    assert.equal(entitlement.state, "active");
    // An operator replacing the active price cannot rewrite an already-recorded item.
    await ledger.record(nextEvent(), sessionId, (id, known) => readOrderSnapshot(f.stripe,
      { ...ledgerSettings, price: "price_replacement" }, id, known));
    assert.deepEqual(await db.select().from(schema.orderItems), [item]);
  });

  await t.test("duplicate and concurrent events create exactly one order and entitlement", async () => {
    await reset();
    const f = stripeFixture();
    const event = nextEvent();
    const results = await Promise.all([record(f, event), record(f, event), record(f, nextEvent())]);
    assert.equal(results.filter(r => r === "duplicate").length, 1);
    assert.equal((await db.select().from(schema.orders)).length, 1);
    assert.equal((await db.select().from(schema.entitlements)).length, 1);
    assert.equal((await db.select().from(schema.webhookEvents)).length, 2);
    // A duplicate delivery never asks Stripe again.
    assert.equal(await ledger.record(event, sessionId, async () => { assert.fail("duplicate must not read Stripe"); }), "duplicate");
  });

  await t.test("pending PromptPay stays inactive until current Stripe payment state succeeds", async () => {
    await reset();
    const f = stripeFixture();
    f.session.payment_status = "unpaid";
    f.payment.status = "processing";
    f.payment.latest_charge = null;
    await record(f);
    assert.equal((await db.select().from(schema.entitlements))[0].state, "inactive");
    assert.equal((await db.select().from(schema.orders))[0].captured, 0);
    f.session.payment_status = "paid";
    f.payment.status = "succeeded";
    f.payment.latest_charge = chargeId;
    await record(f, nextEvent("checkout.session.async_payment_succeeded"));
    // A late failure notification also reads the now-successful state instead of regressing it.
    await record(f, nextEvent("checkout.session.async_payment_failed"));
    assert.equal((await db.select().from(schema.entitlements))[0].state, "active");
    assert.equal((await db.select().from(schema.orders))[0].paymentState, "paid");
  });

  await t.test("failed, expired and zero-payment checkouts do not become paid entitlements", async () => {
    for (const scenario of ["failed", "expired", "free"] as const) {
      await reset();
      const f = stripeFixture();
      f.session.payment_status = "unpaid";
      f.payment.latest_charge = null;
      f.payment.status = "requires_payment_method";
      if (scenario === "failed") f.payment.last_payment_error = { code: "payment_method_unavailable" };
      if (scenario === "expired") f.session.status = "expired";
      if (scenario === "free") {
        Object.assign(f.session, { amount_total: 0, payment_status: "no_payment_required", payment_intent: null });
        f.session.total_details.amount_discount = 34900;
      }
      await record(f);
      assert.equal((await db.select().from(schema.entitlements))[0].state, "inactive");
      assert.equal((await db.select().from(schema.orders))[0].paymentState, scenario === "free" ? "pending" : scenario);
    }
  });

  await t.test("all refund pages are persisted; partial and pending refunds are distinguished", async () => {
    await reset();
    const f = stripeFixture();
    f.refunds.push(...[1, 2, 3].map(n => ({ id: `re_fixture${n}`, object: "refund", charge: chargeId,
      currency: "thb", amount: 1000, status: n === 3 ? "pending" : "succeeded", created: created + n })));
    f.charge.amount_refunded = 2000;
    await record(f, nextEvent("refund.updated"));
    assert.equal((await db.select().from(schema.refunds)).length, 3);
    assert.equal((await db.select().from(schema.orders))[0].refunded, 2000);
    assert.equal((await db.select().from(schema.entitlements))[0].reason, "partially_refunded");
    assert.equal(f.calls.filter(c => c === "/v1/refunds").length, 2);
    // A failed pending refund remains auditable but does not reduce revenue again.
    f.refunds[2].status = "failed";
    await record(f, nextEvent("refund.failed"));
    assert.equal((await db.select().from(schema.orders))[0].refunded, 2000);
    assert.equal((await db.select().from(schema.refunds).where(eq(schema.refunds.id, "re_fixture3")))[0].status, "failed");
  });

  await t.test("refund arriving before checkout and a late paid event cannot regrant access", async () => {
    await reset();
    const f = stripeFixture();
    f.refunds.push({ id: "re_full", object: "refund", charge: chargeId, currency: "thb", amount: 34900, status: "succeeded", created });
    f.charge.amount_refunded = 34900;
    await record(f, nextEvent("charge.refunded"));
    await record(f, nextEvent("checkout.session.completed"));
    assert.equal((await db.select().from(schema.orders))[0].refunded, 34900);
    assert.equal((await db.select().from(schema.entitlements))[0].state, "revoked");
    assert.equal((await db.select().from(schema.entitlements))[0].reason, "fully_refunded");
  });

  await t.test("disputes suspend, wins restore, losses revoke, and future statuses fail closed", async () => {
    await reset();
    const f = stripeFixture();
    f.charge.disputed = true;
    f.disputes.push({ id: "du_fixture", object: "dispute", charge: chargeId, livemode: false,
      currency: "thb", amount: 34900, status: "needs_response", created });
    await record(f, nextEvent("charge.dispute.created"));
    assert.equal((await db.select().from(schema.entitlements))[0].state, "suspended");
    f.disputes[0].status = "won";
    await record(f, nextEvent("charge.dispute.closed"));
    assert.equal((await db.select().from(schema.entitlements))[0].state, "active");
    f.disputes[0].status = "future_dispute_status";
    await record(f, nextEvent("charge.dispute.updated"));
    assert.equal((await db.select().from(schema.entitlements))[0].state, "suspended");
    f.disputes[0].status = "lost";
    await record(f, nextEvent("charge.dispute.closed"));
    assert.equal((await db.select().from(schema.entitlements))[0].state, "revoked");
    assert.equal((await db.select().from(schema.disputes))[0].status, "lost");
  });

  await t.test("Stripe or database failures roll back the event receipt, allowing the same event to retry", async () => {
    await reset();
    const failedStripe = stripeFixture();
    failedStripe.fail();
    const event = nextEvent();
    await assert.rejects(record(failedStripe, event));
    assert.equal((await db.select().from(schema.webhookEvents)).length, 0);
    const f = stripeFixture();
    const snapshot = await readOrderSnapshot(f.stripe, ledgerSettings, sessionId);
    assert.ok(snapshot);
    await assert.rejects(ledger.record(event, sessionId, async () => ({ ...snapshot, refunded: 34901 })));
    assert.equal((await db.select().from(schema.orders)).length, 0);
    assert.equal((await db.select().from(schema.webhookEvents)).length, 0);
    assert.equal(await record(f, event), "processed");
  });

  await t.test("unrelated products/prices are ignored without storing customer information", async () => {
    await reset();
    for (const scope of ["product", "price"] as const) {
      const f = stripeFixture();
      if (scope === "product") f.session.metadata.product = "another-store-product";
      else f.session.line_items.data[0].price.id = "price_unrecognized";
      assert.equal(await record(f), "ignored");
    }
    assert.equal((await db.select().from(schema.orders)).length, 0);
    const events = await db.select().from(schema.webhookEvents);
    assert.equal(events.length, 2);
    assert.doesNotMatch(JSON.stringify(events), /test-buyer|secret|receipt_email/);
  });

  await t.test("broken price, currency, capture, quantity and refund relationships never create orders", async () => {
    await reset();
    const corruptions = [
      (f: ReturnType<typeof stripeFixture>) => { f.session.currency = "usd"; },
      (f: ReturnType<typeof stripeFixture>) => { f.session.line_items.data[0].quantity = 2; },
      (f: ReturnType<typeof stripeFixture>) => { f.session.line_items.has_more = true; },
      (f: ReturnType<typeof stripeFixture>) => { f.payment.amount = 1; },
      (f: ReturnType<typeof stripeFixture>) => { f.charge.amount_captured = 100; },
      (f: ReturnType<typeof stripeFixture>) => { f.charge.payment_intent = "pi_different_order"; },
      (f: ReturnType<typeof stripeFixture>) => { f.charge.amount_refunded = 10; },
      (f: ReturnType<typeof stripeFixture>) => { f.session.total_details.amount_tax = 10; },
      (f: ReturnType<typeof stripeFixture>) => { f.session.metadata.version = "999"; },
      (f: ReturnType<typeof stripeFixture>) => { f.charge.balance_transaction.source = "ch_other_order"; },
    ];
    for (const corrupt of corruptions) {
      const f = stripeFixture();
      corrupt(f);
      await assert.rejects(record(f));
    }
    assert.equal((await db.select().from(schema.orders)).length, 0);
    assert.equal((await db.select().from(schema.webhookEvents)).length, 0);
  });

  await t.test("refund and dispute locators resolve Checkout Sessions through read-only Stripe calls", async () => {
    const f = stripeFixture();
    for (const object of [
      { object: "charge", id: chargeId, payment_intent: "pi_fixture123" },
      { object: "refund", id: "re_locator", charge: chargeId },
      { object: "dispute", id: "du_locator", charge: chargeId },
    ]) {
      const event = { data: { object } } as Stripe.Event;
      assert.equal(await sessionForEvent(f.stripe, event), sessionId);
    }
  });
}

test("PostgreSQL ledger integration (embedded PGlite)", async t => {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  try {
    await migratePglite(db, { migrationsFolder: "./drizzle" });
    // A repeated migration run must be safe.
    await migratePglite(db, { migrationsFolder: "./drizzle" });
    await exerciseLedger(t, db);
    await exerciseDelivery(t, db);
  } finally {
    await client.close();
  }
});

const postgresUrl = process.env.INKZ_LEDGER_TEST_DATABASE_URL;
test("PostgreSQL ledger integration (pooled server / CI)", { skip: !postgresUrl }, async t => {
  assert.ok(postgresUrl);
  // The suite truncates its tables. Never accept a remote/production URL here.
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(postgresUrl).hostname));
  const connection = createLedgerDatabase(postgresUrl);
  try {
    await migratePostgres(connection.db, { migrationsFolder: "./drizzle" });
    await exerciseLedger(t, connection.db);
    await exerciseDelivery(t, connection.db);
  } finally {
    await connection.close();
  }
});
