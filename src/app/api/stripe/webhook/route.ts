import { sandboxConfig, sandboxMemory, stripeClient } from "@/lib/stripe/server";
import { processEvent, readBody } from "@/lib/stripe/core";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = sandboxConfig();
  if (!config) return new Response("Sandbox unavailable", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature required", { status: 400 });
  const stripe = stripeClient(config);
  let event;
  try {
    const raw = await readBody(request, 128_000);
    event = stripe.webhooks.constructEvent(raw, signature, config.webhookSecret);
    if (event.livemode) return new Response("Live events rejected", { status: 400 });
  } catch { return new Response("Invalid webhook", { status: 400 }); }
  try {
    const result = await processEvent(event, stripe, sandboxMemory);
    return Response.json({ received: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Failed events are not recorded; Stripe may retry. No fulfillment occurs.
    return new Response("Sandbox event processing failed", { status: 500 });
  }
}
