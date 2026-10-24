import Link from "next/link";
import { DocumentLayout, ArticleSection } from "@/components/document-layout";
import { PageIntro, Notice, PolicySummary } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Privacy Policy", "How InkZ handles purchases, access verification, optional reviews and traffic analytics.", "/privacy");
const links = [["collection","Purchases & reviews"],["hosting","Hosting & analytics"],["storage","Access cookies"],["rights","Privacy questions"],["changes","Deployment settings"]] as const;

export default function Privacy() {
  return <><PageIntro index="LEG—003" eyebrow="Privacy policy" title="Privacy policy."><p>How information is used when you browse, buy or restore a purchase.</p><p className="policy-date mono">Policy version / 24 October 2026</p></PageIntro>
    <PolicySummary items={[["Customer accounts","No registration required"],["Payments","Stripe-hosted checkout"],["Questions","Discord: inkz_xko"]]}/>
    <DocumentLayout links={links}>
      <Notice title="Your purchase stays private." marker="Summary"><p>Payment details stay with Stripe. Public reviews show a nickname, rating and review text, never your receipt email or payment reference. The owner workspace is separate from customer access.</p></Notice>
      <ArticleSection id="collection" title="01 — Purchases and optional reviews">
        <p>Stripe processes card or PromptPay details and your receipt email on its hosted checkout. InkZ does not receive full card numbers. The server checks payment, refund and dispute status before granting access where secure delivery is enabled.</p>
        <p>When the order ledger is enabled, private purchase records include the receipt email, Stripe references, product version, amounts, financial status and entitlement. These support delivery, recovery, refunds and owner reporting. They are not published in reviews or visitor reports. Deployments using the older delivery path look up the purchase directly from Stripe.</p>
        <p>When email recovery is enabled, the server sends an expiring verification link to the purchase receipt address using Resend. Only a digest of the browser-bound proof is stored. The test sender is restricted to the configured owner mailbox; it is not a general customer email service.</p>
        <p>Reviews are optional and require a verified purchase. The nickname, rating, review text and date may be published after moderation. Edits return to moderation. Avoid putting contact details or payment references in a review. Review content stays until removed by the operator; contact support to request removal. Financial records may need separate retention for business obligations; their operational retention policy must be finalized before enabling the new Live ledger.</p>
      </ArticleSection>
      <ArticleSection id="hosting" title="02 — Hosting and optional traffic measurement">
        <p>Vercel receives technical request information to host and protect the website. Fonts, product video and artwork are served by this site. Provider infrastructure logs have their own settings and retention; application database records are separate.</p>
        <p>Optional Vercel Web Analytics is disabled unless explicitly enabled in deployment settings. When enabled on Production it measures visits to an allowlist of public pages. The application suppresses collection for private routes, URLs containing query strings or fragments, identifying referrers, Do Not Track and Global Privacy Control. It sends no custom purchase events, receipt addresses or payment references.</p>
        <p>Vercel uses daily rotating anonymous visitor identifiers. Counts do not establish unique customers across days. The private owner dashboard reads aggregate visitors, page views and page trends through a server credential. Analytics retention depends on the configured provider plan. Read <a className="text-link" href="https://vercel.com/docs/analytics/privacy-policy">Vercel&apos;s analytics privacy information</a>.</p>
      </ArticleSection>
      <ArticleSection id="storage" title="03 — Access cookies and expiry">
        <p>Secure delivery uses a host-only HttpOnly browser cookie lasting up to 30 days. The database stores its digest, not a usable cookie. Download tickets expire after 90 seconds; email proofs after 15 minutes. Shared abuse counters expire after their defined windows. Expired database rows require the documented operator cleanup; expiry itself prevents their use.</p>
        <p>The optional owner login uses GitHub identity, a five-minute OAuth challenge and an eight-hour revocable session. Session credentials are stored only as digests. No customer registration or password account is required. The application does not use local storage for advertising or payment credentials.</p>
      </ArticleSection>
      <ArticleSection id="rights" title="04 — Questions and removal requests">
        <p>Contact <strong>inkz_xko</strong> on Discord through the <Link href="/contact">support page</Link> for privacy questions, review removal or purchase access help. Keep receipts private and do not send API keys, passwords or download verification links. The operator reviews requests against the records involved and applicable retention requirements.</p>
      </ArticleSection>
      <ArticleSection id="changes" title="05 — Features depend on deployment settings">
        <p>Sandbox Preview and Production use separate configuration. This page describes the available data flows; it does not claim every optional feature is active. A missing analytics connection displays unavailable data, and a missing recovery configuration does not send email. Processing changes require reviewing this notice and the provider settings before activation. See the <Link href="/terms">terms and license</Link>.</p>
      </ArticleSection>
    </DocumentLayout></>;
}
