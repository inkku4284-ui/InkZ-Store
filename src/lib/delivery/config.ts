import "server-only";
import { ledgerConfig, type LedgerConfig } from "../ledger/config";
import { storeConfig, type StoreConfig } from "../store/config";

export type DeliveryConfig = { store: StoreConfig; ledger: LedgerConfig };
type Env = Readonly<Record<string, string | undefined>>;

/** An invalid enabled configuration must fail closed, never fall back to Session-ID delivery. */
export function deliveryEnabled(env: Env = process.env) {
  return !!env.INKZ_SECURE_DELIVERY && env.INKZ_SECURE_DELIVERY !== "off";
}

export function deliveryConfig(env: Env = process.env): DeliveryConfig | null {
  if (!deliveryEnabled(env)) return null;
  const store = storeConfig(env);
  const ledger = ledgerConfig(env);
  if (!store || !ledger || env.INKZ_SECURE_DELIVERY !== store.mode || ledger.mode !== store.mode ||
      ledger.key !== store.key || ledger.price !== store.price) return null;
  // This staged release has no email recovery yet. Never cut existing live buyers
  // off from their purchases before recovery/backfill has been completed and reviewed.
  if (store.mode !== "test") return null;
  return { store, ledger };
}
