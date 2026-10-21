import { ledgerConfig } from "@/lib/ledger/config";
import { getLedgerDatabase } from "@/lib/ledger/database";
import { createLedger } from "@/lib/ledger/ledger";
import { readOrderSnapshot } from "@/lib/ledger/snapshot";
import { handleWebhook } from "@/lib/ledger/webhook";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleWebhook(request, ledgerConfig(), async (stripe, config, event, sessionId) => {
    const ledger = createLedger(getLedgerDatabase(config.databaseUrl));
    await ledger.record({ id: event.id, type: event.type, live: event.livemode }, sessionId,
      (id, known) => readOrderSnapshot(stripe, config, id, known));
  });
}
