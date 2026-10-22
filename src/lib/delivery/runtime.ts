import "server-only";
import { getLedgerDatabase } from "../ledger/database";
import { readOrderSnapshot } from "../ledger/snapshot";
import { stripeClient } from "../store/stripe";
import type { DeliveryConfig } from "./config";
import { createDelivery } from "./service";

export function deliveryService(config: DeliveryConfig) {
  const stripe = stripeClient(config.store);
  return createDelivery(getLedgerDatabase(config.ledger.databaseUrl), config.store.mode === "live",
    (id, known) => readOrderSnapshot(stripe, config.ledger, id, known));
}
