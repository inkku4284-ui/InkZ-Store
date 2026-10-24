import assert from "node:assert/strict";
import { test } from "node:test";
import { publicAnalyticsEvent } from "../../src/lib/analytics/privacy";

test("analytics skips URLs that could leak capabilities in the browser Referer header", () => {
  assert.equal(publicAnalyticsEvent({ type: "pageview", url: "https://store.example/products/combat-framework?email=private%40example.invalid#token=private" }), null);
  assert.deepEqual(publicAnalyticsEvent({ type: "pageview", url: "https://store.example/products/combat-framework" }),
    { type: "pageview", url: "https://store.example/products/combat-framework" });
});

test("a private or identifying document referrer suppresses analytics rather than forwarding it", () => {
  const event = { type: "pageview" as const, url: "https://store.example/" };
  for (const referrer of ["https://store.example/download?session_id=private", "https://store.example/recover", "https://store.example/admin", "https://external.example/person/private", "https://external.example/?email=private", "bad-url"]) {
    assert.equal(publicAnalyticsEvent(event, { referrer }), null);
  }
  assert.deepEqual(publicAnalyticsEvent(event, { referrer: "https://external.example/" }), event);
  assert.deepEqual(publicAnalyticsEvent(event, { referrer: "https://store.example/products" }), event);
});

test("analytics refuses sensitive and unknown paths and every custom event", () => {
  for (const path of ["/download?session_id=private", "/recover#token=private", "/admin", "/admin/login", "/api/reviews", "/products/unknown", "/customer/private"]) {
    assert.equal(publicAnalyticsEvent({ type: "pageview", url: `https://store.example${path}` }), null);
  }
  assert.equal(publicAnalyticsEvent({ type: "event", url: "https://store.example/" }), null);
  assert.equal(publicAnalyticsEvent({ type: "pageview", url: "https://user:password@store.example/" }), null);
  assert.equal(publicAnalyticsEvent({ type: "pageview", url: "not-a-url" }), null);
});

test("privacy opt outs stop collection even on public pages", () => {
  const event = { type: "pageview" as const, url: "https://store.example/" };
  assert.equal(publicAnalyticsEvent(event, { doNotTrack: "1" }), null);
  assert.equal(publicAnalyticsEvent(event, { doNotTrack: "yes" }), null);
  assert.equal(publicAnalyticsEvent(event, { globalPrivacyControl: true }), null);
  assert.deepEqual(publicAnalyticsEvent(event, { doNotTrack: "0", globalPrivacyControl: false }), event);
});
