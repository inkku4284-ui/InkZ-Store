import "server-only";
import { getLedgerDatabase } from "../ledger/database";
import { readOrderSnapshot } from "../ledger/snapshot";
import { stripeClient } from "../store/stripe";
import type { DeliveryConfig } from "../delivery/config";
import { createReviews } from "./service";

export function reviewsService(config: DeliveryConfig) {
  const stripe = stripeClient(config.store);
  return createReviews(getLedgerDatabase(config.ledger.databaseUrl), config.store.mode === "live",
    (id, known) => readOrderSnapshot(stripe, config.ledger, id, known));
}
