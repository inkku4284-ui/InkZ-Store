import { sandboxConfig, sandboxMemory, stripeClient } from "@/lib/stripe/server";
import { checkoutRequestAllowed, createCheckout, readBody } from "@/lib/stripe/core";

export const runtime = "nodejs";
const reply = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const config = sandboxConfig();
  if (!config) return reply({ error: "Sandbox checkout unavailable." }, 503);
  if (!checkoutRequestAllowed(request, config)) return reply({ error: "Request rejected." }, 403);
  // Global cap remains effective even when a caller forges forwarding headers.
  if (!sandboxMemory.allow(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")) return reply({ error: "Please wait before trying again." }, 429);
  try { if (await readBody(request, 0)) return reply({ error: "No purchase parameters accepted." }, 400); }
  catch { return reply({ error: "No purchase parameters accepted." }, 400); }
  try {
    const url = await createCheckout(stripeClient(config), config, request.headers.get("idempotency-key")!);
    return reply({ url }, 200);
  } catch {
    // Do not log Stripe errors: they can contain request/customer information.
    return reply({ error: "Sandbox checkout unavailable. Check server configuration and the test Price." }, 503);
  }
}
