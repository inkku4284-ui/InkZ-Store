CREATE TABLE "commerce_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_item_id" uuid NOT NULL REFERENCES "commerce_order_items"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "display_name" text NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "moderated_at" timestamp with time zone,
  CONSTRAINT "commerce_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "commerce_reviews_name" CHECK (char_length("display_name") BETWEEN 2 AND 40),
  CONSTRAINT "commerce_reviews_body" CHECK (char_length("body") BETWEEN 20 AND 2000),
  CONSTRAINT "commerce_reviews_status" CHECK ("status" IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "commerce_reviews_revision" CHECK ("revision" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_reviews_order_item" ON "commerce_reviews" ("order_item_id");
--> statement-breakpoint
CREATE INDEX "commerce_reviews_moderation" ON "commerce_reviews" ("status", "updated_at");
