import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewsConfig } from "../../src/lib/reviews/config";
import { createReviewHandlers } from "../../src/lib/reviews/http";
import { browserCookie, newToken } from "../../src/lib/delivery/security";

const env = { INKZ_SALES: "test", INKZ_ORDER_LEDGER: "test", INKZ_SECURE_DELIVERY: "test", INKZ_REVIEWS: "test",
  STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_COMBAT_PRICE_ID: "price_fixture",
  COMBAT_FILE_KEY: Buffer.alloc(32, 3).toString("base64"), DATABASE_URL: "postgresql://test:test@localhost/inkz_test", STORE_ORIGIN: "https://store.example" };
const origin = env.STORE_ORIGIN;
const config = reviewsConfig(env)!;

test("review configuration is opt-in and never bypasses secure delivery guards", () => {
  assert.ok(config);
  for (const change of [{ INKZ_REVIEWS: undefined }, { INKZ_REVIEWS: "live" }, { INKZ_SECURE_DELIVERY: "off" },
    { INKZ_ORDER_LEDGER: "off" }, { VERCEL_ENV: "production" }]) assert.equal(reviewsConfig({ ...env, ...change }), null);
});

test("review POST requires same origin, exact bounded fields and a browser credential", async () => {
  let writes = 0;
  const handlers = createReviewHandlers({ config: () => config, service: () => ({ allow: async () => true,
    submit: async () => { writes++; return "submitted"; },
    publicList: async () => ({ reviews: [], average: null, total: 0, page: 1, hasMore: false }) }) });
  const fields = { session_id: "cs_test_example1234567890", rating: "5", display_name: "Studio builder",
    body: "Easy to install and the combat feels responsive.", website: "" };
  const request = (body = new URLSearchParams(fields).toString(), headers: Record<string, string> = {}) => new Request(`${origin}/api/reviews`, {
    method: "POST", body, headers: { origin, "content-type": "application/x-www-form-urlencoded", cookie: browserCookie(newToken(), origin), ...headers } });
  assert.equal((await handlers.submitReview(request())).status, 202);
  assert.equal(writes, 1);
  assert.equal((await handlers.submitReview(request(undefined, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await handlers.submitReview(request(undefined, { cookie: "" }))).status, 403);
  assert.equal((await handlers.submitReview(request(`${new URLSearchParams(fields)}&rating=1`))).status, 400);
  assert.equal((await handlers.submitReview(request(new URLSearchParams({ ...fields, website: "spam" }).toString()))).status, 400);
  assert.equal((await handlers.submitReview(request("x".repeat(32769)))).status, 400);
  assert.equal(writes, 1, "rejected inputs never reach purchase lookup");
});

test("review API limits and provider errors remain private; public pagination is bounded", async () => {
  const request = () => new Request(`${origin}/api/reviews`, { method: "POST", headers: { origin,
    "content-type": "application/x-www-form-urlencoded", cookie: browserCookie(newToken(), origin) },
    body: new URLSearchParams({ session_id: "cs_test_example1234567890", rating: "5", display_name: "Studio builder",
      body: "Easy to install and the combat feels responsive.", website: "" }) });
  let allowed = false, outage = false, outcome: "limited" | "submitted" = "submitted";
  let read = 0;
  const handlers = createReviewHandlers({ config: () => config, service: () => ({ allow: async () => allowed,
    submit: async () => { if (outage) throw new Error("sk_live_must_not_be_exposed"); return outcome; },
    publicList: async (_product, page) => { read++; return { reviews: [], average: null, total: 0, page: page ?? 1, hasMore: false }; } }) });
  assert.equal((await handlers.submitReview(request())).status, 429);
  allowed = true; outcome = "limited";
  assert.equal((await handlers.submitReview(request())).status, 429);
  outage = true;
  const failed = await handlers.submitReview(request());
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /sk_live|must_not|Error|stack/);
  assert.equal(failed.headers.get("cache-control"), "private, no-store");
  for (const query of ["page=101", "product=unknown", "page=1&page=2", "page=0", "page=1.5", "private=anything"]) {
    assert.ok((await handlers.listReviews(new Request(`${origin}/api/reviews?${query}`))).status >= 400);
  }
  assert.equal(read, 0);
  const listed = await handlers.listReviews(new Request(`${origin}/api/reviews?product=combat-framework&page=2`));
  assert.equal(listed.status, 200);
  assert.deepEqual(await listed.json(), { reviews: [], average: null, total: 0, page: 2, hasMore: false });
});
