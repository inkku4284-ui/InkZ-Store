import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../src/lib/ledger/schema";
import { createDelivery } from "../../src/lib/delivery/service";
import { createReviews } from "../../src/lib/reviews/service";
import { readOrderSnapshot } from "../../src/lib/ledger/snapshot";
import { newToken } from "../../src/lib/delivery/security";
import { reviews } from "../../src/lib/reviews/schema";
import { sql } from "drizzle-orm";
import { stripeFixture, ledgerSettings, sessionId, chargeId, created } from "./ledger-fixtures";

const input = { rating: 5, displayName: "Studio builder", body: "Easy to install and the combat feels responsive." };

test("verified reviews (real PostgreSQL engine, isolated Stripe transport)", async t => {
  const pg = new PGlite();
  try {
    for (const file of ["0000_commerce_ledger.sql", "0001_secure_delivery.sql", "0002_email_recovery.sql", "0004_verified_reviews.sql"]) {
      await pg.exec(await readFile(`drizzle/${file}`, "utf8"));
    }
    const db = drizzle(pg, { schema });
    let fixture = stripeFixture();
    let now = new Date();
    const reader = (id: string, known?: Parameters<typeof readOrderSnapshot>[3]) => readOrderSnapshot(fixture.stripe, ledgerSettings, id, known);
    const service = createReviews(db, false, reader, () => now);
    const buyer = newToken(), stranger = newToken();
    const delivery = createDelivery(db, false, reader, () => now);
    const reset = async () => {
      await db.execute(sql`TRUNCATE commerce_reviews, commerce_delivery_grants, commerce_delivery_limits,
        commerce_entitlements, commerce_disputes, commerce_refunds, commerce_order_items, commerce_orders CASCADE`);
      fixture = stripeFixture(); now = new Date();
    };

    await t.test("paid buyer creates pending review; approval publishes only allowlisted fields", async () => {
      await reset();
      await delivery.bindCheckout(sessionId, buyer);
      assert.equal(await service.submit(sessionId, buyer, input), "submitted");
      assert.equal((await service.publicList("combat-framework")).total, 0);
      const [saved] = await db.select().from(reviews);
      assert.equal(saved.status, "pending");
      assert.equal(await service.moderate(saved.id, "approved", saved.revision), true);
      const published = await service.publicList("combat-framework");
      assert.equal(published.total, 1);
      assert.equal(published.average, 5);
      assert.deepEqual(Object.keys(published.reviews[0]).sort(), ["body", "createdAt", "displayName", "id", "rating", "verified"]);
      assert.equal(published.reviews[0].verified, true);
      const serialized = JSON.stringify(published);
      for (const secret of [sessionId, chargeId, "test-buyer@example.invalid", buyer, saved.orderItemId]) assert.ok(!serialized.includes(secret));
      assert.equal((await service.ownerList("approved"))[0].revision, 1);
      assert.equal((await service.publicList("unknown")).total, 0);
    });

    await t.test("copied order URL, malformed credentials, expired grant and pending payment fail closed", async () => {
      await reset();
      assert.equal(await service.submit(sessionId, buyer, input), "unverified");
      await delivery.bindCheckout(sessionId, buyer);
      assert.equal(await service.submit(sessionId, stranger, input), "unverified");
      assert.equal(await service.submit(sessionId.replace("cs_test_", "cs_live_"), buyer, input), "unverified");
      assert.equal(fixture.calls.length, 0);
      fixture.session.payment_status = "unpaid"; fixture.payment.status = "processing"; fixture.payment.latest_charge = null;
      assert.equal(await service.submit(sessionId, buyer, input), "unverified");
      now = new Date(now.getTime() + 31 * 24 * 60 * 60_000);
      assert.equal(await service.submit(sessionId, buyer, input), "unverified");
      assert.equal((await db.select().from(reviews)).length, 0);
    });

    await t.test("parallel submissions preserve one review, edits require moderation and stale approvals fail", async () => {
      await reset(); await delivery.bindCheckout(sessionId, buyer);
      assert.deepEqual(await Promise.all([service.submit(sessionId, buyer, input), service.submit(sessionId, buyer, input)]), ["submitted", "submitted"]);
      const rows = await db.select().from(reviews); assert.equal(rows.length, 1);
      const saved = rows[0]; assert.equal(saved.revision, 2);
      assert.equal(await service.moderate(saved.id, "approved", 2), true);
      assert.equal(await service.submit(sessionId, buyer, { ...input, rating: 4 }), "submitted");
      assert.equal((await service.publicList("combat-framework")).total, 0);
      assert.equal(await service.moderate(saved.id, "approved", 2), false, "old review text must not approve a new edit");
      assert.equal(await service.moderate(saved.id, "approved", 3), true);
      assert.equal((await service.publicList("combat-framework")).average, 4);
      assert.equal(await service.submit(sessionId, buyer, input), "limited");
    });

    await t.test("refund blocks further edits and hides previously approved review once reconciled", async () => {
      await reset(); await delivery.bindCheckout(sessionId, buyer);
      assert.equal(await service.submit(sessionId, buyer, input), "submitted");
      const [saved] = await db.select().from(reviews);
      await service.moderate(saved.id, "approved", 1);
      fixture.charge.amount_refunded = 34900;
      fixture.refunds.push({ id: "re_reviewsFull", charge: chargeId, currency: "thb", amount: 34900, status: "succeeded", created });
      assert.equal(await service.submit(sessionId, buyer, input), "unverified");
      assert.equal((await service.publicList("combat-framework")).total, 0);
      assert.equal((await service.publicList("combat-framework")).average, null);
    });

    await t.test("outage rolls back a review; malformed input is never persisted", async () => {
      await reset(); await delivery.bindCheckout(sessionId, buyer);
      assert.equal(await service.submit(sessionId, buyer, { ...input, rating: 9 }), "invalid");
      fixture.fail();
      await assert.rejects(service.submit(sessionId, buyer, input));
      assert.equal((await db.select().from(reviews)).length, 0);
    });
  } finally { await pg.close(); }
});
