import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { storeConfig, storeOrigin, COMBAT_SALE, type StoreConfig } from "../../src/lib/store/config";
import { assertPrice, orderFor } from "../../src/lib/store/stripe";
import { decryptPackage } from "../../src/lib/store/file";
import { RateLimit, checkoutRequestAllowed } from "../../src/lib/store/guard";
import { POST as checkout } from "../../src/app/api/checkout/route";
import { GET as download } from "../../src/app/api/download/route";

const KEY = randomBytes(32).toString("base64");
const PRICE = "price_TESTfixture123";
const base = { INKZ_SALES: "test", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_COMBAT_PRICE_ID: PRICE, COMBAT_FILE_KEY: KEY };

beforeEach(() => {
  for (const key of ["INKZ_SALES", "STRIPE_SECRET_KEY", "STRIPE_COMBAT_PRICE_ID", "COMBAT_FILE_KEY", "STORE_ORIGIN", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) delete process.env[key];
});

test("store is closed unless mode, key, price, origin and file key all agree", () => {
  assert.equal(storeConfig({}), null);
  assert.equal(storeConfig({ ...base, INKZ_SALES: undefined }), null);
  assert.equal(storeConfig({ ...base, STRIPE_SECRET_KEY: "sk_live_x" }), null, "test mode never takes a live key");
  assert.equal(storeConfig({ ...base, INKZ_SALES: "live" }), null, "live mode never takes a test key");
  assert.equal(storeConfig({ ...base, VERCEL_ENV: "production", VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "inkz-store.vercel.app" }), null, "test mode never runs on Production");
  assert.equal(storeConfig({ ...base, STRIPE_COMBAT_PRICE_ID: "prod_x" }), null);
  assert.equal(storeConfig({ ...base, COMBAT_FILE_KEY: "short" }), null);
  const config = storeConfig(base);
  assert.equal(config?.mode, "test");
  assert.equal(config?.origin, "http://localhost:3000");
  const live = storeConfig({ ...base, INKZ_SALES: "live", STRIPE_SECRET_KEY: "rk_live_fixture", VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "inkz-store.vercel.app" });
  assert.equal(live?.mode, "live");
  assert.equal(live?.origin, "https://inkz-store.vercel.app");
});

test("return-URL origin is https (or local http) and never has a path or credentials", () => {
  assert.equal(storeOrigin({ VERCEL: "1", VERCEL_BRANCH_URL: "inkz-store-git-x.vercel.app" }), "https://inkz-store-git-x.vercel.app");
  assert.equal(storeOrigin({ STORE_ORIGIN: "https://inkz.example/shop" }), null);
  assert.equal(storeOrigin({ STORE_ORIGIN: "http://inkz.example" }), null);
  assert.equal(storeOrigin({ STORE_ORIGIN: "https://user:pw@inkz.example" }), null);
  assert.equal(storeOrigin({ VERCEL: "1" }), null);
});

const config = storeConfig(base) as StoreConfig;
const price = (over: Partial<Stripe.Price> = {}) => ({ id: PRICE, livemode: false, active: true, type: "one_time", currency: COMBAT_SALE.currency, unit_amount: COMBAT_SALE.amount, billing_scheme: "per_unit", product: { id: "prod_x", active: true }, ...over }) as unknown as Stripe.Price;

test("only the advertised price can be sold", () => {
  assert.doesNotThrow(() => assertPrice(price(), config));
  for (const bad of [{ unit_amount: 100 }, { currency: "usd" }, { active: false }, { livemode: true }, { type: "recurring" }, { id: "price_other" }] as Partial<Stripe.Price>[]) {
    assert.throws(() => assertPrice(price(bad), config));
  }
  assert.throws(() => assertPrice(price({ product: { id: "prod_x", active: false } } as never), config));
});

const ID = "cs_test_a1B2c3D4e5F6g7H8i9J0";
function fakeStripe(session: object | Error) {
  return { checkout: { sessions: { retrieve: async () => { if (session instanceof Error) throw session; return session; } } } } as unknown as Stripe;
}
const paid = {
  id: ID, livemode: false, mode: "payment", status: "complete", payment_status: "paid", created: 1800000000,
  metadata: { product: COMBAT_SALE.slug }, customer_details: { email: "buyer@example.com" },
  line_items: { has_more: false, data: [{ quantity: 1, price: { id: PRICE } }] },
};

test("a download unlocks only for a complete, paid session of this product and price", async () => {
  assert.deepEqual(await orderFor(fakeStripe(paid), config, ID), { state: "paid", email: "buyer@example.com", created: 1800000000, mode: "test" });
  assert.equal((await orderFor(fakeStripe({ ...paid, payment_status: "unpaid" }), config, ID)).state, "pending");
  assert.equal((await orderFor(fakeStripe({ ...paid, status: "open", payment_status: "unpaid" }), config, ID)).state, "pending");
  assert.equal((await orderFor(fakeStripe({ ...paid, status: "expired", payment_status: "unpaid" }), config, ID)).state, "invalid");
  assert.equal((await orderFor(fakeStripe({ ...paid, metadata: {} }), config, ID)).state, "invalid");
  assert.equal((await orderFor(fakeStripe({ ...paid, livemode: true }), config, ID)).state, "invalid");
  assert.equal((await orderFor(fakeStripe({ ...paid, line_items: { has_more: false, data: [{ quantity: 1, price: { id: "price_other" } }] } }), config, ID)).state, "invalid");
  assert.equal((await orderFor(fakeStripe({ ...paid, line_items: { has_more: false, data: [{ quantity: 2, price: { id: PRICE } }] } }), config, ID)).state, "invalid");
  assert.equal((await orderFor(fakeStripe(new Error("No such session")), config, ID)).state, "invalid");
  for (const bad of ["", "cs_live_a1B2c3D4e5F6g7H8i9J0", "cs_test_<script>", "pi_123", "cs_test_" + "a".repeat(300)]) {
    assert.equal((await orderFor(fakeStripe(paid), config, bad)).state, "invalid", bad);
  }
});

test("the encrypted package round-trips and refuses a wrong key or tampering", () => {
  const key = randomBytes(32);
  const plain = Buffer.from("<roblox!fake rbxm bytes>");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  const file = Buffer.concat([iv, cipher.getAuthTag(), body]);
  assert.deepEqual(decryptPackage(file, key), plain);
  assert.throws(() => decryptPackage(file, randomBytes(32)));
  const tampered = Buffer.from(file);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptPackage(tampered, key));
});

test("checkout requests must come from the site with a fresh id", () => {
  const ok = { origin: "http://localhost:3000", "idempotency-key": "8ed1cf0d-ef2d-4a3f-8bf2-902dc7e40868" };
  assert.equal(checkoutRequestAllowed(new Request("http://localhost:3000/api/checkout", { method: "POST", headers: ok }), "http://localhost:3000"), true);
  assert.equal(checkoutRequestAllowed(new Request("http://localhost:3000/api/checkout", { method: "POST", headers: { ...ok, origin: "https://evil.example" } }), "http://localhost:3000"), false);
  assert.equal(checkoutRequestAllowed(new Request("http://localhost:3000/api/checkout", { method: "POST", headers: { ...ok, "idempotency-key": "nope" } }), "http://localhost:3000"), false);
  assert.equal(checkoutRequestAllowed(new Request("http://localhost:3000/api/checkout", { method: "POST", headers: { ...ok, "sec-fetch-site": "cross-site" } }), "http://localhost:3000"), false);
});

test("rate limits cap one client and everyone", () => {
  const limit = new RateLimit(2, 3);
  assert.equal(limit.allow("a", 0), true);
  assert.equal(limit.allow("a", 1), true);
  assert.equal(limit.allow("a", 2), false);
  assert.equal(limit.allow("b", 3), true);
  assert.equal(limit.allow("c", 4), false);
  assert.equal(limit.allow("c", 60_005), true);
});

test("routes are closed without configuration and reject bad checkout requests before Stripe", async () => {
  assert.equal((await checkout(new Request("http://localhost:3000/api/checkout", { method: "POST" }))).status, 503);
  assert.equal((await download(new Request(`http://localhost:3000/api/download?session_id=${ID}`))).status, 503);
  Object.assign(process.env, base);
  assert.equal((await checkout(new Request("http://localhost:3000/api/checkout", { method: "POST" }))).status, 403);
  const headers = { origin: "http://localhost:3000", "idempotency-key": "8ed1cf0d-ef2d-4a3f-8bf2-902dc7e40868" };
  assert.equal((await checkout(new Request("http://localhost:3000/api/checkout", { method: "POST", headers, body: '{"price":"price_x"}' }))).status, 400);
  assert.equal((await download(new Request("http://localhost:3000/api/download?session_id=bogus"))).status, 403);
});
