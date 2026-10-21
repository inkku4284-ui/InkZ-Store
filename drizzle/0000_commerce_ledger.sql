CREATE TABLE "commerce_disputes" (
	"stripe_dispute_id" text PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commerce_disputes_amount" CHECK ("commerce_disputes"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_entitlements" (
	"order_item_id" uuid PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"reason" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_entitlements_state" CHECK ("commerce_entitlements"."state" IN ('inactive', 'active', 'suspended', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "commerce_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_slug" text NOT NULL,
	"product_version" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"unit_amount_minor" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "commerce_order_items_quantity" CHECK ("commerce_order_items"."quantity" = 1 AND "commerce_order_items"."unit_amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_session_id" text NOT NULL,
	"live" boolean NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"receipt_email" text,
	"currency" text NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"captured_minor" integer NOT NULL,
	"refunded_minor" integer NOT NULL,
	"payment_state" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_orders_money" CHECK ("commerce_orders"."subtotal_minor" >= 0 AND "commerce_orders"."discount_minor" >= 0 AND "commerce_orders"."discount_minor" <= "commerce_orders"."subtotal_minor" AND "commerce_orders"."total_minor" = "commerce_orders"."subtotal_minor" - "commerce_orders"."discount_minor" AND "commerce_orders"."captured_minor" >= 0 AND "commerce_orders"."captured_minor" <= "commerce_orders"."total_minor" AND "commerce_orders"."refunded_minor" >= 0 AND "commerce_orders"."refunded_minor" <= "commerce_orders"."captured_minor"),
	CONSTRAINT "commerce_orders_currency" CHECK ("commerce_orders"."currency" = 'thb'),
	CONSTRAINT "commerce_orders_state" CHECK ("commerce_orders"."payment_state" IN ('pending', 'paid', 'failed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "commerce_refunds" (
	"stripe_refund_id" text PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commerce_refunds_amount" CHECK ("commerce_refunds"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_webhook_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"live" boolean NOT NULL,
	"outcome" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_webhook_events_outcome" CHECK ("commerce_webhook_events"."outcome" IN ('processed', 'ignored'))
);
--> statement-breakpoint
ALTER TABLE "commerce_disputes" ADD CONSTRAINT "commerce_disputes_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_order_item_id_commerce_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."commerce_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_refunds" ADD CONSTRAINT "commerce_refunds_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_order_items_order" ON "commerce_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "commerce_order_items_product" ON "commerce_order_items" USING btree ("product_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_session" ON "commerce_orders" USING btree ("live","stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_payment" ON "commerce_orders" USING btree ("live","stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_charge" ON "commerce_orders" USING btree ("live","stripe_charge_id");--> statement-breakpoint
CREATE INDEX "commerce_orders_paid_at" ON "commerce_orders" USING btree ("live","paid_at");