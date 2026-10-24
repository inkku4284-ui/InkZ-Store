import "server-only";
import { deliveryConfig, type DeliveryConfig } from "../delivery/config";

export function reviewsConfig(env: Readonly<Record<string, string | undefined>> = process.env): DeliveryConfig | null {
  const config = deliveryConfig(env);
  return config && env.INKZ_REVIEWS === config.store.mode ? config : null;
}
