import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminOauth = pgTable("commerce_admin_oauth", {
  stateHash: text("state_hash").primaryKey(),
  verifierHash: text("verifier_hash").notNull(),
  live: boolean("live").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
}, table => [index("commerce_admin_oauth_expiry").on(table.expiresAt),
  check("commerce_admin_oauth_state_hash_check", sql`${table.stateHash} ~ '^[a-f0-9]{64}$'`),
  check("commerce_admin_oauth_verifier_hash_check", sql`${table.verifierHash} ~ '^[a-f0-9]{64}$'`)]);

export const adminSessions = pgTable("commerce_admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  live: boolean("live").notNull(),
  ownerId: text("owner_github_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
}, table => [index("commerce_admin_sessions_expiry").on(table.expiresAt),
  check("commerce_admin_sessions_token_hash_check", sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`),
  check("commerce_admin_sessions_owner_github_id_check", sql`${table.ownerId} ~ '^[1-9][0-9]{0,19}$'`)]);
