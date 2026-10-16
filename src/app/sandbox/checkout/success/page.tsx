import type { Metadata } from "next";
import { PageIntro, Status, StatePanel, TextLink } from "@/components/ui";
export const metadata: Metadata = { title: "TEST MODE — Checkout return", robots: { index: false, follow: false } };
export default function SandboxReturn() {
  return <><PageIntro index="TEST / 002" eyebrow="Sandbox / Checkout return" title="Test checkout return."><p>This return page is informational. Visiting it does not confirm a payment.</p></PageIntro><div className="state-wrap shell"><StatePanel code="Return received / Test only" title="No product unlocked." actions={<><TextLink href="/sandbox/checkout">Return to Sandbox checkout</TextLink><TextLink href="/products/combat-framework">View release status</TextLink></>}><Status>TEST MODE</Status><p>Only a verified Stripe webhook can record a confirmed simulated payment. Check the Sandbox Dashboard and webhook delivery response to verify the result. A delayed payment may still be pending.</p><p>No real purchase, license, framework source, or download is provided. INKZ remains pre-launch.</p></StatePanel></div></>;
}
