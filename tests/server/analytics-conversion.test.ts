import { test } from "node:test";
import assert from "node:assert/strict";
import { observedOrderRate } from "../../src/lib/analytics/conversion";

test("observed order rate never mixes Sandbox purchases with Production visitors", () => {
  assert.equal(observedOrderRate(false, 4, 100), null);
  assert.equal(observedOrderRate(true, 4, 100), 4);
  assert.equal(observedOrderRate(true, 0, 100), 0);
  assert.equal(observedOrderRate(true, 4, 0), null);
  for (const value of [-1, 0.5, NaN, Infinity]) assert.equal(observedOrderRate(true, value, 100), null);
});
