import { test } from "node:test";
import assert from "node:assert/strict";
import { recoveryEmailConfig, sendRecoveryEmail } from "../../src/lib/delivery/recovery-email";
import { newToken } from "../../src/lib/delivery/security";

const env = { INKZ_SALES: "test", INKZ_ORDER_LEDGER: "test", INKZ_SECURE_DELIVERY: "test", INKZ_RECOVERY_EMAIL: "test",
  STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_COMBAT_PRICE_ID: "price_fixture",
  COMBAT_FILE_KEY: Buffer.alloc(32, 3).toString("base64"), DATABASE_URL: "postgresql://test:test@localhost/inkz_test",
  RESEND_API_KEY: "re_fixtureNotARealKey", INKZ_RECOVERY_TEST_EMAIL: "owner@example.invalid" };

test("email recovery requires explicit test configuration and a private test mailbox", async () => {
  const config = recoveryEmailConfig(env); assert.ok(config);
  assert.equal(config.testRecipient, "owner@example.invalid");
  for (const invalid of [{ RESEND_API_KEY: "" }, { INKZ_RECOVERY_TEST_EMAIL: "" }, { INKZ_RECOVERY_EMAIL: "live" }, { VERCEL_ENV: "production" }]) {
    assert.equal(recoveryEmailConfig({ ...env, ...invalid }), null);
  }
  const token = newToken();
  let calls = 0;
  const send = async (url: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.to, ["owner@example.invalid"]);
    assert.equal(body.from, "InkZ <onboarding@resend.dev>");
    assert.ok(body.text.includes(`https://store.example/recover#token=${token}`));
    assert.equal(body.html, undefined, "Authentication email is plain text without tracking markup");
    return Response.json({ id: "message-fixture" });
  };
  assert.equal(await sendRecoveryEmail(config, "owner@example.invalid", "https://store.example", token, send), true);
  assert.equal(calls, 1);
  assert.equal(await sendRecoveryEmail(config, "other@example.invalid", "https://store.example", token, send), false);
  assert.equal(calls, 1, "the provider's test restriction is enforced before transmission");
  assert.equal(await sendRecoveryEmail(config, "owner@example.invalid", "https://user:password@store.example", token, send), false);
  assert.equal(calls, 1);
  assert.equal(await sendRecoveryEmail(config, "owner@example.invalid", "https://store.example", token,
    async () => Response.json({ message: "private provider error" }, { status: 403 })), false);
  assert.equal(await sendRecoveryEmail(config, "owner@example.invalid", "https://store.example", token,
    async () => { throw new Error("private network details"); }), false);
});
