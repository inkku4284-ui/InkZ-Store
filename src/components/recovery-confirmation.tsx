"use client";

import { useSyncExternalStore } from "react";

const subscribe = (changed: () => void) => {
  window.addEventListener("hashchange", changed);
  return () => window.removeEventListener("hashchange", changed);
};
const snapshot = () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const value = fragment.get("token") ?? "";
  return fragment.getAll("token").length === 1 && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
};
const serverSnapshot = () => "";

export function RecoveryConfirmation() {
  // Fragments never travel in HTTP requests or referrers. Merely opening an email
  // link cannot consume its proof: the user must submit this same-origin POST.
  const token = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!token) return null;
  return <section className="recovery-confirmation" aria-labelledby="recovery-confirm-heading">
    <h2 id="recovery-confirm-heading">Confirm this browser</h2>
    <p>Restore access here after checking your payment and refund status. Use the browser that requested this email.</p>
    <form action="/api/delivery/recovery/confirm" method="post">
      <input type="hidden" name="token" value={token} />
      <button className="button order-button" type="submit">Confirm this browser</button>
    </form>
  </section>;
}
