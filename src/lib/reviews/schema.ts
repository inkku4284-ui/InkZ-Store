import { sql } from "drizzle-orm";
import { pgTable, uuid, integer, text, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { orderItems } from "../ledger/schema";

export const reviews = pgTable("commerce_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  displayName: text("display_name").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  moderatedAt: timestamp("moderated_at", { withTimezone: true, mode: "date" }),
}, t => [uniqueIndex("commerce_reviews_order_item").on(t.orderItemId),
  index("commerce_reviews_moderation").on(t.status, t.updatedAt),
  check("commerce_reviews_rating", sql`${t.rating} BETWEEN 1 AND 5`),
  check("commerce_reviews_name", sql`char_length(${t.displayName}) BETWEEN 2 AND 40`),
  check("commerce_reviews_body", sql`char_length(${t.body}) BETWEEN 20 AND 2000`),
  check("commerce_reviews_status", sql`${t.status} IN ('pending', 'approved', 'rejected')`),
  check("commerce_reviews_revision", sql`${t.revision} > 0`)]);
