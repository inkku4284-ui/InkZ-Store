import "server-only";
// Server code only: the Node Stripe client and crypto imports keep this out of browser code.
export const COMBAT_PRICE = "price_1UQpbi2L1yv98dz3uh9U1TME";
export const COMBAT_PRODUCT = "prod_VRj357Xbgw87ig";
export const COMBAT_AMOUNT = 9900; // THB minor units: expected 99 THB, verified with Stripe.
export const INTEGRATION = "inkz-combat-sandbox-v1";

export function sandboxConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  if (env.INKZ_STRIPE_SANDBOX !== "true" || env.VERCEL_ENV === "production") return null;
  if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) return null;
  if (env.STRIPE_COMBAT_PRICE_ID !== COMBAT_PRICE || !env.STRIPE_SANDBOX_ORIGIN) return null;
  try {
    const origin = new URL(env.STRIPE_SANDBOX_ORIGIN);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if (origin.origin !== env.STRIPE_SANDBOX_ORIGIN || origin.username || origin.password) return null;
    if (origin.protocol !== "https:" && !(origin.protocol === "http:" && local && !env.VERCEL)) return null;
    return { key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, price: COMBAT_PRICE, origin: origin.origin };
  } catch { return null; }
}

export type SandboxConfig = NonNullable<ReturnType<typeof sandboxConfig>>;
