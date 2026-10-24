import { test } from "node:test";
import assert from "node:assert/strict";
import { ledgerConfig } from "../../src/lib/ledger/config";
import { handleWebhook, MAX_WEBHOOK_BYTES } from "../../src/lib/ledger/webhook";
import { POST } from "../../src/app/api/stripe/webhook/route";
import { eventBody, ledgerSettings, signedRequest } from "./ledger-fixtures";

test("ledger is opt-in, environment-separated, TLS-verified, and independent of product decryption", () => {
  const env = {
    INKZ_ORDER_LEDGER: "test", STRIPE_SECRET_KEY: ledgerSettings.key, STRIPE_WEBHOOK_SECRET: ledgerSettings.webhookSecret,
    DATABASE_URL: ledgerSettings.databaseUrl, STRIPE_COMBAT_PRICE_ID: ledgerSettings.price,
  };
  assert.equal(ledgerConfig({}), null);
  assert.equal(ledgerConfig({ ...env, INKZ_ORDER_LEDGER: "off" }), null);
  assert.equal(ledgerConfig({ ...env, VERCEL_ENV: "production" }), null);
  assert.equal(ledgerConfig({ ...env, INKZ_ORDER_LEDGER: "live", STRIPE_SECRET_KEY: "sk_live_fixture" }), null);
  assert.equal(ledgerConfig({ ...env, DATABASE_URL: "https://example.com/db" }), null);
  assert.equal(ledgerConfig({ ...env, DATABASE_URL: "postgresql://test:secret@example.com/db?sslmode=disable" }), null);
  assert.equal(ledgerConfig({ ...env, DATABASE_URL: "postgresql://test:secret@example.com/db?sslmode=require" }), null);
  assert.ok(ledgerConfig(env));
  assert.ok(ledgerConfig({ ...env, INKZ_ORDER_LEDGER: "live", STRIPE_SECRET_KEY: "rk_live_fixture", VERCEL_ENV: "production",
    DATABASE_URL: "postgresql://test:secret@example.com/db?sslmode=verify-full" }));
});

test("actual webhook route is closed without new configuration", async () => {
  assert.equal((await POST(signedRequest())).status, 503);
});

test("Stripe signatures reject forged, stale and altered raw bodies before processing", async () => {
  let calls = 0;
  const process = async () => { calls++; };
  const forged = signedRequest(eventBody(), undefined, "whsec_attacker");
  const stale = signedRequest(eventBody(), Math.floor(Date.now() / 1000) - 301);
  const original = signedRequest();
  const altered = new Request(original.url, { method: "POST", headers: original.headers, body: `${eventBody()} ` });
  for (const request of [forged, stale, altered, new Request(original.url, { method: "POST", body: eventBody() })]) {
    const response = await handleWebhook(request, ledgerSettings, process);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 0);
});

test("webhook acknowledges only after processing succeeds; failures remain retriable and private", async () => {
  let completed = false;
  const ok = await handleWebhook(signedRequest(), ledgerSettings, async () => { completed = true; });
  assert.equal(ok.status, 200);
  assert.equal(completed, true);
  const failed = await handleWebhook(signedRequest(), ledgerSettings, async () => { throw new Error("private-buyer-email secret-url"); });
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /private-buyer|secret-url/);
});

test("wrong payment mode and Connect events are rejected; unneeded event types are ignored", async () => {
  let calls = 0;
  const process = async () => { calls++; };
  for (const changes of [{ livemode: true }, { account: "acct_other" }]) {
    assert.equal((await handleWebhook(signedRequest(eventBody(undefined, changes)), ledgerSettings, process)).status, 400);
  }
  assert.equal((await handleWebhook(signedRequest(eventBody("customer.created")), ledgerSettings, process)).status, 200);
  assert.equal(calls, 0);
});

test("oversized bodies are bounded even without Content-Length", async () => {
  const request = signedRequest("x".repeat(MAX_WEBHOOK_BYTES + 1));
  const response = await handleWebhook(request, ledgerSettings, async () => { assert.fail("must not process oversized bodies"); });
  assert.equal(response.status, 413);
});
