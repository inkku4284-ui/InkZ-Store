import "server-only";
import type Stripe from "stripe";
import { COMBAT_SALE } from "../store/config";
import type { LedgerConfig } from "./config";

export type PaymentState = "pending" | "paid" | "failed" | "expired";
export type EntitlementState = "inactive" | "active" | "suspended" | "revoked";
type Adjustment = { id: string; amount: number; status: string; createdAt: Date };
export type OrderSnapshot = {
  sessionId: string;
  live: boolean;
  paymentIntentId: string | null;
  chargeId: string | null;
  email: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  captured: number;
  refunded: number;
  paymentState: PaymentState;
  createdAt: Date;
  paidAt: Date | null;
  item: { product: string; version: string; priceId: string; unitAmount: number; quantity: number };
  refunds: Adjustment[];
  disputes: Adjustment[];
};

const ref = (value: string | { id: string } | null) => typeof value === "string" ? value : value?.id ?? null;
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error("Stripe order snapshot could not be verified.");
}
const money = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2_147_483_647;
const date = (value: number) => {
  requireValid(Number.isSafeInteger(value) && value > 0);
  return new Date(value * 1000);
};

/** Historical item snapshots are immutable, even when the active Price changes later. */
export type KnownItem = OrderSnapshot["item"];

/** Load CURRENT Stripe state inside the order lock, never apply an old event's embedded payment state. */
export async function readOrderSnapshot(
  stripe: Stripe, config: LedgerConfig, sessionId: string, known?: KnownItem,
): Promise<OrderSnapshot | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  // Other purchases in the same Stripe account do not belong in this store's ledger.
  if (session.metadata?.product !== COMBAT_SALE.slug) return null;
  requireValid(session.id === sessionId && session.mode === "payment" && session.livemode === (config.mode === "live"));
  const lines = session.line_items;
  requireValid(lines && !lines.has_more && lines.data.length === 1);
  const line = lines.data[0];
  const price = line.price;
  const expectedPrice = known?.priceId ?? config.price;
  // A new, unrecognized price needs an explicit catalog/migration change, not automatic fulfillment.
  if (price?.id !== expectedPrice) return null;
  requireValid(line.quantity === 1 && price.livemode === session.livemode && price.type === "one_time");
  requireValid(price.unit_amount === (known?.unitAmount ?? COMBAT_SALE.amount));
  const version = known?.version ?? COMBAT_SALE.version;
  requireValid(session.metadata?.version === version && session.currency === COMBAT_SALE.currency && price.currency === session.currency);
  requireValid(line.currency === session.currency && line.amount_subtotal === price.unit_amount);
  const subtotal = session.amount_subtotal;
  const total = session.amount_total;
  const discount = session.total_details?.amount_discount;
  requireValid(money(subtotal) && money(total) && money(discount));
  requireValid(subtotal === price.unit_amount && discount <= subtotal && total === subtotal - discount);
  requireValid(session.total_details?.amount_tax === 0 && session.total_details?.amount_shipping === 0);
  requireValid(session.status === "open" || session.status === "complete" || session.status === "expired");

  const paymentIntentId = ref(session.payment_intent);
  const payment = paymentIntentId ? await stripe.paymentIntents.retrieve(paymentIntentId) : null;
  if (payment) {
    requireValid(payment.id === paymentIntentId && payment.livemode === session.livemode && payment.currency === session.currency);
    requireValid(payment.amount === total && payment.metadata.product === COMBAT_SALE.slug);
  }
  const chargeId = payment ? ref(payment.latest_charge) : null;
  const charge = chargeId ? await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] }) : null;
  if (charge) {
    requireValid(charge.id === chargeId && charge.livemode === session.livemode && charge.currency === session.currency);
    requireValid(ref(charge.payment_intent) === paymentIntentId && charge.amount === total);
    requireValid(money(charge.amount_captured) && money(charge.amount_refunded) && charge.amount_refunded <= charge.amount_captured);
  }
  const refunds: Adjustment[] = [];
  const disputes: Adjustment[] = [];
  if (charge) {
    for await (const refund of stripe.refunds.list({ charge: charge.id, limit: 100 })) {
      requireValid(ref(refund.charge) === charge.id && refund.currency === session.currency && money(refund.amount) && refund.amount > 0);
      requireValid(refund.status && ["pending", "requires_action", "succeeded", "failed", "canceled"].includes(refund.status));
      refunds.push({ id: refund.id, amount: refund.amount, status: refund.status, createdAt: date(refund.created) });
    }
    requireValid(refunds.filter(r => r.status === "succeeded").reduce((sum, r) => sum + r.amount, 0) === charge.amount_refunded);
    for await (const dispute of stripe.disputes.list({ charge: charge.id, limit: 100 })) {
      requireValid(ref(dispute.charge) === charge.id && dispute.livemode === session.livemode && dispute.currency === session.currency);
      requireValid(money(dispute.amount) && dispute.amount > 0);
      disputes.push({ id: dispute.id, amount: dispute.amount, status: dispute.status, createdAt: date(dispute.created) });
    }
    requireValid(!charge.disputed || disputes.length > 0);
  }

  const paid = session.status === "complete" && session.payment_status === "paid";
  let paidAt: Date | null = null;
  if (paid) {
    requireValid(payment?.status === "succeeded" && charge?.paid && charge.captured && charge.amount_captured === total && total > 0);
    const balance = charge.balance_transaction;
    // Charge.created can precede a delayed payment's success. Use the actual balance transaction time.
    requireValid(balance && typeof balance !== "string" && ref(balance.source) === charge.id);
    paidAt = date(balance.created);
  }
  // Partial capture is unsupported; never silently turn it into an active entitlement.
  if (charge?.amount_captured) requireValid(paid);
  const paymentState: PaymentState = paid ? "paid" : session.status === "expired" ? "expired"
    : payment?.status === "canceled" || (payment?.status === "requires_payment_method" && !!payment.last_payment_error) ? "failed" : "pending";
  return {
    sessionId, live: session.livemode, paymentIntentId, chargeId,
    email: session.customer_details?.email ?? null, currency: session.currency,
    subtotal, discount, total, captured: charge?.amount_captured ?? 0, refunded: charge?.amount_refunded ?? 0,
    paymentState, createdAt: date(session.created), paidAt,
    item: { product: COMBAT_SALE.slug, version, priceId: price.id, unitAmount: price.unit_amount, quantity: 1 },
    refunds, disputes,
  };
}

export function entitlementFor(snapshot: OrderSnapshot): { state: EntitlementState; reason: string } {
  if (snapshot.paymentState !== "paid") return { state: "inactive", reason: `payment_${snapshot.paymentState}` };
  if (snapshot.refunded >= snapshot.captured) return { state: "revoked", reason: "fully_refunded" };
  if (snapshot.disputes.some(d => d.status === "lost")) return { state: "revoked", reason: "dispute_lost" };
  // Unknown future dispute statuses fail closed. A won/closed inquiry can restore access.
  if (snapshot.disputes.some(d => !["won", "warning_closed", "prevented"].includes(d.status))) {
    return { state: "suspended", reason: "dispute_open" };
  }
  return { state: "active", reason: snapshot.refunded > 0 ? "partially_refunded" : "paid" };
}

export const supportedEvents = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired",
  "charge.refunded", "refund.created", "refund.updated", "refund.failed",
  "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed", "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated",
]);

/** Stripe references are locators only. Payment status always comes from a fresh API lookup. */
export async function sessionForEvent(stripe: Stripe, event: Stripe.Event): Promise<string | null> {
  const object = event.data.object;
  if (object.object === "checkout.session") return object.id;
  let paymentIntent: string | null = null;
  if (object.object === "charge") paymentIntent = ref(object.payment_intent);
  if (object.object === "refund" || object.object === "dispute") {
    const chargeId = ref(object.charge);
    if (chargeId) paymentIntent = ref((await stripe.charges.retrieve(chargeId)).payment_intent);
  }
  if (!paymentIntent) return null;
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 2 });
  requireValid(!sessions.has_more && sessions.data.length <= 1);
  return sessions.data[0]?.id ?? null;
}
