import "server-only";
import Stripe from "stripe";
import { createHash } from "node:crypto";
import { COMBAT_AMOUNT, COMBAT_PRICE, COMBAT_PRODUCT, INTEGRATION, type SandboxConfig } from "./config";

export function stripeClient(config: SandboxConfig) {
  return new Stripe(config.key, { maxNetworkRetries: 1, timeout: 10_000 });
}

export function assertPrice(price: Stripe.Price) {
  const product = price.product;
  if (price.id !== COMBAT_PRICE || price.livemode || !price.active || price.type !== "one_time" ||
      price.currency !== "thb" || price.unit_amount !== COMBAT_AMOUNT || price.billing_scheme !== "per_unit" ||
      typeof product === "string" || product.deleted || product.id !== COMBAT_PRODUCT || product.livemode || !product.active) {
    throw new Error("Sandbox Price verification failed");
  }
  return price;
}

export async function verifiedPrice(stripe: Stripe, config: SandboxConfig) {
  return assertPrice(await stripe.prices.retrieve(config.price, { expand: ["product"] }));
}

export type TestState = "pending" | "failed" | "expired" | "paid";
// Deliberately volatile. No fulfillment exists. Never use this as a durable order ledger.
export class SandboxMemory {
  readonly events = new Map<string, number>();
  readonly orders = new Map<string, { state: TestState; updated: number; transitions: number }>();
  private readonly limits = new Map<string, { count: number; until: number }>();
  private total = { count: 0, until: 0 };
  prune(now = Date.now()) {
    for (const [id, at] of this.events) if (now - at > 86_400_000) this.events.delete(id);
    for (const [id, order] of this.orders) if (now - order.updated > 86_400_000) this.orders.delete(id);
    for (const [id, limit] of this.limits) if (now >= limit.until) this.limits.delete(id);
  }
  allow(ip: string, now = Date.now()) {
    this.prune(now);
    const id = createHash("sha256").update(ip).digest("hex");
    if (now >= this.total.until) this.total = { count: 0, until: now + 60_000 };
    const limit = this.limits.get(id) ?? { count: 0, until: now + 60_000 };
    if (this.total.count >= 20 || limit.count >= 5 || this.limits.size >= 1000) return false;
    this.total.count++; limit.count++; this.limits.set(id, limit);
    return true;
  }
  record(event: string, session: string, state: TestState) {
    this.prune();
    if (this.events.has(event)) return { duplicate: true, changed: false };
    if (this.events.size >= 10_000 || (!this.orders.has(session) && this.orders.size >= 10_000)) throw new Error("Sandbox memory full");
    const previous = this.orders.get(session);
    // Paid is terminal; stale pending/expiry/failure events cannot undo it.
    const changed = !previous || (previous.state !== state && previous.state !== "paid" && (state === "paid" || previous.state === "pending"));
    if (changed) this.orders.set(session, { state, updated: Date.now(), transitions: (previous?.transitions ?? 0) + 1 });
    this.events.set(event, Date.now());
    return { duplicate: false, changed };
  }
}

export async function readBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max) throw new Error("Body too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}

export function checkoutRequestAllowed(request: Request, config: SandboxConfig) {
  return request.headers.get("origin") === config.origin && new URL(request.url).origin === config.origin &&
    (!request.headers.has("sec-fetch-site") || request.headers.get("sec-fetch-site") === "same-origin") &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.headers.get("idempotency-key") ?? "");
}

export async function createCheckout(stripe: Stripe, config: SandboxConfig, key: string) {
  await verifiedPrice(stripe, config);
  const session = await stripe.checkout.sessions.create({
    mode: "payment", allowed_payment_method_types: ["card"], adaptive_pricing: { enabled: false }, automatic_tax: { enabled: false }, allow_promotion_codes: false,
    line_items: [{ price: config.price, quantity: 1 }],
    metadata: { integration: INTEGRATION },
    success_url: `${config.origin}/sandbox/checkout/success`,
    cancel_url: `${config.origin}/sandbox/checkout/cancel`,
  }, { idempotencyKey: `inkz-sandbox-${key}` });
  if (session.livemode || session.mode !== "payment" || !session.url) throw new Error("Invalid Sandbox Session");
  const url = new URL(session.url);
  if (url.origin !== "https://checkout.stripe.com" || url.username || url.password) throw new Error("Invalid Checkout URL");
  return session.url;
}

const handled = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"]);
export async function processEvent(event: Stripe.Event, stripe: Stripe, memory: SandboxMemory) {
  memory.prune();
  if (event.livemode) throw new Error("Live event rejected");
  if (!handled.has(event.type)) return { ignored: true };
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.integration !== INTEGRATION) return { ignored: true };
  if (session.livemode || session.mode !== "payment" || session.currency !== "thb" || session.amount_total !== COMBAT_AMOUNT) throw new Error("Unexpected Sandbox Session");
  if (memory.events.has(event.id)) return { duplicate: true, changed: false };
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2, expand: ["data.price.product"] });
  if (lines.has_more || lines.data.length !== 1 || lines.data[0].quantity !== 1 || !lines.data[0].price) throw new Error("Unexpected line items");
  assertPrice(lines.data[0].price);
  let state: TestState = "pending";
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session.payment_status === "paid" && session.status === "complete") state = "paid";
    else if (event.type === "checkout.session.async_payment_succeeded") throw new Error("Payment not confirmed");
  } else if (event.type === "checkout.session.async_payment_failed") state = "failed";
  else state = "expired";
  return memory.record(event.id, session.id, state);
}
