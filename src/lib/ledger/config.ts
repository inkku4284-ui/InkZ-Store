import "server-only";
import type { StoreMode } from "../store/config";

export type LedgerConfig = {
  mode: StoreMode;
  key: string;
  webhookSecret: string;
  databaseUrl: string;
  price: string;
};

/** Independent, opt-in shadow ledger: it never changes checkout or download authorization. */
export function ledgerConfig(env: Readonly<Record<string, string | undefined>> = process.env): LedgerConfig | null {
  const mode = env.INKZ_ORDER_LEDGER;
  if (mode !== "test" && mode !== "live") return null;
  if (mode === "live" && env.VERCEL_ENV !== "production") return null;
  if (mode === "test" && env.VERCEL_ENV === "production") return null;
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith(`sk_${mode}_`) && !key.startsWith(`rk_${mode}_`)) return null;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? "";
  const price = env.STRIPE_COMBAT_PRICE_ID ?? "";
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret) || !/^price_[A-Za-z0-9]+$/.test(price)) return null;
  const databaseUrl = env.DATABASE_URL ?? "";
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname === "/") return null;
    // Require verified TLS for remote connections. Local PostgreSQL is useful for development/CI.
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!local && url.searchParams.get("sslmode") !== "verify-full") return null;
    if (mode === "live" && local) return null;
  } catch {
    return null;
  }
  return { mode, key, webhookSecret, databaseUrl, price };
}
