import type { Metadata } from "next";
import { PageIntro, Status, TextLink } from "@/components/ui";
export const metadata: Metadata = { title: "TEST MODE — Checkout cancelled | INKZ", robots: { index: false, follow: false } };
export default function SandboxCancel() {
  return <><PageIntro index="TEST—003" eyebrow="Sandbox / Checkout cancelled" title="Test checkout left."><p>You returned without finishing this checkout flow. You can return to the Sandbox when you are ready.</p></PageIntro><section className="sandbox-panel shell"><Status>TEST MODE</Status><h2>Still pre-launch.</h2><p>This page does not change payment or order state. It does not prove that a Session is expired or unpaid. No software, license, or download is unlocked.</p><TextLink href="/sandbox/checkout">Return to Sandbox checkout</TextLink><TextLink href="/products/combat-framework">View release status</TextLink></section></>;
}
