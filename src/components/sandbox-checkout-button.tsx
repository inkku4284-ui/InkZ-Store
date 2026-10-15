"use client";

import { useRef, useState } from "react";

export function SandboxCheckoutButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  async function openCheckout() {
    if (busy.current || !enabled) return;
    busy.current = true; setPending(true); setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/sandbox/checkout", {
        method: "POST", headers: { "Idempotency-Key": requestId.current },
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error("Checkout unavailable");
      const url = new URL(result.url);
      if (url.origin !== "https://checkout.stripe.com") throw new Error("Invalid destination");
      window.location.assign(url.href);
    } catch {
      setError("Sandbox checkout could not open. Please wait and try again, or check the test configuration.");
      busy.current = false; setPending(false);
    }
  }
  return <><button className="button sandbox-button" type="button" disabled={!enabled || pending} onClick={openCheckout} aria-describedby="sandbox-boundary">{pending ? "Opening test checkout…" : enabled ? "TEST MODE — Open Stripe Sandbox" : "TEST MODE — Checkout unavailable"}</button><p role="status" aria-live="polite" className="sandbox-feedback">{error}</p></>;
}
