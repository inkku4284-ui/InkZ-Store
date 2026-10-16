import type { Metadata } from "next";
import { PageIntro, Status, StatePanel, TextLink } from "@/components/ui";
export const metadata: Metadata = { title: "TEST MODE — Checkout cancelled", robots: { index: false, follow: false } };
export default function SandboxCancel() {
  return <><PageIntro index="TEST / 003" eyebrow="Sandbox / Checkout cancelled" title="Test checkout left."><p>You returned without finishing this checkout flow. You can return to the Sandbox when you are ready.</p></PageIntro><div className="state-wrap shell"><StatePanel code="Checkout left / Test only" title="The store is still pre-launch." actions={<><TextLink href="/sandbox/checkout">Return to Sandbox checkout</TextLink><TextLink href="/products/combat-framework">View release status</TextLink></>}><Status>TEST MODE</Status><p>This page does not change payment or order state. It does not prove that a Session is expired or unpaid.</p><p>No software, license, or download is unlocked. The Sandbox exists only for simulated payment testing.</p></StatePanel></div></>;
}
