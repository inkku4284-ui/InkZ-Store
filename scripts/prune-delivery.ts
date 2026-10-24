import { count, lt } from "drizzle-orm";
import { deliveryConfig } from "../src/lib/delivery/config";
import { createLedgerDatabase } from "../src/lib/ledger/database";
import { deliveryGrants, deliveryTickets, deliveryLimits, deliveryRecovery } from "../src/lib/ledger/schema";

async function main() {
  const config = deliveryConfig();
  if (!config) throw new Error("Configure the isolated secure-delivery test environment first.");
  const hostname = new URL(config.ledger.databaseUrl).hostname;
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes(`--confirm-host=${hostname}`)) throw new Error("Confirm the database hostname before applying.");
  const connection = createLedgerDatabase(config.ledger.databaseUrl);
  const now = new Date();
  try {
    for (const table of [deliveryTickets, deliveryGrants, deliveryLimits, deliveryRecovery]) {
      const where = lt(table.expiresAt, now);
      const [result] = await connection.db.select({ total: count() }).from(table).where(where);
      console.log(`${apply ? "Deleting" : "Dry run:"} ${result.total} expired ${table === deliveryTickets ? "tickets" : table === deliveryGrants ? "grants" : table === deliveryRecovery ? "email proofs" : "rate limits"}.`);
      if (apply) await connection.db.delete(table).where(where);
    }
  } finally { await connection.close(); }
}

main().catch(() => {
  console.error("Delivery cleanup failed. Verify test configuration and --confirm-host. No credentials have been logged.");
  process.exitCode = 1;
});
