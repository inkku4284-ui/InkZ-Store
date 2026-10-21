import "server-only";

/**
 * Combat Framework sale settings. The amount here must equal the Stripe Price (the server refuses to sell
 * at any other amount, so the page can never show one price and charge another).
 * To change the price: create a new Price in Stripe, set STRIPE_COMBAT_PRICE_ID, and update `amount`.
 */
export const COMBAT_SALE = {
  slug: "combat-framework",
  version: "1.0",
  currency: "thb",
  amount: 34900, // minor units: 349 THB
  fileName: "INKZ_CombatFramework.rbxm",
  encryptedFile: "private/combat-framework.rbxm.enc",
} as const;

export type StoreMode = "test" | "live";
export type StoreConfig = { mode: StoreMode; key: string; price: string; origin: string; fileKey: Buffer };
type Env = Readonly<Record<string, string | undefined>>;

/**
 * Selling is on only when everything below is set; otherwise the store is closed (the page shows "coming soon").
 *   INKZ_SALES=test  + STRIPE_SECRET_KEY sk_test_/rk_test_  -> Stripe test mode, never on Vercel Production
 *   INKZ_SALES=live  + STRIPE_SECRET_KEY sk_live_/rk_live_  -> real payments
 *   STRIPE_COMBAT_PRICE_ID  price_...  (the Price in the same Stripe mode)
 *   COMBAT_FILE_KEY         base64 32-byte key that decrypts private/combat-framework.rbxm.enc
 *   STORE_ORIGIN            optional: https origin for Stripe return URLs (default: the Vercel URL)
 */
export function storeConfig(env: Env = process.env): StoreConfig | null {
  const key = env.STRIPE_SECRET_KEY ?? "";
  let mode: StoreMode;
  if (env.INKZ_SALES === "live" && /^(sk|rk)_live_/.test(key)) mode = "live";
  else if (env.INKZ_SALES === "test" && /^(sk|rk)_test_/.test(key) && env.VERCEL_ENV !== "production") mode = "test";
  else return null;
  const price = env.STRIPE_COMBAT_PRICE_ID ?? "";
  if (!/^price_[A-Za-z0-9]+$/.test(price)) return null;
  const origin = storeOrigin(env);
  if (!origin) return null;
  const fileKey = decodeKey(env.COMBAT_FILE_KEY);
  if (!fileKey) return null;
  return { mode, key, price, origin, fileKey };
}

export function storeOrigin(env: Env = process.env): string | null {
  const candidate = env.STORE_ORIGIN
    || (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    || (env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : undefined)
    || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined)
    || (!env.VERCEL ? "http://localhost:3000" : undefined);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function decodeKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
}

export function formatPrice(amount: number = COMBAT_SALE.amount, currency: string = COMBAT_SALE.currency) {
  return `${(amount / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;
}
