import type { BeforeSendEvent } from "@vercel/analytics";

const PUBLIC_PATHS = new Set(["/", "/products", "/products/combat-framework", "/docs", "/contact", "/terms", "/privacy", "/refund-policy"]);
export type AnalyticsPrivacy = { doNotTrack?: string | null; globalPrivacyControl?: boolean; referrer?: string };

/** An explicit page allowlist keeps future account routes private until reviewed. */
export function publicAnalyticsEvent(event: BeforeSendEvent, privacy: AnalyticsPrivacy = {}): BeforeSendEvent | null {
  if (privacy.globalPrivacyControl || privacy.doNotTrack === "1" || privacy.doNotTrack === "yes" || event.type !== "pageview") return null;
  try {
    const url = new URL(event.url);
    // beforeSend cannot redact the browser's HTTP Referer header. Skip identifying
    // entry URLs entirely, instead of only removing tokens from the event body.
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !PUBLIC_PATHS.has(url.pathname)) return null;
    if (privacy.referrer) {
      const referrer = new URL(privacy.referrer);
      if (referrer.protocol !== "https:" || referrer.username || referrer.password || referrer.search || referrer.hash ||
          (referrer.origin === url.origin ? !PUBLIC_PATHS.has(referrer.pathname) : referrer.pathname !== "/")) return null;
    }
    return { type: "pageview", url: `${url.origin}${url.pathname}` };
  } catch { return null; }
}
