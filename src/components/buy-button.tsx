"use client";

import { useRef, useState } from "react";

/** Opens Stripe Checkout. The server fixes the product and price; the button sends nothing but a retry-safe id. */
export function BuyButton({ enabled, label, closedLabel }: { enabled: boolean; label: string; closedLabel: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  async function openCheckout() {
    if (busy.current || !enabled) return;
    busy.current = true;
    setPending(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Idempotency-Key": requestId.current } });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error("Checkout unavailable");
      const url = new URL(result.url);
      if (url.origin !== "https://checkout.stripe.com") throw new Error("Invalid destination");
      window.location.assign(url.href);
    } catch {
      setError("Checkout could not open. Please wait a moment and try again.");
      busy.current = false;
      setPending(false);
    }
  }
  return <>
    <button className="purchase-button" type="button" disabled={!enabled || pending} onClick={openCheckout} aria-describedby="purchase-explanation">
      {pending ? "Opening checkout…" : enabled ? label : closedLabel}
    </button>
    <p role="status" aria-live="polite" className="order-feedback">{error}</p>
  </>;
}
