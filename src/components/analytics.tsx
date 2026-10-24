"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { publicAnalyticsEvent } from "@/lib/analytics/privacy";

function browserPrivacy() {
  return { doNotTrack: navigator.doNotTrack, referrer: document.referrer,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl };
}
const subscribe = () => () => {};
const serverSnapshot = () => false;
const browserSnapshot = () => !!publicAnalyticsEvent({ type: "pageview", url: window.location.href }, browserPrivacy());
const beforeSend = (event: BeforeSendEvent) => browserSnapshot() ? publicAnalyticsEvent(event, browserPrivacy()) : null;

/** Root layout passes a server-evaluated, production-only opt-in. No private config crosses this boundary. */
export function InkzAnalytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const allowed = useSyncExternalStore(subscribe, () => !!pathname && browserSnapshot(), serverSnapshot);
  return enabled && allowed ? <Analytics mode="production" debug={false} beforeSend={beforeSend} /> : null;
}
