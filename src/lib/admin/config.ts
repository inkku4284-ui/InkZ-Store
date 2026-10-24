import "server-only";
import { ledgerConfig } from "../ledger/config";
import { storeOrigin } from "../store/config";

export type AdminConfig = {
  live: boolean;
  origin: string;
  databaseUrl: string;
  clientId: string;
  clientSecret: string;
  ownerIds: readonly string[];
};

/** No authentication fallback: removing any required setting closes owner access. */
export function adminConfig(env: Readonly<Record<string, string | undefined>> = process.env): AdminConfig | null {
  const mode = env.INKZ_ADMIN;
  if (mode !== "test" && mode !== "live") return null;
  const ledger = ledgerConfig(env);
  const origin = storeOrigin(env);
  if (!ledger || mode !== ledger.mode || !origin || !env.STORE_ORIGIN) return null;
  const clientId = env.GITHUB_CLIENT_ID ?? "";
  const clientSecret = env.GITHUB_CLIENT_SECRET ?? "";
  const ownerIds = (env.INKZ_OWNER_GITHUB_IDS ?? "").split(",").map(value => value.trim());
  if (!/^[A-Za-z0-9._-]{5,100}$/.test(clientId) || !/^[A-Za-z0-9_-]{16,200}$/.test(clientSecret) ||
    ownerIds.length > 5 || ownerIds.some(value => !/^[1-9][0-9]{0,19}$/.test(value)) || new Set(ownerIds).size !== ownerIds.length) return null;
  if (mode === "live" && !origin.startsWith("https:")) return null;
  return { live: mode === "live", origin, databaseUrl: ledger.databaseUrl, clientId, clientSecret, ownerIds };
}
