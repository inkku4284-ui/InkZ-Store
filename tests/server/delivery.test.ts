import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { deliveryConfig, deliveryEnabled } from "../../src/lib/delivery/config";
import { browserCookie, browserToken, cookieName, digest, newToken, sameOrigin, smallForm } from "../../src/lib/delivery/security";
import { createCheckout } from "../../src/lib/store/stripe";
import { storeConfig } from "../../src/lib/store/config";
import { POST as checkout } from "../../src/app/api/checkout/route";
import { GET as download, HEAD as head } from "../../src/app/api/download/route";
import { POST as issue } from "../../src/app/api/delivery/ticket/route";

const env = { INKZ_SALES: "test", INKZ_ORDER_LEDGER: "test", INKZ_SECURE_DELIVERY: "test", STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_COMBAT_PRICE_ID: "price_fixture", COMBAT_FILE_KEY: Buffer.alloc(32, 3).toString("base64"),
  DATABASE_URL: "postgresql://test:test@localhost/inkz_test", STORE_ORIGIN: "https://store.example" };

test("secure delivery is opt-in and invalid enabled configuration never downgrades to Session-ID authorization", async () => {
  assert.equal(deliveryEnabled({}), false);
  assert.equal(deliveryEnabled({ INKZ_SECURE_DELIVERY: "off" }), false);
  assert.ok(deliveryConfig(env));
  for (const broken of [{ INKZ_ORDER_LEDGER: "off" }, { INKZ_SECURE_DELIVERY: "live" }, { DATABASE_URL: undefined }, { VERCEL_ENV: "production" }]) {
    assert.equal(deliveryConfig({ ...env, ...broken }), null);
  }
  const old = { ...process.env };
  try {
    Object.assign(process.env, env, { INKZ_SECURE_DELIVERY: "invalid" });
    assert.equal((await checkout(new Request("https://store.example/api/checkout", { method: "POST" }))).status, 503);
    assert.equal((await download(new Request("https://store.example/api/download?session_id=cs_test_example1234567890"))).status, 503);
    assert.equal((await issue(new Request("https://store.example/api/delivery/ticket", { method: "POST" }))).status, 503);
    assert.equal(head().status, 405);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
  }
});

test("buyer cookies are opaque, host-only, HttpOnly and secure; duplicate or malformed cookies are rejected", () => {
  const token = newToken();
  assert.equal(token.length, 43);
  assert.notEqual(token, newToken());
  const cookie = browserCookie(token, env.STORE_ORIGIN);
  assert.match(cookie, /^__Host-inkz_buyer=/);
  assert.match(cookie, /; HttpOnly; SameSite=Lax;/);
  assert.match(cookie, /; Secure$/);
  assert.ok(!cookie.includes("Domain="));
  assert.equal(browserToken(cookie, env.STORE_ORIGIN), token);
  assert.equal(browserToken(`${cookie}; __Host-inkz_buyer=${newToken()}`, env.STORE_ORIGIN), null);
  assert.equal(browserToken("__Host-inkz_buyer=bad", env.STORE_ORIGIN), null);
  assert.equal(browserToken(null, env.STORE_ORIGIN), null);
  assert.equal(cookieName("http://localhost:3000"), "inkz_buyer_local");
  assert.throws(() => browserCookie("bad", env.STORE_ORIGIN));
  assert.equal(digest(token).length, 64);
});

test("ticket POST requires same origin and bounded URL-encoded input even without Content-Length", async () => {
  const request = (origin: string, site?: string) => new Request("https://store.example/api/delivery/ticket", {
    method: "POST", headers: { origin, ...(site ? { "sec-fetch-site": site } : {}) },
  });
  assert.equal(sameOrigin(request("https://evil.example")), false);
  assert.equal(sameOrigin(request("https://store.example", "cross-site")), false);
  assert.equal(sameOrigin(request("https://store.example", "same-origin")), true);
  const form = (body: string, type = "application/x-www-form-urlencoded") => new Request("https://store.example", {
    method: "POST", headers: { "content-type": type }, body,
  });
  assert.equal(await smallForm(form("x".repeat(4097))), null);
  assert.equal(await smallForm(form("session_id=x", "application/json")), null);
  assert.equal((await smallForm(form("session_id=abc")))?.get("session_id"), "abc");
});

test("Checkout idempotency is scoped to the buyer and a failed binding cannot return a payment link", async () => {
  const config = storeConfig(env); assert.ok(config);
  const captured: string[] = [];
  let customText = "";
  const stripe = { prices: { retrieve: async () => ({ id: config.price, livemode: false, active: true, type: "one_time", currency: "thb", unit_amount: 34900, billing_scheme: "per_unit", product: { active: true } }) },
    checkout: { sessions: { create: async (body: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
      captured.push(options.idempotencyKey!);
      const submit = body.custom_text?.submit;
      assert.ok(submit && typeof submit === "object");
      customText = submit.message;
      assert.equal(body.success_url, "https://store.example/download?session_id={CHECKOUT_SESSION_ID}");
      assert.equal(Object.hasOwn(body, "payment_method_types"), false, "Dashboard still controls PromptPay and cards");
      return { id: "cs_test_deliveryFixture123456789", livemode: false, mode: "payment", url: "https://checkout.stripe.com/c/pay/test" };
    } } } } as unknown as Stripe;
  const hash = digest(newToken());
  let bound = "";
  const binding = { browserHash: hash, created: async (id: string) => { bound = id; } };
  assert.match(await createCheckout(stripe, config, "request-uuid", binding), /^https:\/\/checkout.stripe.com\//);
  assert.equal(bound, "cs_test_deliveryFixture123456789");
  await createCheckout(stripe, config, "request-uuid", binding);
  assert.equal(captured[0], captured[1]);
  await createCheckout(stripe, config, "request-uuid", { ...binding, browserHash: digest(newToken()) });
  assert.notEqual(captured[0], captured[2]);
  assert.match(customText, /this browser/);
  await assert.rejects(createCheckout(stripe, config, "request-uuid", { browserHash: hash, created: async () => { throw new Error("database unavailable"); } }));
});
