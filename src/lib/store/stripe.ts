import "server-only";
import Stripe from "stripe";
import { COMBAT_SALE, type StoreConfig } from "./config";

export function stripeClient(config: StoreConfig) {
  return new Stripe(config.key, { maxNetworkRetries: 1, timeout: 10_000 });
}

/** The Price must be exactly what the page advertises: active, one-time, the sale's currency and amount. */
export function assertPrice(price: Stripe.Price, config: StoreConfig) {
  if (price.id !== config.price || price.livemode !== (config.mode === "live") || !price.active || price.type !== "one_time" ||
      price.currency !== COMBAT_SALE.currency || price.unit_amount !== COMBAT_SALE.amount || price.billing_scheme !== "per_unit") {
    throw new Error("Price verification failed");
  }
  const product = price.product;
  if (typeof product === "object" && (product.deleted || !product.active)) throw new Error("Product inactive");
  return price;
}

export async function verifiedPrice(stripe: Stripe, config: StoreConfig) {
  return assertPrice(await stripe.prices.retrieve(config.price, { expand: ["product"] }), config);
}

export async function createCheckout(stripe: Stripe, config: StoreConfig, idempotencyKey: string,
  delivery?: { browserHash: string; created: (id: string) => Promise<void> }) {
  await verifiedPrice(stripe, config);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: config.price, quantity: 1 }],
    // payment methods come from the Stripe Dashboard (card, PromptPay, Apple Pay ...)
    adaptive_pricing: { enabled: false },
    automatic_tax: { enabled: false },
    allow_promotion_codes: true,
    locale: "auto",
    metadata: { product: COMBAT_SALE.slug, version: COMBAT_SALE.version },
    payment_intent_data: { description: `INKZ Combat Framework v${COMBAT_SALE.version}`, metadata: { product: COMBAT_SALE.slug } },
    custom_text: { submit: { message: delivery
      ? "After paying, download in this browser. Keep your Stripe receipt for support if you change device. / จ่ายเสร็จดาวน์โหลดในเบราว์เซอร์นี้ เก็บใบเสร็จ Stripe ไว้หากเปลี่ยนเครื่อง"
      : "After paying you go straight to your download page. Bookmark it: it is your download link. / จ่ายเสร็จจะไปหน้าดาวน์โหลดทันที บุ๊กมาร์กหน้านั้นไว้ เป็นลิงก์ดาวน์โหลดของคุณ" } },
    success_url: `${config.origin}/download?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.origin}/products/combat-framework?checkout=cancelled`,
  // A copied client request UUID cannot attach another browser to the same Checkout.
  }, { idempotencyKey: `inkz-combat-${idempotencyKey}${delivery ? `-${delivery.browserHash}` : ""}` });
  if (session.livemode !== (config.mode === "live") || session.mode !== "payment" || !session.url) throw new Error("Invalid Session");
  const url = new URL(session.url);
  if (url.origin !== "https://checkout.stripe.com" || url.username || url.password) throw new Error("Invalid Checkout URL");
  if (delivery) {
    if (!SESSION_ID.test(session.id)) throw new Error("Invalid Session");
    await delivery.created(session.id);
  }
  return session.url;
}

export type Order =
  | { state: "paid"; email: string | null; created: number; mode: "test" | "live" }
  | { state: "pending" }
  | { state: "invalid" };

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,240}$/;

/**
 * The only thing that unlocks the download: Stripe itself says this Checkout Session of THIS store, for THIS
 * Price, in THIS mode, is complete and paid. Query strings and redirects prove nothing.
 */
export async function orderFor(stripe: Stripe, config: StoreConfig, sessionId: string): Promise<Order> {
  if (!SESSION_ID.test(sessionId)) return { state: "invalid" };
  if (sessionId.startsWith("cs_live_") !== (config.mode === "live")) return { state: "invalid" };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  } catch {
    return { state: "invalid" };
  }
  if (session.livemode !== (config.mode === "live") || session.mode !== "payment" || session.metadata?.product !== COMBAT_SALE.slug) {
    return { state: "invalid" };
  }
  const lines = session.line_items;
  if (!lines || lines.has_more || lines.data.length !== 1 || lines.data[0].quantity !== 1 || lines.data[0].price?.id !== config.price) {
    return { state: "invalid" };
  }
  if (session.status === "complete" && session.payment_status === "paid") {
    return { state: "paid", email: session.customer_details?.email ?? null, created: session.created, mode: config.mode };
  }
  if (session.status === "complete" || session.status === "open") return { state: "pending" };
  return { state: "invalid" };
}
