import type { Metadata } from "next";
import { PageIntro, Status, TextLink } from "@/components/ui";
import { SandboxCheckoutButton } from "@/components/sandbox-checkout-button";
import { sandboxConfig, stripeClient, verifiedPrice } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TEST MODE — Sandbox Checkout | INKZ", robots: { index: false, follow: false } };

export default async function SandboxCheckout() {
  const config = sandboxConfig();
  let verified = false;
  if (config) {
    try { await verifiedPrice(stripeClient(config), config); verified = true; } catch { /* Fail closed without leaking Stripe errors. */ }
  }
  return <><PageIntro index="TEST—001" eyebrow="Sandbox / No real money" title="A test. No release."><p>INKZ® Combat Framework remains pre-launch. This separate checkout is for simulated payments only.</p></PageIntro><section className="sandbox-panel shell" aria-labelledby="sandbox-heading"><Status>TEST MODE</Status><h2 id="sandbox-heading">Combat Framework.<br/>Sandbox only.</h2><dl className="spec-table"><div><dt>Test price</dt><dd>{verified ? "99 THB · verified with Stripe" : "99 THB expected · not verified"}</dd></div><div><dt>Checkout status</dt><dd>{verified ? "Sandbox configured" : "Unavailable — configuration or Price verification required"}</dd></div><div><dt>Delivery</dt><dd>No software, source, license, or download</dd></div></dl><p id="sandbox-boundary">Use Stripe test card details and fictitious customer information only. No real money can be charged through this integration. A simulated payment does not reserve or purchase a product.</p><SandboxCheckoutButton enabled={verified}/><TextLink href="/products/combat-framework">Back to the pre-launch product</TextLink></section></>;
}
