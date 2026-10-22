import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";

const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const orders = pgTable("commerce_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("stripe_session_id").notNull(),
  live: boolean("live").notNull(),
  paymentIntentId: text("stripe_payment_intent_id"),
  chargeId: text("stripe_charge_id"),
  email: text("receipt_email"),
  currency: text("currency").notNull(),
  subtotal: integer("subtotal_minor").notNull(),
  discount: integer("discount_minor").notNull(),
  total: integer("total_minor").notNull(),
  captured: integer("captured_minor").notNull(),
  refunded: integer("refunded_minor").notNull(),
  paymentState: text("payment_state", { enum: ["pending", "paid", "failed", "expired"] }).notNull(),
  createdAt: time("created_at").notNull(),
  paidAt: time("paid_at"),
  syncedAt: time("synced_at").notNull().defaultNow(),
}, t => [
  uniqueIndex("commerce_orders_session").on(t.live, t.sessionId),
  uniqueIndex("commerce_orders_payment").on(t.live, t.paymentIntentId),
  uniqueIndex("commerce_orders_charge").on(t.live, t.chargeId),
  index("commerce_orders_paid_at").on(t.live, t.paidAt),
  check("commerce_orders_money", sql`${t.subtotal} >= 0 AND ${t.discount} >= 0 AND ${t.discount} <= ${t.subtotal} AND ${t.total} = ${t.subtotal} - ${t.discount} AND ${t.captured} >= 0 AND ${t.captured} <= ${t.total} AND ${t.refunded} >= 0 AND ${t.refunded} <= ${t.captured}`),
  check("commerce_orders_currency", sql`${t.currency} = 'thb'`),
  check("commerce_orders_state", sql`${t.paymentState} IN ('pending', 'paid', 'failed', 'expired')`),
]);

export const orderItems = pgTable("commerce_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  product: text("product_slug").notNull(),
  version: text("product_version").notNull(),
  priceId: text("stripe_price_id").notNull(),
  unitAmount: integer("unit_amount_minor").notNull(),
  quantity: integer("quantity").notNull(),
}, t => [
  uniqueIndex("commerce_order_items_order").on(t.orderId),
  index("commerce_order_items_product").on(t.product),
  check("commerce_order_items_quantity", sql`${t.quantity} = 1 AND ${t.unitAmount} > 0`),
]);

export const refunds = pgTable("commerce_refunds", {
  id: text("stripe_refund_id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  amount: integer("amount_minor").notNull(),
  status: text("status").notNull(),
  createdAt: time("created_at").notNull(),
}, t => [check("commerce_refunds_amount", sql`${t.amount} > 0`)]);

export const disputes = pgTable("commerce_disputes", {
  id: text("stripe_dispute_id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  amount: integer("amount_minor").notNull(),
  status: text("status").notNull(),
  createdAt: time("created_at").notNull(),
}, t => [check("commerce_disputes_amount", sql`${t.amount} > 0`)]);

export const entitlements = pgTable("commerce_entitlements", {
  orderItemId: uuid("order_item_id").primaryKey().references(() => orderItems.id, { onDelete: "restrict" }),
  state: text("state", { enum: ["inactive", "active", "suspended", "revoked"] }).notNull(),
  reason: text("reason").notNull(),
  updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [check("commerce_entitlements_state", sql`${t.state} IN ('inactive', 'active', 'suspended', 'revoked')`)]);

// Minimal event receipts only: no complete webhook payload, card data, or customer details.
export const webhookEvents = pgTable("commerce_webhook_events", {
  id: text("stripe_event_id").primaryKey(),
  type: text("type").notNull(),
  live: boolean("live").notNull(),
  outcome: text("outcome", { enum: ["processed", "ignored"] }).notNull(),
  receivedAt: time("received_at").notNull().defaultNow(),
}, t => [check("commerce_webhook_events_outcome", sql`${t.outcome} IN ('processed', 'ignored')`)]);

// Opaque credentials are stored as SHA-256 digests, never as usable bearer tokens.
// Grants can precede the webhook: payment/entitlement is checked separately on every use.
export const deliveryGrants = pgTable("commerce_delivery_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  live: boolean("live").notNull(),
  sessionId: text("stripe_session_id").notNull(),
  browserHash: text("browser_hash").notNull(),
  expiresAt: time("expires_at").notNull(),
}, t => [uniqueIndex("commerce_delivery_grants_browser").on(t.live, t.sessionId, t.browserHash),
  index("commerce_delivery_grants_expiry").on(t.expiresAt)]);

export const deliveryTickets = pgTable("commerce_delivery_tickets", {
  tokenHash: text("token_hash").primaryKey(),
  live: boolean("live").notNull(),
  sessionId: text("stripe_session_id").notNull(),
  browserHash: text("browser_hash").notNull(),
  expiresAt: time("expires_at").notNull(),
  consumedAt: time("consumed_at"),
}, t => [index("commerce_delivery_tickets_expiry").on(t.expiresAt)]);

export const deliveryLimits = pgTable("commerce_delivery_limits", {
  keyHash: text("key_hash").primaryKey(),
  hits: integer("hits").notNull(),
  expiresAt: time("expires_at").notNull(),
}, t => [index("commerce_delivery_limits_expiry").on(t.expiresAt)]);
