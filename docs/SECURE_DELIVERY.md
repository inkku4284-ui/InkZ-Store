# PR2: secure delivery and receipt-email recovery (Preview only)

Draft PR12 is stacked on PR11, after the PR10 ledger. The secure feature still supports **test mode only**. `INKZ_SECURE_DELIVERY` unset/off preserves existing Production checkout, PromptPay and customer access. Invalid enabled configuration fails closed. No merge, Production deployment or live Stripe change is authorized by this PR.

## Download authorization

Checkout stores a random 256-bit host-only HttpOnly buyer cookie (`__Host-inkz_buyer`, Secure, SameSite=Lax, 30 days). Only its SHA-256 digest is persisted. Only the Session returned directly by Stripe's create operation gets the initial grant. Idempotency includes the browser digest so a copied request UUID cannot attach another browser to that checkout.

The canonical store origin must be used throughout checkout so Stripe returns to the cookie's host. On another deployment alias, Buy Now first returns to the canonical product page. The order page checks a matching browser grant before looking up Stripe and displays no receipt email or payment identifiers.

The same-origin POST download button issues a random, browser-bound, 90-second single-use ticket, stored only as a digest. File delivery conditionally consumes that ticket exactly once, including simultaneous requests. HEAD returns 405. Replaying or copying the URL to another browser is refused.

Every issuance and redemption reconciles current Stripe payment, charge, refunds and disputes under the same transaction-scoped order advisory lock used by webhooks. The ledger update and capability consumption commit together; read reconciliation creates no synthetic webhook events. Full refunds revoke; partial refunds retain access under the existing policy; open/unknown disputes suspend, lost disputes revoke, won disputes restore. Outages and unrecognized financial relationships fail closed.

The encrypted package remains in `private/` and is decrypted only after authorization. Responses are private/no-store and noindex, with attachment headers for files. API/file responses use no-referrer. Order/recovery HTML uses same-origin referrer policy, which sends no Referer outside the store and preserves the Origin required by native same-origin POST forms. A failed file read spends that ticket; the buyer can request another. Files already delivered cannot be retracted, and this is not DRM against an authorized buyer copying the product or exporting browser credentials.

## Email recovery

Customers can use `/recover` without registration, or follow Restore access by email on an order page. They supply the Stripe receipt address. An order URL can locate an older purchase not yet recorded in the ledger. Without a URL, the server privately searches up to ten recently paid, active ledger orders for that address, then verifies current Stripe state. No candidates or lookup results are returned publicly.

The request requires a bounded same-origin POST. The generic redirect is returned before lookup and sending, using Next `after()` to finish the work after the response on Vercel. Known and unknown purchases receive the same response. The only destination is the email freshly verified on the Stripe purchase, never an arbitrary form-supplied destination.

A random 256-bit proof is stored as a hash with the receipt-address hash, browser hash, mode, Session and a 15-minute expiry. It stays unusable until Resend accepts the message. The email link places the proof in a **URL fragment**, which is not transmitted in HTTP requests or referrers. Opening it, including by an email scanner, does not consume it. The customer must press Confirm this browser, causing a same-origin POST with the proof and requesting browser's HttpOnly cookie.

Confirmation takes the order lock, rechecks current payment/refund/dispute state and the current receipt address, conditionally consumes the proof once and renews the browser grant for 30 days. A wrong browser, expired or reused proof, unsent message, changed receipt address, refund, dispute or unavailable Stripe/database cannot bypass those checks. Other legitimate devices keep their own grants.

The Resend adapter uses the documented HTTPS API with timeouts, no redirects, idempotency keys and plain-text messages. Provider bodies, keys, proof tokens and customer details are not logged by application code.

## Free test sender and configuration

The owner provisioned a Resend account and API key directly for testing, because Marketplace provisioning requires an owned sender domain and none is available yet. A real connection-test email was accepted by Resend. This is an actual provider connection, not a console-email fallback.

Resend's `onboarding@resend.dev` sender can send only to the account owner's address. This is enforced before transmission. This version consequently refuses arbitrary customer destinations and live secure delivery. It needs no purchased domain or paid email plan for owner-only tests. Leave paid overages disabled; consult [Resend pricing](https://resend.com/pricing) and its [test sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) before wider activation.

On **the PR2 Preview branch only**, keep the existing matching store/ledger test configuration and set:

- `INKZ_SECURE_DELIVERY=test`
- `INKZ_RECOVERY_EMAIL=test`
- `RESEND_API_KEY` as a server-only Secret
- `INKZ_RECOVERY_TEST_EMAIL` as a private Secret: the Resend account owner address, which must also be used for the Sandbox purchase

The API key and owner address belong in ignored local files and Preview Secrets, never `NEXT_PUBLIC_*`, source, screenshots or chat. Public pages do not reveal the owner address. With missing email configuration, recovery is unavailable and existing delivery behavior is preserved.

Apply committed migrations explicitly with `npm.cmd run db:migrate -- --confirm-host=<test hostname>`. Builds never migrate. Keep Preview databases/keys separate from Production. Existing test webhook ingestion can continue on the same isolated test ledger; separate webhook endpoints require their own signing secrets.

## Historical customers

An old, current-price purchase can recover from its old order URL after proving its receipt email, even without an existing browser grant. For email-only recovery after losing the URL, first reconcile the customer's historical purchase into the ledger.

`npm.cmd run orders:reconcile -- --from=YYYY-MM-DD --to=YYYY-MM-DD` is a **dry run** by default. Dates are UTC, `--to` exclusive, each window at most 31 days. Each run stops after 500 Sessions and reports truncation. Output contains aggregate counts only, no receipt addresses, payment identifiers or credentials. Calls to Stripe are read-only.

After reviewing the dry run and verifying the database host, add `--apply --confirm-host=<hostname>`. Apply reconciles financial snapshots and immutable items; it does not create browser grants or webhook receipts. Repeat safely with narrower windows if truncated, and resolve unrecognized records/errors before cutover. A run with any unresolved records/errors or truncation exits unsuccessfully.

Historical Price IDs must be explicitly approved with repeatable `--legacy-price=price_...` flags (maximum five). They must still match Combat Framework v1.0, quantity one, THB349 before discounts and verified financial relationships. Already-recorded immutable item snapshots work without that import allowlist afterward. This does not silently accept arbitrary historical products, prices, amounts or versions. No live historical backfill has been performed by this work.

## Limits and retention

Persistent hash-keyed PostgreSQL limits supplement the existing checkout limits. Secure checkout: 6 per IP/60 globally per minute. Status: 30/300. Ticket issuance and file delivery: 20/300. Recovery requests: 6 per IP per 15 minutes and 300 globally per minute. Email attempts: 3 per recipient/order per hour, with an application send budget of 80 per 24-hour window. Confirmation: 10 per IP/browser per 15 minutes. Shared IPs can exhaust their allowance. These controls do not replace platform protections; forwarded IPs must be sanitized by the host.

Grants expire at 30 days, file tickets at 90 seconds, proofs at 15 minutes, and counters after their own windows. Expiry indexes support explicit cleanup. `npm.cmd run delivery:prune` is a dry run; add `-- --apply --confirm-host=<test hostname>` to remove expired capability/rate-limit rows. It does not delete orders, adjustments or webhook receipts. No scheduled Production task is installed.

## Verification and live-rollout gates

Automated suites use migrated PGlite and the same cases against disposable pooled PostgreSQL in CI. They cover browser binding, concurrent single redemption, refunds/disputes, expiry, pending payments, outages, email dispatch acceptance, changed addresses, generic HTTP outcomes, old orders and dry-run/approved-price reconciliation. Fixture transports are test data, not real sales or analytics. Desktop/mobile browser tests cover the recovery page, accessibility and closed configuration.

Before calling live rollout ready:

1. Verify a real owner-address Sandbox purchase, new-browser email recovery and the resulting file download on Preview. Also verify expired/replayed links and a refund after sending. Provider acceptance alone is not proof of inbox delivery or full recovery.
2. Verify an owned sender domain, disable authentication-email tracking, scope the sending credential, remove the owner-only restriction through reviewed production configuration and test delivery to a controlled customer inbox.
3. Review all historical price/version mappings and reconcile live historical records without unresolved errors or truncation. Confirm recovery for old customers and different devices.
4. Recheck CI/security review, update delivery/privacy terms, obtain explicit merge and Production/cutover approval, and use separate live secrets/database.

The test-only guard remains intentional. There is no admin dashboard, customer review system or public storefront redesign in this PR.
