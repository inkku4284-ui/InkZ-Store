import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createLedgerDatabase } from "../src/lib/ledger/database";
import { ledgerConfig } from "../src/lib/ledger/config";

async function main() {
  const config = ledgerConfig();
  if (!config) throw new Error("Configure a valid, isolated order ledger before migrating.");
  const hostname = new URL(config.databaseUrl).hostname;
  if (!process.argv.includes(`--confirm-host=${hostname}`)) {
    throw new Error("Pass --confirm-host=<database hostname> after verifying the intended environment.");
  }
  const connection = createLedgerDatabase(config.databaseUrl);
  try {
    await migrate(connection.db, { migrationsFolder: "./drizzle" });
    console.log("Order ledger migrations completed.");
  } finally {
    await connection.close();
  }
}

main().catch(() => {
  // Driver errors can contain credentials/SQL. Keep detailed troubleshooting in a secure database console.
  console.error("Order ledger migration failed. Verify configuration, --confirm-host, and database access. No secrets have been logged.");
  process.exitCode = 1;
});
