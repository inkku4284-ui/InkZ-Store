import { storeConfig } from "@/lib/store/config";
import { createCheckout, stripeClient } from "@/lib/store/stripe";
import { checkoutRequestAllowed, clientIp, limits } from "@/lib/store/guard";

export const runtime = "nodejs";
const reply = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const config = storeConfig();
  if (!config) return reply({ error: "Checkout is not open yet." }, 503);
  if (!checkoutRequestAllowed(request, config.origin)) return reply({ error: "Request rejected." }, 403);
  if (!limits.checkout.allow(clientIp(request))) return reply({ error: "Please wait a moment and try again." }, 429);
  // the purchase is fixed on the server: nothing from the client is accepted
  if (Number(request.headers.get("content-length") ?? 0) > 0) return reply({ error: "No purchase parameters accepted." }, 400);
  try {
    if ((await request.arrayBuffer()).byteLength > 0) return reply({ error: "No purchase parameters accepted." }, 400);
  } catch {
    return reply({ error: "No purchase parameters accepted." }, 400);
  }
  try {
    const url = await createCheckout(stripeClient(config), config, request.headers.get("idempotency-key")!);
    return reply({ url }, 200);
  } catch {
    // Stripe errors are not logged or returned: they can contain request details.
    return reply({ error: "Checkout could not open. Please try again in a moment." }, 503);
  }
}
