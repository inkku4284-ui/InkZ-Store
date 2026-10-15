import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { sandboxConfig, COMBAT_PRICE, COMBAT_PRODUCT, INTEGRATION } from "../../src/lib/stripe/config";
import { assertPrice, checkoutRequestAllowed, createCheckout, processEvent, readBody, SandboxMemory } from "../../src/lib/stripe/core";

const env = { INKZ_STRIPE_SANDBOX: "true", STRIPE_SECRET_KEY: "sk_test_synthetic_fixture", STRIPE_WEBHOOK_SECRET: "whsec_synthetic_fixture", STRIPE_COMBAT_PRICE_ID: COMBAT_PRICE, STRIPE_SANDBOX_ORIGIN: "http://localhost:3000" };
const config = sandboxConfig(env)!;
const price = { id: COMBAT_PRICE, active: true, livemode: false, type: "one_time", currency: "thb", unit_amount: 9900, billing_scheme: "per_unit", product: { id: COMBAT_PRODUCT, active: true, livemode: false } } as Stripe.Price;
const session = { id: "cs_test_fixture", metadata: { integration: INTEGRATION }, mode: "payment", livemode: false, currency: "thb", amount_total: 9900, payment_status: "paid", status: "complete" } as unknown as Stripe.Checkout.Session;
function event(type = "checkout.session.completed", changes: Partial<Stripe.Checkout.Session> = {}, id = "evt_fixture") {
  return { id, type, livemode: false, data: { object: { ...session, ...changes } } } as Stripe.Event;
}
function mockStripe(options: { price?: Stripe.Price; lines?: object; created?: object } = {}) {
  const calls: unknown[][] = [];
  const stripe = {
    prices: { retrieve: async (...args: unknown[]) => { calls.push(args); return options.price ?? price; } },
    checkout: { sessions: {
      create: async (...args: unknown[]) => { calls.push(args); return options.created ?? { livemode: false, mode: "payment", url: "https://checkout.stripe.com/c/pay/cs_test_fixture" }; },
      listLineItems: async () => options.lines ?? { has_more: false, data: [{ quantity: 1, price }] },
    } },
  } as unknown as Stripe;
  return { stripe, calls };
}

test("Sandbox defaults closed and permits explicitly configured local tests", () => {
  assert.equal(sandboxConfig({}), null);
  assert.ok(sandboxConfig(env));
});
for (const [name, change] of Object.entries({
  disabled: { INKZ_STRIPE_SANDBOX: "false" }, liveKey: { STRIPE_SECRET_KEY: "sk_live_synthetic" },
  missingKey: { STRIPE_SECRET_KEY: "" }, missingWebhook: { STRIPE_WEBHOOK_SECRET: "" }, wrongPrice: { STRIPE_COMBAT_PRICE_ID: "price_other" },
  production: { VERCEL_ENV: "production" }, insecureRemote: { STRIPE_SANDBOX_ORIGIN: "http://example.com" },
  credentials: { STRIPE_SANDBOX_ORIGIN: "https://user:pass@example.com" }, path: { STRIPE_SANDBOX_ORIGIN: "https://example.com/redirect" },
  localOnVercel: { VERCEL: "1" },
})) test(`configuration rejects ${name}`, () => assert.equal(sandboxConfig({ ...env, ...change }), null));

test("HTTPS preview origin permitted", () => assert.ok(sandboxConfig({ ...env, VERCEL: "1", VERCEL_ENV: "preview", STRIPE_SANDBOX_ORIGIN: "https://test.example.com" })));
for (const [name, change] of Object.entries({ amount: { unit_amount: 99 }, currency: { currency: "usd" }, live: { livemode: true }, inactive: { active: false }, recurring: { type: "recurring" }, product: { product: { id: "prod_other", active: true, livemode: false } }, unexpanded: { product: COMBAT_PRODUCT }, liveProduct: { product: { id: COMBAT_PRODUCT, active: true, livemode: true } } })) {
  test(`Price rejects ${name}`, () => assert.throws(() => assertPrice({ ...price, ...change } as Stripe.Price)));
}
test("Checkout verifies Price before creating a server-priced payment with fixed returns and idempotency", async () => {
  const { stripe, calls } = mockStripe();
  assert.match(await createCheckout(stripe, config, "fixture"), /^https:\/\/checkout.stripe.com/);
  assert.deepEqual(calls[0], [COMBAT_PRICE, { expand: ["product"] }]);
  assert.deepEqual(calls[1], [{ mode: "payment", allowed_payment_method_types: ["card"], adaptive_pricing: { enabled: false }, automatic_tax: { enabled: false }, allow_promotion_codes: false, line_items: [{ price: COMBAT_PRICE, quantity: 1 }], metadata: { integration: INTEGRATION }, success_url: "http://localhost:3000/sandbox/checkout/success", cancel_url: "http://localhost:3000/sandbox/checkout/cancel" }, { idempotencyKey: "inkz-sandbox-fixture" }]);
});
test("invalid Price never creates Checkout", async () => {
  const { stripe, calls } = mockStripe({ price: { ...price, livemode: true } });
  await assert.rejects(createCheckout(stripe, config, "fixture")); assert.equal(calls.length, 1);
});
for (const created of [{ livemode: true, mode: "payment", url: "https://checkout.stripe.com/c/pay/test" }, { livemode: false, mode: "payment", url: "https://evil.example/" }]) test("rejects unsafe created Session", async () => {
  await assert.rejects(createCheckout(mockStripe({ created }).stripe, config, "fixture"));
});
const headers = { origin: config.origin, "idempotency-key": "8ed1cf0d-ef2d-4a3f-8bf2-902dc7e40868", "sec-fetch-site": "same-origin" };
test("Origin, request origin, fetch site, and idempotency checks fail closed", () => {
  const request = (url: string, change = {}) => new Request(url, { method: "POST", headers: { ...headers, ...change } });
  assert.ok(checkoutRequestAllowed(request(config.origin), config));
  assert.equal(checkoutRequestAllowed(request(config.origin, { origin: "https://evil.example" }), config), false);
  assert.equal(checkoutRequestAllowed(request("https://evil.example"), config), false);
  assert.equal(checkoutRequestAllowed(request(config.origin, { "sec-fetch-site": "cross-site" }), config), false);
  assert.equal(checkoutRequestAllowed(request(config.origin, { "idempotency-key": "invalid" }), config), false);
});
test("streaming body limits apply without content-length and reject client parameters", async () => {
  await assert.rejects(readBody(new Request(config.origin, { method: "POST", body: '{"price":"fake"}' }), 0));
  await assert.rejects(readBody(new Request(config.origin, { method: "POST", body: "too large" }), 3));
  assert.equal(await readBody(new Request(config.origin, { method: "POST" }), 0), "");
});
test("IP and global rate limits apply and recover after a minute", () => {
  const memory = new SandboxMemory();
  for (let i = 0; i < 5; i++) assert.ok(memory.allow("a", 1));
  assert.equal(memory.allow("a", 2), false);
  for (let i = 0; i < 15; i++) assert.ok(memory.allow(`forged-${i}`, 2));
  assert.equal(memory.allow("new-ip", 3), false);
  assert.ok(memory.allow("a", 60_002));
});
test("completed unpaid stays pending; async success confirms paid; paid cannot regress", async () => {
  const memory = new SandboxMemory(); const stripe = mockStripe().stripe;
  await processEvent(event("checkout.session.completed", { payment_status: "unpaid" }), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.state, "pending");
  await processEvent(event("checkout.session.async_payment_succeeded", {}, "evt_paid"), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.state, "paid");
  await processEvent(event("checkout.session.async_payment_failed", {}, "evt_stale"), stripe, memory);
  await processEvent(event("checkout.session.expired", {}, "evt_expired"), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.state, "paid"); assert.equal(memory.orders.get(session.id)?.transitions, 2);
});
test("duplicate and concurrent events create one transition", async () => {
  const memory = new SandboxMemory(); const stripe = mockStripe().stripe;
  await Promise.all([processEvent(event(), stripe, memory), processEvent(event(), stripe, memory)]);
  assert.deepEqual(await processEvent(event(), stripe, memory), { duplicate: true, changed: false });
  assert.equal(memory.orders.get(session.id)?.transitions, 1);
});
test("distinct paid event IDs for same Session do not repeat transitions", async () => {
  const memory = new SandboxMemory(); const stripe = mockStripe().stripe;
  await processEvent(event(), stripe, memory);
  await processEvent(event("checkout.session.async_payment_succeeded", {}, "evt_other"), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.transitions, 1);
});
test("failure and expiry recorded; late confirmed payment may supersede failure", async () => {
  const memory = new SandboxMemory(); const stripe = mockStripe().stripe;
  await processEvent(event("checkout.session.async_payment_failed"), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.state, "failed");
  await processEvent(event("checkout.session.completed", {}, "evt_later"), stripe, memory);
  assert.equal(memory.orders.get(session.id)?.state, "paid");
});
test("unconfirmed async success is rejected and remains retryable", async () => {
  const memory = new SandboxMemory();
  await assert.rejects(processEvent(event("checkout.session.async_payment_succeeded", { payment_status: "unpaid" }), mockStripe().stripe, memory));
  assert.equal(memory.events.size, 0); assert.equal(memory.orders.size, 0);
});
for (const changes of [{ amount_total: 1 }, { currency: "usd" }, { livemode: true }, { mode: "subscription" }]) test("rejects unexpected signed Session values", async () => {
  const memory = new SandboxMemory();
  await assert.rejects(processEvent(event("checkout.session.completed", changes as Partial<Stripe.Checkout.Session>), mockStripe().stripe, memory));
  assert.equal(memory.orders.size, 0);
});
test("wrong, multiple, or extra-page line items cannot mark paid", async () => {
  for (const lines of [{ data: [], has_more: false }, { data: [{ quantity: 2, price }], has_more: false }, { data: [{ quantity: 1, price }], has_more: true }, { data: [{ quantity: 1, price: { ...price, id: "price_other" } }], has_more: false }]) {
    const memory = new SandboxMemory(); await assert.rejects(processEvent(event(), mockStripe({ lines }).stripe, memory)); assert.equal(memory.orders.size, 0);
  }
});
test("foreign events ignored and live events rejected", async () => {
  const memory = new SandboxMemory(); const stripe = mockStripe().stripe;
  assert.deepEqual(await processEvent(event("checkout.session.completed", { metadata: {} }), stripe, memory), { ignored: true });
  assert.deepEqual(await processEvent(event("payment_intent.succeeded"), stripe, memory), { ignored: true });
  await assert.rejects(processEvent({ ...event(), livemode: true }, stripe, memory));
});
test("volatile dedup records expire and capacity fails closed", () => {
  const memory = new SandboxMemory(); memory.record("old", "session", "paid");
  memory.prune(Date.now() + 86_400_001); assert.equal(memory.events.size, 0); assert.equal(memory.orders.size, 0);
  for (let i = 0; i < 10_000; i++) memory.events.set(String(i), Date.now());
  assert.throws(() => memory.record("new", "session", "paid"));
});
