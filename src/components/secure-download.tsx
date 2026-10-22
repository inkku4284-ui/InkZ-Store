import { cookies, headers } from "next/headers";
import Link from "next/link";
import { PageIntro, Status, Notice } from "./ui";
import { COMBAT_SALE } from "@/lib/store/config";
import { business } from "@/lib/site";
import { deliveryConfig } from "@/lib/delivery/config";
import { deliveryService } from "@/lib/delivery/runtime";
import { cookieName } from "@/lib/delivery/security";

export async function SecureDownload({ sessionId }: { sessionId: string }) {
  const config = deliveryConfig();
  let state = "offline";
  if (config) {
    const browser = (await cookies()).get(cookieName(config.store.origin))?.value ?? "";
    if (!browser) state = "unverified";
    else try {
      const service = deliveryService(config);
      const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (await service.allow(`status:ip:${ip}`, 30, 60) && await service.allow("status:global", 300, 60)) {
        state = (await service.status(sessionId, browser)).state;
      }
    } catch { /* A connection failure never falls back to Session-ID authorization. */ }
  }
  const paid = state === "paid";
  const title = paid ? "Thanks. It's yours." : state === "pending" ? "Confirming payment." : state === "offline" ? "Please try again shortly." : "Verify your purchase.";
  return <>
    <PageIntro index="ORDER / 001" eyebrow="Your download" title={title}>
      <p>{paid ? "Your payment and download access have been verified. Use this browser to download your framework."
        : state === "pending" ? "Stripe is still confirming your payment. PromptPay can take a moment. Refresh this page shortly."
        : state === "offline" ? "We could not check your access right now. Keep your order page and try again shortly."
        : "Open this page in the browser you used at checkout. If you changed device or cleared cookies, contact support with your Stripe receipt."}</p>
    </PageIntro>
    <div className="order-layout shell"><section className="order-panel" aria-labelledby="secure-order-heading">
      <Status>{paid ? config?.store.mode === "test" ? "TEST MODE" : "Paid" : state === "pending" ? "Waiting for payment" : "Access verification"}</Status>
      <h2 id="secure-order-heading">Combat Framework v{COMBAT_SALE.version}</h2>
      {paid ? <>
        <form action="/api/delivery/ticket" method="post">
          <input type="hidden" name="session_id" value={sessionId} />
          <button className="button order-button" type="submit">Download .rbxm</button>
        </form>
        <p>Each download link works once and expires after 90 seconds. You can request another here while your purchase remains eligible.</p>
        <p lang="th">ดาวน์โหลดได้ในเบราว์เซอร์ที่ซื้อ ลิงก์ไฟล์ใช้ได้ครั้งเดียว หากหมดอายุให้กดปุ่มใหม่</p>
        <p>Next: open the <Link href="/docs#install">install guide</Link>.</p>
      </> : <a className="button order-button" href={`/download?session_id=${encodeURIComponent(sessionId)}`}>Check again</a>}
    </section><aside className="order-context">
      <Notice title="Keep your receipt" marker="Support"><p>Keep the Stripe receipt sent to your purchase email. Add <strong>{business.supportDiscord}</strong> on Discord if you need help restoring access.</p></Notice>
      <p>Sharing this page does not grant another browser access. A completed refund or payment dispute can remove download access.</p>
      <p>Automatic email recovery is not available in this test release.</p>
    </aside></div>
  </>;
}
