import "server-only";
import Stripe from "stripe";
import type { LedgerConfig } from "./config";
import { sessionForEvent, supportedEvents } from "./snapshot";

export const MAX_WEBHOOK_BYTES = 1_048_576;
type Processor = (stripe: Stripe, config: LedgerConfig, event: Stripe.Event, sessionId: string | null) => Promise<unknown>;
const reply = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_WEBHOOK_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function handleWebhook(request: Request, config: LedgerConfig | null, processEvent: Processor) {
  if (!config) return reply(503, { error: "Order ledger is not enabled." });
  const signature = request.headers.get("stripe-signature");
  if (!signature || signature.length > 4096) return reply(400, { error: "Invalid webhook signature." });
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_WEBHOOK_BYTES)) {
    return reply(413, { error: "Webhook body is too large." });
  }
  let body: Buffer | null;
  try { body = await readBody(request); } catch { return reply(400, { error: "Invalid webhook body." }); }
  if (!body) return reply(413, { error: "Webhook body is too large." });
  const stripe = new Stripe(config.key, { maxNetworkRetries: 1, timeout: 5_000 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, config.webhookSecret, 300);
  } catch {
    return reply(400, { error: "Invalid webhook signature." });
  }
  if (event.livemode !== (config.mode === "live") || event.account) return reply(400, { error: "Webhook scope mismatch." });
  if (!supportedEvents.has(event.type)) return reply(200, { received: true });
  try {
    const sessionId = await sessionForEvent(stripe, event);
    await processEvent(stripe, config, event, sessionId);
    // Acknowledge only AFTER the transaction commits. Exceptions leave no deduplication receipt.
    return reply(200, { received: true });
  } catch {
    // Never log the event body, request, database URL, customer data, or SDK exception.
    console.error("InkZ order ledger: webhook processing failed; delivery must be retried.");
    return reply(500, { error: "Webhook processing failed. Retry delivery." });
  }
}
