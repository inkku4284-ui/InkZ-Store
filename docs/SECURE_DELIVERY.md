# PR2: secure guest delivery — Preview evaluation

This draft is stacked on `codex/preview-security-tooling` (PR11), which follows the PR10 order ledger. No merge is needed to test it. It deliberately supports **test mode only**. Unset/off `INKZ_SECURE_DELIVERY` preserves existing checkout/download routes, product data, Stripe Live and PromptPay behavior. Invalid enabled configuration fails closed; it cannot silently fall back to a reusable Session ID.

## Authorization

1. A successful checkout response sets a random 256-bit browser credential in a host-only HttpOnly `__Host-inkz_buyer` cookie (Secure, SameSite=Lax, 30 days). Local HTTP uses a different cookie name. Only its SHA-256 digest is stored. The browser must allow cookies.
2. Only the Session returned directly by Stripe's **create** operation can receive the initial browser grant. Client-supplied Session IDs never create grants. The Stripe idempotency key includes the browser digest, so copying a request UUID cannot attach another browser to the same checkout. A database failure prevents returning the payment URL; retries with the existing browser cookie use the same Stripe key.
3. Checkout uses the configured canonical origin so the return from Stripe retains that host's cookie. Visiting Buy Now on another deployment alias first returns to the canonical product page; click Buy Now there. Use the PR branch URL throughout testing.
4. `/download?session_id=...` checks a matching, unexpired browser grant before querying Stripe. It displays no receipt email or payment identifiers. Wrong/missing credentials get a generic purchase-verification screen. This page is dynamic, private/no-store, no-referrer and excluded from indexing.
5. The native same-origin POST download form mints a random, single-use ticket bound to this browser, Session and test/live scope. Only the ticket hash is stored. A 303 leads to `/api/download?ticket=...`; it expires after 90 seconds. A copied URL in another browser fails, and concurrent redemption has exactly one winner. HEAD returns 405 without consuming anything.
6. Every issuance and redemption reads current Stripe payment, charge, refunds and disputes and atomically updates the durable ledger. It takes the **same order advisory lock as webhooks**, then verifies entitlement and conditionally consumes the ticket in that transaction. A missing/delayed webhook cannot authorize a fully refunded order. This reconciliation does not fabricate webhook receipt IDs.
7. No file is decrypted before authorization. The encrypted package stays in `private/`; the decryption key remains server-only. File responses use private/no-store, no-referrer and attachment headers. A file-read failure spends that ticket; the buyer can request another from the order page.

Full refunds revoke access; partial refunds retain access under the existing ledger policy. Open/unknown disputes suspend, lost disputes revoke, won disputes restore. Unknown product/price/currency/payment relationships fail closed. Stripe/database outages return generic failures and never bypass validation. Files already delivered cannot be retracted. This prevents casual URL sharing; it is not DRM and does not prevent an authorized buyer from copying the file or exporting their browser credential.

## Preview setup and verification

Use an isolated test database and Stripe Sandbox. Do not connect this Preview to a live database or use live keys. Configure `INKZ_SALES=test`, `INKZ_ORDER_LEDGER=test`, `INKZ_SECURE_DELIVERY=test`, the test Price/key, a valid endpoint signing secret, product file key and `DATABASE_URL` with verified TLS. Keep all secrets out of source, screenshots and logs.

Review/apply committed migrations explicitly with `npm.cmd run db:migrate -- --confirm-host=<test database hostname>`. Migration is never part of the build. The existing test ledger endpoint may continue to ingest the same account's test events; read reconciliation also handles an order before its webhook arrives. Separate endpoint signing secrets are required if registering an additional Stripe webhook endpoint.

Test a new Sandbox purchase in the canonical Preview origin. Old test Sessions without a browser grant intentionally do not unlock. Check pending PromptPay, then authorize the **test** simulator payment and download. Copy the order URL and generated file URL to a separate browser profile; both must deny access. Reuse the file URL in the original profile: it must deny the second transfer. Request a new file URL, fully refund that Sandbox payment, then try it: it must deny even if webhook delivery is delayed. Check the private ledger against Stripe; never post customer emails, credentials or payment IDs as public evidence.

Automated cases run against migrated PGlite locally and a disposable pooled PostgreSQL service in CI. The same suite covers financial reconciliation, concurrent redemption, different browsers, expiry, refunds/disputes, durable limits, HTTP issuance/delivery, private headers and no decryption on denial. SDK transports are fixtures in automated tests, not real revenue/analytics. Hosted tests must be reported separately.

## Limits, retention and cost

Checkout keeps the existing best-effort in-memory limits and adds durable per-IP/global limits in secure mode (6/60 per minute). Status uses 30/300, ticket issuance and file delivery 20/300. Hash-only limit keys and counters live in PostgreSQL across function instances. Global limits bound Stripe traffic; these controls do not replace Vercel's platform protections. A shared IP can exhaust its allowance. Untrusted hosting proxies must sanitize forwarded-IP headers before reusing this implementation outside Vercel.

Grants expire after 30 days, tickets after 90 seconds, and rate-limit windows after a minute. There are expiry indexes. Run `npm.cmd run delivery:prune` as a dry run, then add `-- --apply --confirm-host=<test hostname>` to remove expired capability/rate-limit rows. It never deletes orders, refunds, disputes or event receipts. No scheduled Production job is installed by this PR.

No new paid service is required for the browser-bound flow. It uses the existing Neon Free test database and Preview functions; ordinary provider quotas still apply. Current email recommendation: **Resend Free**, discovered through Vercel Marketplace. Its CLI lists the free plan at $0 and requires an owned sending domain. The owner has no domain and explicitly chose testing first. **No Resend resource, paid plan, domain purchase or customer email sending has been activated.** Resend's hosted testing sender is restricted and is not a substitute for verified customer delivery. Review current limits at [Resend pricing](https://resend.com/pricing) before provisioning; leave paid overages disabled.

## Blocking live rollout: recovery and historical customer access

Automatic email recovery is **not implemented or connected in this draft**. The UI says so and retains receipt-based support instructions. Cookie deletion, another device/browser, and a 30-day expiry require recovery. Existing live customers continue through the unchanged legacy path while secure delivery is off. Enabling `INKZ_SECURE_DELIVERY=live` is explicitly refused in this version; do not remove that guard until the following are completed and approved:

- Provision Resend Free with an owned, DNS-verified sender domain. Disable link/open tracking for authentication emails, use a narrowly scoped server-only sending key, and verify delivery to a controlled inbox.
- Implement purchase-linked recovery: verify the actual Stripe receipt address, send only to that verified address, use short-lived hashed single-use tokens bound to the requesting browser, confirm with POST rather than consuming on GET, and apply persistent IP/order/recipient/global send limits. Never echo lookup results, email addresses or payment identifiers publicly.
- Reconcile/backfill historical purchases with an explicit approved historical price/version map and a dry-run report. Recovery must work for old receipts and different devices, with full-refund/dispute checks at redemption. No bearer Session-ID fallback may remain once live cutover is approved.
- Complete hosted Sandbox security checks, approve the separate live configuration/cutover, and update public delivery/privacy terms to match the finished workflow.

This draft is reviewable test code, **not a claim that the full commerce platform or live security rollout is finished**. There is no admin dashboard, review system, storefront redesign, automatic merge or Production deployment in this PR.
