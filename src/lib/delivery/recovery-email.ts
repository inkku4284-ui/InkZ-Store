import "server-only";
import { deliveryConfig } from "./config";
import { normalizeReceiptEmail } from "./email-address";
import { TOKEN, digest } from "./security";

export type RecoveryEmailConfig = { key: string; testRecipient: string };

/** No sender domain is owned yet: never let this test sender target arbitrary customers. */
export function recoveryEmailConfig(env: Readonly<Record<string, string | undefined>> = process.env): RecoveryEmailConfig | null {
  if (env.INKZ_RECOVERY_EMAIL !== "test" || !deliveryConfig(env)) return null;
  const key = env.RESEND_API_KEY ?? "";
  const testRecipient = normalizeReceiptEmail(env.INKZ_RECOVERY_TEST_EMAIL ?? "");
  if (!/^re_[A-Za-z0-9_-]{10,200}$/.test(key) || !testRecipient) return null;
  return { key, testRecipient };
}

/** The caller supplies Stripe's verified receipt address, not an HTTP form destination. */
export async function sendRecoveryEmail(config: RecoveryEmailConfig, recipient: string, origin: string, token: string,
  transport: typeof fetch = fetch): Promise<boolean> {
  if (normalizeReceiptEmail(recipient) !== config.testRecipient || !TOKEN.test(token)) return false;
  try {
    const site = new URL(origin);
    if (site.origin !== origin || site.username || site.password ||
      (site.protocol !== "https:" && !(site.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)))) return false;
    const link = `${origin}/recover#token=${token}`;
    const response = await transport("https://api.resend.com/emails", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "Idempotency-Key": `inkz-recovery-${digest(token)}` },
      body: JSON.stringify({ from: "InkZ <onboarding@resend.dev>", to: [recipient], subject: "Restore your InkZ download access",
        text: `You requested access to your InkZ purchase.\n\nOpen this link in the same browser that requested it, then select Confirm this browser:\n${link}\n\nThis link expires in 15 minutes and works once. Payment and refund status will be checked again.\n\nIf you did not request this message, ignore it. No access has been changed.`,
      }),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return !!result && typeof result === "object" && "id" in result && typeof result.id === "string" && result.id.length > 0;
  } catch {
    // Provider bodies and network errors may contain the destination or API credential.
    return false;
  }
}
