import type { Metadata } from "next";
import { PageIntro, Status, TextLink } from "@/components/ui";
export const metadata: Metadata = { title: "TEST MODE — Checkout return | INKZ", robots: { index: false, follow: false } };
export default function SandboxReturn() {
  return <><PageIntro index="TEST—002" eyebrow="Sandbox / Checkout return" title="Back from the test."><p>This return page is informational. Visiting it does not confirm a payment.</p></PageIntro><section className="sandbox-panel shell"><Status>TEST MODE</Status><h2>No product unlocked.</h2><p>Only a verified Stripe webhook can record a confirmed simulated payment. Check the Sandbox Dashboard and webhook delivery response to verify the result. A delayed payment may still be pending.</p><p>No real purchase, license, framework source, or download is provided. INKZ remains pre-launch.</p><TextLink href="/sandbox/checkout">Return to Sandbox checkout</TextLink><TextLink href="/products/combat-framework">View release status</TextLink></section></>;
}
