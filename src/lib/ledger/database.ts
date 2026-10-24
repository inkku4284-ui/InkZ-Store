import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export function createLedgerDatabase(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 3,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  // Pool error objects can contain connection details. Never log them.
  pool.on("error", () => console.error("InkZ order ledger: database connection failed."));
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

let connection: ReturnType<typeof createLedgerDatabase> | undefined;
let connectionUrl: string | undefined;

/** Lazy initialization keeps ordinary builds and the existing store independent of DATABASE_URL. */
export function getLedgerDatabase(databaseUrl: string) {
  if (!connection) {
    connection = createLedgerDatabase(databaseUrl);
    connectionUrl = databaseUrl;
  }
  if (connectionUrl !== databaseUrl) throw new Error("Ledger configuration changed; restart the process.");
  return connection.db;
}
