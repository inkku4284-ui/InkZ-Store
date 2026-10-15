import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { POST as webhook } from "../../src/app/api/stripe/webhook/route";
import { POST as checkout } from "../../src/app/api/sandbox/checkout/route";
import { COMBAT_PRICE } from "../../src/lib/stripe/config";

const secret = "whsec_synthetic_fixture_only";
const stripe = new Stripe("sk_test_synthetic_fixture_only");
beforeEach(() => {
  process.env.INKZ_STRIPE_SANDBOX = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture_only";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_COMBAT_PRICE_ID = COMBAT_PRICE;
  process.env.STRIPE_SANDBOX_ORIGIN = "http://localhost:3000";
  delete process.env.VERCEL_ENV; delete process.env.VERCEL;
});
function signed(payload: string, signingSecret = secret, timestamp = Math.floor(Date.now() / 1000)) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret, timestamp });
}
const payload = JSON.stringify({ id: "evt_synthetic", object: "event", type: "payment_intent.created", livemode: false, data: { object: { id: "pi_synthetic" } } });
const request = (body: string, signature?: string) => new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", body, headers: signature ? { "stripe-signature": signature } : {} });

test("actual webhook route accepts valid raw-body signature for irrelevant test event", async () => {
  const response = await webhook(request(payload, signed(payload)));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { received: true, ignored: true });
});
test("actual webhook route rejects missing, wrong, modified, and stale signatures", async () => {
  for (const req of [request(payload), request(payload, signed(payload, "whsec_wrong")), request(payload + " ", signed(payload)), request(payload, signed(payload, secret, Math.floor(Date.now() / 1000) - 600))]) {
    assert.equal((await webhook(req)).status, 400);
  }
});
test("live event is rejected even with valid signature", async () => {
  const live = payload.replace('"livemode":false', '"livemode":true');
  assert.equal((await webhook(request(live, signed(live)))).status, 400);
});
test("webhook body is bounded without relying on content-length", async () => {
  const large = " ".repeat(128_001); assert.equal((await webhook(request(large, signed(large)))).status, 400);
});
test("disabled config and live keys close both actual endpoints", async () => {
  for (const key of ["", "sk_live_synthetic"]) {
    process.env.STRIPE_SECRET_KEY = key;
    assert.equal((await webhook(request(payload, signed(payload)))).status, 503);
    assert.equal((await checkout(new Request("http://localhost:3000/api/sandbox/checkout", { method: "POST" }))).status, 503);
  }
});
test("checkout rejects missing Origin, cross-origin requests, and client purchase values before Stripe", async () => {
  assert.equal((await checkout(new Request("http://localhost:3000/api/sandbox/checkout", { method: "POST" }))).status, 403);
  const headers = { origin: "https://evil.example", "idempotency-key": "8ed1cf0d-ef2d-4a3f-8bf2-902dc7e40868" };
  assert.equal((await checkout(new Request("http://localhost:3000/api/sandbox/checkout", { method: "POST", headers }))).status, 403);
  headers.origin = "http://localhost:3000";
  assert.equal((await checkout(new Request("http://localhost:3000/api/sandbox/checkout", { method: "POST", headers, body: '{"price":"fake","payment_status":"paid"}' }))).status, 400);
});
