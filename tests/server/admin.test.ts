import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as ledgerSchema from "../../src/lib/ledger/schema";
import { adminConfig } from "../../src/lib/admin/config";
import { createOwnerStore } from "../../src/lib/admin/store";
import { createAdminAuthHandlers } from "../../src/lib/admin/handlers";
import { adminCookie, adminCookieName, readAdminCookie, adminDigest, adminToken } from "../../src/lib/admin/security";
import { salesMetrics } from "../../src/lib/admin/metrics";
import { githubOwnerId } from "../../src/lib/admin/github";

const env = { INKZ_ADMIN: "test", INKZ_ORDER_LEDGER: "test", VERCEL_ENV: "preview", STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_COMBAT_PRICE_ID: "price_fixture", DATABASE_URL: "postgresql://test:test@localhost/inkz_test",
  STORE_ORIGIN: "https://store.example", GITHUB_CLIENT_ID: "Iv1.fixture", GITHUB_CLIENT_SECRET: "fixture_private_secret", INKZ_OWNER_GITHUB_IDS: "1234" };

test("admin requires explicit matching mode, verified database, canonical origin and numeric owner IDs", () => {
  assert.ok(adminConfig(env));
  for (const broken of [{ INKZ_ADMIN: undefined }, { INKZ_ADMIN: "live" }, { INKZ_ORDER_LEDGER: "off" }, { VERCEL_ENV: "production" },
    { STORE_ORIGIN: "https://store.example/elsewhere" }, { GITHUB_CLIENT_SECRET: "" }, { INKZ_OWNER_GITHUB_IDS: "inkku4284" },
    { INKZ_OWNER_GITHUB_IDS: "1234,1234" }, { DATABASE_URL: "postgresql://test:test@remote.example/db?sslmode=require" }]) {
    assert.equal(adminConfig({ ...env, ...broken }), null);
  }
  assert.ok(adminConfig({ ...env, INKZ_ADMIN: "live", INKZ_ORDER_LEDGER: "live", VERCEL_ENV: "production", STRIPE_SECRET_KEY: "sk_live_fixture",
    DATABASE_URL: "postgresql://user:password@remote.example/inkz?sslmode=verify-full" }));
});

test("admin credentials are opaque, host-only and reject duplicate cookies", () => {
  const token = adminToken();
  assert.equal(token.length, 43);
  const cookie = adminCookie("session", token, env.STORE_ORIGIN, 60);
  assert.match(cookie, /^__Host-inkz_admin=/);
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=60; Secure$/);
  assert.ok(!cookie.includes("Domain="));
  assert.equal(readAdminCookie(cookie, "session", env.STORE_ORIGIN), token);
  assert.equal(readAdminCookie(`${cookie}; ${adminCookieName("session", env.STORE_ORIGIN)}=${token}`, "session", env.STORE_ORIGIN), null);
  assert.equal(readAdminCookie("__Host-inkz_admin=bad", "session", env.STORE_ORIGIN), null);
  assert.notEqual(adminDigest(token), token);
});

test("owner authentication persists only hashes, consumes OAuth state once and revokes sessions", async t => {
  const client = new PGlite();
  const db = drizzle(client, { schema: ledgerSchema });
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    // Supports running this isolated test before the root registers the journal entry.
    await client.exec(await readFile("drizzle/0003_owner_admin.sql", "utf8"));
    const config = adminConfig(env); assert.ok(config);
    const store = createOwnerStore(db);
    const context = { config, store };
    let identity = "1234";
    let exchanges = 0;
    const handlers = createAdminAuthHandlers(() => context, async (_config, code, verifier) => {
      exchanges++;
      assert.equal(code, "fixture-code"); assert.equal(verifier.length, 43);
      return identity;
    });
    const start = () => handlers.login(new Request(`${env.STORE_ORIGIN}/api/admin/auth/login`, { method: "POST", headers: { origin: env.STORE_ORIGIN } }));
    const callback = (location: string, cookie: string, state?: string) => handlers.callback(new Request(`${env.STORE_ORIGIN}/api/admin/auth/callback?code=fixture-code&state=${state ?? new URL(location).searchParams.get("state")}`, { headers: { cookie } }));

    await t.test("cross-origin and alias login cannot create authentication state", async () => {
      assert.equal((await handlers.login(new Request("https://alias.example/api/admin/auth/login", { method: "POST", headers: { origin: "https://alias.example" } }))).status, 403);
      assert.equal((await handlers.login(new Request(`${env.STORE_ORIGIN}/api/admin/auth/login`, { method: "POST", headers: { origin: "https://evil.example" } }))).status, 403);
      assert.equal((await db.execute(sql`SELECT * FROM commerce_admin_oauth`)).rows.length, 0);
    });

    await t.test("successful owner flow uses PKCE and one-use state; no provider token is retained", async () => {
      const response = await start(); assert.equal(response.status, 303);
      const location = response.headers.get("location")!; const cookie = response.headers.get("set-cookie")!;
      const authorize = new URL(location);
      assert.equal(authorize.origin, "https://github.com");
      assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
      assert.equal(authorize.searchParams.get("scope"), "");
      const stored = (await db.execute(sql`SELECT * FROM commerce_admin_oauth`)).rows;
      assert.equal(stored.length, 1);
      assert.ok(!JSON.stringify(stored).includes(authorize.searchParams.get("state")!));
      assert.equal((await callback(location, cookie, adminToken())).status, 403);
      assert.equal(exchanges, 0, "mismatched state never reaches GitHub");
      const accepted = await callback(location, cookie); assert.equal(accepted.status, 303);
      assert.equal(accepted.headers.get("location"), `${env.STORE_ORIGIN}/admin`);
      const cookies = accepted.headers.getSetCookie();
      const sessionCookie = cookies.find(value => value.startsWith("__Host-inkz_admin="))!;
      const token = readAdminCookie(sessionCookie, "session", config.origin); assert.ok(token);
      assert.equal((await store.session(token, false, config.ownerIds))?.ownerId, "1234");
      assert.equal(await store.session(token, true, config.ownerIds), null);
      assert.equal(await store.session(token, false, ["9999"]), null, "removing owner config immediately revokes access");
      assert.equal((await callback(location, cookie)).status, 403);
      assert.equal(exchanges, 1);
      assert.ok(!JSON.stringify((await db.execute(sql`SELECT * FROM commerce_admin_sessions`)).rows).includes(token));
      const forbidden = await handlers.logout(new Request(`${env.STORE_ORIGIN}/api/admin/auth/logout`, { method: "POST", headers: { cookie: sessionCookie, origin: "https://evil.example" } }));
      assert.equal(forbidden.status, 403);
      const logout = await handlers.logout(new Request(`${env.STORE_ORIGIN}/api/admin/auth/logout`, { method: "POST", headers: { cookie: sessionCookie, origin: env.STORE_ORIGIN } }));
      assert.equal(logout.status, 303);
      assert.equal(await store.session(token, false, config.ownerIds), null);
    });

    await t.test("nonowners and expired state/session never gain owner access", async () => {
      identity = "9999";
      const response = await start();
      assert.equal((await callback(response.headers.get("location")!, response.headers.get("set-cookie")!)).status, 403);
      assert.equal((await db.execute(sql`SELECT * FROM commerce_admin_sessions`)).rows.length, 0);
      const expired = await start();
      await db.execute(sql`UPDATE commerce_admin_oauth SET expires_at = now() - interval '1 minute'`);
      assert.equal((await callback(expired.headers.get("location")!, expired.headers.get("set-cookie")!)).status, 403);
      const token = adminToken(); await store.createSession(token, false, "1234", new Date(Date.now() - 1000));
      assert.equal(await store.session(token, false, ["1234"]), null);
    });

    await t.test("a copied state with another browser proof, concurrent callback, and failed provider cannot bypass authorization", async () => {
      identity = "1234";
      const response = await start(); const location = response.headers.get("location")!;
      const state = new URL(location).searchParams.get("state")!;
      const copiedCookie = adminCookie("oauth", `${state}.${adminToken()}`, config.origin, 300);
      assert.equal((await callback(location, copiedCookie)).status, 403);
      const before = exchanges;
      const responses = await Promise.all([callback(location, response.headers.get("set-cookie")!), callback(location, response.headers.get("set-cookie")!)]);
      assert.deepEqual(responses.map(value => value.status).sort(), [303, 403]);
      assert.equal(exchanges, before + 1);
      const failed = createAdminAuthHandlers(() => context, async () => { throw new Error("sensitive provider details"); });
      const next = await start(); const nextState = new URL(next.headers.get("location")!).searchParams.get("state");
      const denied = await failed.callback(new Request(`${config.origin}/api/admin/auth/callback?code=fixture-code&state=${nextState}`, { headers: { cookie: next.headers.get("set-cookie")! } }));
      assert.equal(denied.status, 503);
      assert.doesNotMatch(await denied.text(), /sensitive|provider details/);
      assert.equal((await callback(next.headers.get("location")!, next.headers.get("set-cookie")!)).status, 403, "failed exchanges consume state, requiring a fresh login");
    });

    await t.test("missing configuration and provider errors fail closed with private responses", async () => {
      const disabled = createAdminAuthHandlers(() => null);
      const response = await disabled.login(new Request(`${env.STORE_ORIGIN}/api/admin/auth/login`, { method: "POST" }));
      assert.equal(response.status, 503);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      const denied = await disabled.callback(new Request(`${env.STORE_ORIGIN}/api/admin/auth/callback?code=private-value&state=private-state`));
      assert.equal(denied.status, 503);
      assert.doesNotMatch(await denied.text(), /private-value|private-state|secret/);
    });

    await t.test("shared login limits reset after expiry and retain only one row per mode", async () => {
      await db.execute(sql`TRUNCATE commerce_delivery_limits`);
      for (let i = 0; i < 20; i++) assert.equal(await store.loginAllowed(false), true);
      assert.equal(await store.loginAllowed(false), false);
      assert.equal(await store.loginAllowed(true), true, "live and sandbox login limits are independent");
      await db.execute(sql`UPDATE commerce_delivery_limits SET expires_at = now() - interval '1 minute'`);
      assert.equal(await store.loginAllowed(false), true);
      assert.equal((await db.execute(sql`SELECT * FROM commerce_delivery_limits`)).rows.length, 2);
    });
  } finally { await client.close(); }
});

test("GitHub adapter sends PKCE to fixed HTTPS endpoints and revalidates the numeric identity every login", async () => {
  const config = adminConfig(env); assert.ok(config);
  let calls = 0;
  const transport: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    if (calls % 2 === 1) {
      assert.equal(input, "https://github.com/login/oauth/access_token");
      const body = init?.body as URLSearchParams;
      assert.equal(body.get("redirect_uri"), `${config.origin}/api/admin/auth/callback`);
      assert.equal(body.get("code_verifier"), "fixture-verifier");
      assert.equal(body.get("client_secret"), config.clientSecret);
      return Response.json({ access_token: "provider-bearer-value", token_type: "bearer" });
    }
    assert.equal(input, "https://api.github.com/user");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer provider-bearer-value");
    return Response.json({ id: 1234, email: "private@example.invalid", login: "untrusted-display-name" });
  };
  assert.equal(await githubOwnerId(config, "fixture-code", "fixture-verifier", transport), "1234");
  assert.equal(await githubOwnerId(config, "fixture-code", "fixture-verifier", transport), "1234");
  assert.equal(calls, 4);
  assert.equal(await githubOwnerId(config, "x", "x", async () => Response.json({ error: "bad_verification_code" })), null);
  let step = 0;
  assert.equal(await githubOwnerId(config, "x", "x", async () => Response.json(++step === 1 ? { access_token: "x", token_type: "bearer" } : { id: "1234" })), null);
});

test("sales SQL counts real captures/refunds once, isolates modes, uses UTC paid-date cohorts and excludes failed payments", async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema: ledgerSchema });
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    const makeOrder = async (sessionId: string, captured: number, paidAt: Date | null, live = false, refunded = 0) => {
      const [order] = await db.insert(ledgerSchema.orders).values({ sessionId, live, currency: "thb", subtotal: captured || 34900, discount: 0,
        total: captured || 34900, captured, refunded, paymentState: paidAt ? "paid" : "failed", createdAt: new Date("2026-10-01T01:00:00Z"), paidAt }).returning();
      await db.insert(ledgerSchema.orderItems).values({ orderId: order.id, product: "combat-framework", version: "1.0", priceId: `price_${sessionId}`, unitAmount: captured || 34900, quantity: 1 });
      return order.id;
    };
    const first = await makeOrder("cs_test_one", 34900, new Date("2026-10-02T23:59:00Z"), false, 1000);
    await makeOrder("cs_test_two", 29900, new Date("2026-10-03T00:01:00Z"));
    await makeOrder("cs_test_failed", 0, null);
    await makeOrder("cs_live_other", 34900, new Date("2026-10-03T00:01:00Z"), true);
    await db.insert(ledgerSchema.refunds).values([{ id: "re_success", orderId: first, amount: 900, status: "succeeded", createdAt: new Date("2026-10-06") },
      { id: "re_success_two", orderId: first, amount: 100, status: "succeeded", createdAt: new Date("2026-10-07") },
      { id: "re_pending", orderId: first, amount: 500, status: "pending", createdAt: new Date("2026-10-06") }]);
    await db.insert(ledgerSchema.disputes).values({ id: "du_lost", orderId: first, amount: 34900, status: "lost", createdAt: new Date("2026-10-04") });
    const range = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-05T00:00:00Z"), interval: "day" as const };
    const metrics = await salesMetrics(db, false, range);
    assert.equal(metrics.totals.orders, 2);
    assert.equal(metrics.totals.grossMinor, 64800);
    assert.equal(metrics.totals.refundedMinor, 1000);
    assert.equal(metrics.totals.netMinor, 63800);
    assert.equal(metrics.totals.disputedMinor, 34900);
    assert.deepEqual(metrics.products.map(p => [p.product, p.sales]), [["combat-framework", 2]]);
    assert.deepEqual(metrics.trend.map(point => [point.period, point.sales]), [["2026-10-02", 1], ["2026-10-03", 1]]);
    for (const interval of ["week", "month"] as const) {
      const grouped = await salesMetrics(db, false, { ...range, interval });
      assert.equal(grouped.trend.length, 1);
      assert.equal(grouped.trend[0].sales, 2);
      assert.equal(grouped.trend[0].grossMinor, 64800);
      assert.equal(grouped.trend[0].refundedMinor, 1000);
    }
    assert.doesNotMatch(JSON.stringify(metrics), /cs_test|cs_live|re_success|price_|receipt_email/);
    assert.equal((await salesMetrics(db, false, { ...range, from: new Date("2026-11-01"), to: new Date("2026-11-05") })).totals.orders, 0);
    await assert.rejects(salesMetrics(db, false, { ...range, to: new Date("2025-01-01") }));
    await assert.rejects(salesMetrics(db, false, { ...range, interval: "unsafe" as "day" }));
  } finally { await client.close(); }
});
