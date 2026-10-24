import { test } from "node:test";
import assert from "node:assert/strict";
import { createModerationHandler } from "../../src/lib/reviews/moderation-http";

const origin = "https://store.example";
const id = "00000000-0000-4000-8000-000000000001";
const request = (body = `id=${id}&decision=approved&revision=2`, sent = origin) =>
  new Request(`${origin}/api/admin/reviews`, { method: "POST", headers: { origin: sent,
    "content-type": "application/x-www-form-urlencoded" }, body });

test("moderation denies anonymous/cross-origin requests before accessing review data", async () => {
  let mutations = 0;
  const handler = createModerationHandler({ owner: async () => null, service: () => ({ moderate: async () => { mutations++; return true; } }) });
  assert.equal((await handler(request())).status, 401);
  assert.equal((await handler(request(undefined, "https://evil.example"))).status, 403);
  assert.equal(mutations, 0);
});

test("moderation validates bounded unique fields and passes the observed revision atomically", async () => {
  const calls: unknown[][] = [];
  const handler = createModerationHandler({ owner: async () => ({ ownerId: "123" }),
    service: () => ({ moderate: async (...args) => { calls.push(args); return false; } }) });
  for (const body of [`id=${id}&decision=approved&revision=2&revision=3`, `id=${id}&decision=publish&revision=2`,
    `id=${id}&decision=approved&revision=0`, `id=${id}&decision=approved&revision=2&extra=1`, "x=".repeat(3000)]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal(calls.length, 0);
  const response = await handler(request());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${origin}/admin/reviews?result=stale`);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.deepEqual(calls, [[id, "approved", 2]]);
});

test("moderation provider failures remain private and retryable", async () => {
  const handler = createModerationHandler({ owner: async () => ({ ownerId: "123" }),
    service: () => ({ moderate: async () => { throw new Error("private-database-password"); } }) });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /password|database/);
});
