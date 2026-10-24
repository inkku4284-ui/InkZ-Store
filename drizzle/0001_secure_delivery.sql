CREATE TABLE "commerce_delivery_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"live" boolean NOT NULL,
	"stripe_session_id" text NOT NULL,
	"browser_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_delivery_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_delivery_tickets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"live" boolean NOT NULL,
	"stripe_session_id" text NOT NULL,
	"browser_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_delivery_grants_browser" ON "commerce_delivery_grants" USING btree ("live","stripe_session_id","browser_hash");--> statement-breakpoint
CREATE INDEX "commerce_delivery_grants_expiry" ON "commerce_delivery_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "commerce_delivery_limits_expiry" ON "commerce_delivery_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "commerce_delivery_tickets_expiry" ON "commerce_delivery_tickets" USING btree ("expires_at");