"use client";

import { useEffect, useRef, useState } from "react";
import { Status } from "./ui";

type Store = { open: boolean; mode: "test" | "live" | null; checkoutOrigin?: string };

/**
 * The purchase block of the product page. The page itself stays static; whether buying is open is asked from
 * /api/store when it loads. Checkout is opened by the server, which fixes the product and price: the button
 * sends nothing but a retry-safe id.
 */
export function PurchasePanel({ price, availability, delivery }: { price: string; availability: string; delivery: string }) {
  const [store, setStore] = useState<Store>({ open: false, mode: null });
  const [cancelled, setCancelled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    const cancelledNow = new URLSearchParams(window.location.search).get("checkout") === "cancelled";
    Promise.resolve().then(() => {
      if (live) setCancelled(cancelledNow);
    });
    fetch("/api/store", { cache: "no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((result: Store | null) => {
        if (live && result && typeof result.open === "boolean") setStore(result);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function openCheckout() {
    if (busy.current || !store.open) return;
    busy.current = true;
    setPending(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Idempotency-Key": requestId.current } });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error("Checkout unavailable");
      const url = new URL(result.url);
      // Only the canonical origin advertised by /api/store may receive an
      // explicit store redirect. Ordinary payment links remain Stripe-only.
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      const canonicalStore = url.origin === store.checkoutOrigin && url.pathname === "/products/combat-framework" &&
        !url.search && !url.hash && (url.protocol === "https:" || (url.protocol === "http:" && local));
      if (url.username || url.password || (result.destination === "store"
        ? !canonicalStore : url.origin !== "https://checkout.stripe.com")) throw new Error("Invalid destination");
      window.location.assign(url.href);
    } catch {
      setError("Checkout could not open. Please wait a moment and try again.");
      busy.current = false;
      setPending(false);
    }
  }

  const test = store.mode === "test";
  const label = store.open ? (test ? "TEST MODE" : "Available now") : availability;
  return <>
    <Status>{label}</Status>
    <div className="release-price"><span className="mono">Price / one-time</span><strong>{price}</strong></div>
    <button className="purchase-button" type="button" disabled={!store.open || pending} onClick={openCheckout} aria-describedby="purchase-explanation">
      {pending ? "Opening checkout…" : store.open ? (test ? `TEST MODE — Buy · ${price}` : `Buy now · ${price}`) : "Launching soon"}
    </button>
    <p id="purchase-explanation" className="purchase-explanation">{store.open
      ? (test ? "Stripe test mode: card 4242 4242 4242 4242, any future date, any CVC. No real money moves." : `${delivery} Card or PromptPay, via Stripe.`)
      : "Sales open soon. The guide is already public, so you can see exactly how it installs."}</p>
    <p role="status" aria-live="polite" className="order-feedback">{cancelled ? "Payment cancelled. You were not charged." : error}</p>
  </>;
}
