import Stripe from "stripe";
import type { LedgerConfig } from "../../src/lib/ledger/config";

export const ledgerSettings: LedgerConfig = {
  mode: "test", key: "sk_test_fixture", webhookSecret: "whsec_fixture123456789",
  databaseUrl: "postgresql://fixture:fixture@localhost/inkz_test", price: "price_fixture349",
};
export const sessionId = "cs_test_ledgerFixture1234567890";
export const chargeId = "ch_fixture123";
export const paymentId = "pi_fixture123";
export const created = 1_790_000_000;

/** Test-only Stripe HTTP transport. Production SDK verification/parsing still runs; no network or live credentials. */
export function stripeFixture() {
  const session = {
    id: sessionId, object: "checkout.session", livemode: false, mode: "payment", status: "complete", payment_status: "paid",
    created, metadata: { product: "combat-framework", version: "1.0" }, currency: "thb", amount_subtotal: 34900, amount_total: 34900,
    total_details: { amount_discount: 0, amount_tax: 0, amount_shipping: 0 },
    customer_details: { email: "test-buyer@example.invalid" }, payment_intent: paymentId,
    line_items: { object: "list", has_more: false, data: [{
      id: "li_fixture", object: "item", quantity: 1, currency: "thb", amount_subtotal: 34900,
      price: { id: ledgerSettings.price, object: "price", livemode: false, type: "one_time", unit_amount: 34900, currency: "thb" },
    }] },
  };
  const payment: Record<string, unknown> = {
    id: paymentId, object: "payment_intent", livemode: false, amount: 34900, currency: "thb",
    status: "succeeded", metadata: { product: "combat-framework" }, latest_charge: chargeId,
  };
  const charge = {
    id: chargeId, object: "charge", livemode: false, payment_intent: paymentId, amount: 34900, amount_captured: 34900,
    amount_refunded: 0, currency: "thb", paid: true, captured: true, disputed: false, created,
    balance_transaction: { id: "txn_fixture", object: "balance_transaction", source: chargeId, created: created + 60 },
  };
  const refunds: Record<string, unknown>[] = [];
  const disputes: Record<string, unknown>[] = [];
  const calls: string[] = [];
  let failure = false;
  const stripe = new Stripe(ledgerSettings.key, {
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(async (input, init) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (init?.method !== "GET") throw new Error("Tests must never modify Stripe resources.");
      if (failure) return new Response(JSON.stringify({ error: { message: "fixture outage", type: "api_error" } }), { status: 503 });
      let data: unknown;
      if (url.pathname === `/v1/checkout/sessions/${sessionId}`) data = session;
      else if (url.pathname === `/v1/payment_intents/${paymentId}`) data = payment;
      else if (url.pathname === `/v1/charges/${chargeId}`) data = charge;
      else if (url.pathname === "/v1/refunds") {
        // Exercise the SDK's real automatic pagination, not just the first ten refunds.
        const after = url.searchParams.get("starting_after");
        const start = after ? refunds.findIndex(r => r.id === after) + 1 : 0;
        const page = refunds.slice(start, start + 2);
        data = { object: "list", url: "/v1/refunds", has_more: start + 2 < refunds.length, data: page };
      } else if (url.pathname === "/v1/disputes") data = { object: "list", url: "/v1/disputes", has_more: false, data: disputes };
      else if (url.pathname === "/v1/checkout/sessions") data = { object: "list", url: "/v1/checkout/sessions", has_more: false, data: [session] };
      else throw new Error(`Unexpected test endpoint: ${url.pathname}`);
      return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
    }),
  });
  return { stripe, session, payment, charge, refunds, disputes, calls, fail: () => { failure = true; } };
}

export function eventBody(type = "checkout.session.completed", changes: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_fixture123456", object: "event", type, livemode: false, created,
    data: { object: { id: sessionId, object: "checkout.session" } }, ...changes,
  });
}

export function signedRequest(body = eventBody(), timestamp = Math.floor(Date.now() / 1000), secret = ledgerSettings.webhookSecret) {
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });
  return new Request("http://localhost:3000/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": signature }, body });
}
