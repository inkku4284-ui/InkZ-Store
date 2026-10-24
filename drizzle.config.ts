import { defineConfig } from "drizzle-kit";

// Generation is offline. Migrations are an explicit operator action, never part of next build.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/ledger/schema.ts",
  out: "./drizzle",
});
