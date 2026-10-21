import "server-only";
import { storeConfig, type StoreMode } from "./config";
import { stripeClient, verifiedPrice } from "./stripe";

export type StoreStatus = { open: boolean; mode: StoreMode | null };

/** Is buying possible right now? Only when the server is configured AND Stripe confirms the advertised Price. */
export async function storeStatus(): Promise<StoreStatus> {
  const config = storeConfig();
  if (!config) return { open: false, mode: null };
  try {
    await verifiedPrice(stripeClient(config), config);
    return { open: true, mode: config.mode };
  } catch {
    return { open: false, mode: config.mode };
  }
}
