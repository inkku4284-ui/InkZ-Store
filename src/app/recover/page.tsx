import type { Metadata } from "next";
import { PageIntro, Status, Notice, TextLink } from "@/components/ui";
import { RecoveryConfirmation } from "@/components/recovery-confirmation";
import { recoveryRuntimeConfig } from "@/lib/delivery/recovery-http";
import { SESSION_ID } from "@/lib/store/stripe";
import { business } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restore your download", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Recover({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const enabled = !!recoveryRuntimeConfig();
  const sessionId = typeof params.session_id === "string" && SESSION_ID.test(params.session_id) ? params.session_id : "";
  return <>
    <PageIntro index="ORDER / ACCESS" eyebrow="Purchase access" title="Restore your download.">
      <p>Changed device or cleared your cookies? Use the email on your Stripe receipt to restore access. No account or password needed.</p>
    </PageIntro>
    <div className="order-layout shell"><section className="order-panel" aria-labelledby="recovery-heading">
      <Status>Purchase verification</Status>
      {enabled ? <>
        <RecoveryConfirmation />
        {params.sent === "1" ? <p role="status">If an eligible purchase matches, a confirmation link will be sent to its receipt email. Check your inbox and spam folder. Sending can take a moment; the link expires in 15 minutes.</p> : null}
        {params.error === "1" ? <p role="alert">This link expired, was already used, or was opened in a different browser. Request another link from the browser where you want to download.</p> : null}
        <h2 id="recovery-heading">Send an access link</h2>
        <form className="recovery-form" action="/api/delivery/recovery" method="post">
          <label htmlFor="recovery-email">Purchase email</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required aria-describedby="recovery-help" />
          {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}
          <p id="recovery-help">We send only to the purchase receipt address. Open the link in this same browser, then confirm to restore access.</p>
          <button className="button order-button" type="submit">Email my access link</button>
        </form>
        <noscript><p>JavaScript is needed to confirm an email link. You can still request one here or contact support with your receipt.</p></noscript>
      </> : <>
        <h2 id="recovery-heading">Email recovery is temporarily unavailable.</h2>
        <p>Your existing download access is unchanged. Contact support with your Stripe receipt if you need to restore access.</p>
      </>}
    </section><aside className="order-context">
      {enabled ? <Notice title="Sandbox email test" marker="Preview"><p>This test sender can email only the Resend account owner. Use that same email for your Sandbox purchase. Other addresses cannot receive recovery mail yet.</p></Notice> : null}
      <Notice title="Need help?" marker="Support"><p>Add <strong>{business.supportDiscord}</strong> on Discord with your receipt. Never send anyone a payment card number or secret key.</p></Notice>
      <p>Refunds and disputes can remove download access. Verification does not override those decisions.</p>
      <TextLink href="/products/combat-framework">Back to Combat Framework</TextLink>
    </aside></div>
  </>;
}
