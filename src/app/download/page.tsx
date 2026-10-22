import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Status, TextLink, Notice } from "@/components/ui";
import { combat } from "@/lib/products";
import { business } from "@/lib/site";
import { storeConfig, COMBAT_SALE } from "@/lib/store/config";
import { orderFor, stripeClient, type Order } from "@/lib/store/stripe";
import { deliveryEnabled } from "@/lib/delivery/config";
import { SecureDownload } from "@/components/secure-download";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your download", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Download({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  if (deliveryEnabled()) return <SecureDownload sessionId={sessionId} />;
  const config = storeConfig();
  const order: Order = config && sessionId ? await orderFor(stripeClient(config), config, sessionId) : { state: "invalid" };
  const href = `/api/download?session_id=${encodeURIComponent(sessionId)}`;

  if (order.state === "paid") {
    return <><PageIntro index="ORDER / 001" eyebrow="Your download" title="Thanks. It's yours."><p>Payment confirmed by Stripe. Download Combat Framework below. <strong>Bookmark this page</strong>: its address is your download link.</p><p lang="th">จ่ายเงินเรียบร้อย กดดาวน์โหลดด้านล่าง และบุ๊กมาร์กหน้านี้ไว้ (ลิงก์นี้คือลิงก์ดาวน์โหลดของคุณ)</p></PageIntro>
      <div className="order-layout shell"><section className="order-panel" aria-labelledby="order-heading"><Status>{order.mode === "test" ? "TEST MODE" : "Paid"}</Status><h2 id="order-heading">Combat Framework v{COMBAT_SALE.version}</h2>
        <dl className="spec-table"><div><dt>File</dt><dd>{COMBAT_SALE.fileName}</dd></div><div><dt>Receipt</dt><dd>{order.email ? `Sent by Stripe to ${order.email}` : "Sent by Stripe to your email"}</dd></div><div><dt>Ordered</dt><dd>{new Date(order.created * 1000).toISOString().slice(0, 10)}</dd></div></dl>
        <a className="button order-button" href={href} download={COMBAT_SALE.fileName}>Download .rbxm</a>
        <p>Next: open the <Link href="/docs#install">install guide</Link>. Three steps and you are playing in Studio.</p></section>
      <aside className="order-context"><span className="mono">Install in 3 steps</span><h2>Drag. One line. Play.</h2><ol><li>Drag the .rbxm into Roblox Studio.</li><li>View → Command Bar, paste <code>require(workspace[&quot;INKZ_CombatFramework&quot;].INSTALL)()</code>, Enter.</li><li>Press Play. Before your game goes live, upload the animations (guide step 4).</li></ol><Notice title="Need help?" marker="Support"><p>Add <strong>{business.supportDiscord}</strong> on Discord and send your Stripe receipt.</p></Notice><TextLink href="/docs">Full install guide</TextLink><TextLink href="/terms#license">Your license</TextLink></aside></div></>;
  }

  if (order.state === "pending") {
    return <><PageIntro index="ORDER / 001" eyebrow="Your download" title="Confirming payment."><p>Stripe hasn&apos;t confirmed this payment yet (PromptPay can take a moment). Refresh this page in a minute; your download appears here.</p></PageIntro>
      <div className="order-layout shell"><section className="order-panel"><Status>Waiting for payment</Status><h2>Almost there.</h2><p>Keep this page: it unlocks as soon as the payment is confirmed.</p><a className="button order-button" href={`/download?session_id=${encodeURIComponent(sessionId)}`}>Refresh</a></section>
      <aside className="order-context"><Notice title="Paid but stuck?" marker="Support"><p>Add <strong>{business.supportDiscord}</strong> on Discord with your Stripe receipt.</p></Notice></aside></div></>;
  }

  return <><PageIntro index="ORDER / 001" eyebrow="Your download" title="No order here."><p>This page needs the link you got after paying. Visiting it without a valid, paid order unlocks nothing.</p></PageIntro>
    <div className="order-layout shell"><section className="order-panel"><Status>No valid order</Status><h2>Looking for your download?</h2><p>Use the page you landed on after paying (it&apos;s in your browser history). Lost it? Add <strong>{business.supportDiscord}</strong> on Discord and send your Stripe receipt.</p><TextLink href="/products/combat-framework">{`Get ${combat.name}`}</TextLink></section></div></>;
}
