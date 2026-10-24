import Stripe from "stripe";
import { ledgerConfig } from "../src/lib/ledger/config";
import { createLedgerDatabase } from "../src/lib/ledger/database";
import { historyWindow, reconcileHistory } from "../src/lib/ledger/history";

async function main() {
  const config = ledgerConfig();
  if (!config) throw new Error("Configure an isolated ledger first.");
  const value = (name: string) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
  const window = historyWindow(value("from"), value("to"));
  const apply = process.argv.includes("--apply");
  if (apply && value("confirm-host") !== new URL(config.databaseUrl).hostname) throw new Error("Confirm the database host before applying.");
  const legacyPrices = process.argv.filter(arg => arg.startsWith("--legacy-price=")).map(arg => arg.slice("--legacy-price=".length));
  const connection = createLedgerDatabase(config.databaseUrl);
  try {
    const stripe = new Stripe(config.key, { maxNetworkRetries: 1, timeout: 10_000 });
    const result = await reconcileHistory(connection.db, stripe, config, { ...window, apply, legacyPrices });
    console.log(JSON.stringify({ mode: config.mode, operation: apply ? "apply" : "dry-run", ...result }));
    if (result.errors || result.unrecognized || result.truncated) process.exitCode = 1;
  } finally { await connection.close(); }
}

main().catch(() => {
  console.error("Order reconciliation failed. Verify mode, date window, approved prices and database host. No customer details or credentials have been logged.");
  process.exitCode = 1;
});
