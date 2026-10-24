CREATE TABLE "commerce_delivery_recovery" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"live" boolean NOT NULL,
	"stripe_session_id" text NOT NULL,
	"browser_hash" text NOT NULL,
	"receipt_email_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "commerce_delivery_recovery_expiry" ON "commerce_delivery_recovery" USING btree ("expires_at");