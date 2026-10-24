CREATE TABLE IF NOT EXISTS "commerce_admin_oauth" (
  "state_hash" text PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  "verifier_hash" text NOT NULL CHECK (verifier_hash ~ '^[a-f0-9]{64}$'),
  "live" boolean NOT NULL,
  "expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_admin_oauth_expiry" ON "commerce_admin_oauth" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commerce_admin_sessions" (
  "token_hash" text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  "live" boolean NOT NULL,
  "owner_github_id" text NOT NULL CHECK (owner_github_id ~ '^[1-9][0-9]{0,19}$'),
  "expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_admin_sessions_expiry" ON "commerce_admin_sessions" ("expires_at");
