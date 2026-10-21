# Commerce ledger — PR 1

This is an opt-in **shadow ledger** for the existing Combat Framework checkout. It records payments and derives refund/dispute-aware entitlement state. It does **not** change `/api/checkout`, `/download`, or `/api/download`. The current reusable-session download behavior remains until PR 2 introduces buyer authorization and switches delivery to the ledger. Do not describe this PR alone as securing delivery.

## Architecture

- Neon PostgreSQL, using Drizzle and `pg` over verified TLS. TCP supports interactive transactions and transaction-scoped advisory locks on the default Node.js runtime. Use the Neon pooled application URL with `sslmode=verify-full`; use an appropriate migration connection for schema operations.
- Six tables: orders, one immutable item snapshot per order (the existing one-product/quantity-one checkout), refunds, disputes, entitlements, and minimal webhook receipts.
- Amounts are integer THB minor units, from Stripe's actual collected/discounted amounts. Refunds and disputes remain separate; they are not subtracted twice.
- Paid timestamps come from the charge's balance transaction, not its earlier creation timestamp. Stripe credentials need read access to Checkout Sessions/line items, PaymentIntents, Charges (including balance transactions), Refunds, and Disputes. A temporarily unavailable balance transaction causes a retry instead of an invented payment date.
- A receipt, current payment snapshot, adjustments, and derived entitlement commit in one transaction. Stripe/API/SQL failures roll everything back, including the receipt, and return HTTP 500 so Stripe retries.
- Duplicate event IDs are deduplicated transactionally. Different events for the same Session acquire the same PostgreSQL advisory lock **before** fetching current Stripe state. The embedded event's stale payment status and timestamp never decide entitlement state.
- No complete webhook payload or payment-method details are persisted. Receipt email and payment references are private server-side records. There is no public order/ledger read endpoint.
- The database pool is initialized lazily. `next build` neither requires a database nor runs migrations. Existing checkout/delivery continues without ledger configuration.
- The existing package reader now scopes its filesystem trace to `private/`, preserving the same encrypted file and decryption behavior while avoiding a whole-project function bundle after adding database test tools.

## Activation: test environment first

No cloud database, Stripe endpoint, secret, or Production deployment has been provisioned by this change. Those operational actions remain separate from code review.

1. Create an isolated Neon test database through the Vercel Marketplace. Keep its credentials separate from Production. The automated tests use embedded PostgreSQL locally and a disposable PostgreSQL 17 service in CI; neither needs cloud credentials.
2. Configure `INKZ_ORDER_LEDGER=test`, a **test** Stripe API key, `STRIPE_COMBAT_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and the test `DATABASE_URL`. See `.env.example`. The ledger needs no product decryption key.
3. Generate/review migrations offline with `npm run db:generate`. Apply the committed migration explicitly with `npm run db:migrate -- --confirm-host=<verified-database-hostname>`. The command reads `.env.local` if present; it does not print credentials or driver exceptions. Never make it part of a deployment build.
4. Register or locally forward a **test** Stripe webhook to `/api/stripe/webhook` using the event list below. Match the endpoint's snapshot API version to the installed Stripe SDK's API version. The handler uses the SDK to verify the original bytes and a five-minute timestamp tolerance.
5. Exercise pending/successful/failed PromptPay, card payment, duplicate delivery, discounts, refunds, and disputes. Reconcile the private database records against Stripe before approving live activation.

Default/unset mode is closed (503). Test mode is rejected on Vercel Production. Live ledger mode requires a live key and `VERCEL_ENV=production`; it must be separately approved and configured with a distinct live database and signing secret. The ledger does not read `INKZ_SALES`, so it can be evaluated independently of the storefront sales switch.

## Event subscriptions

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
charge.refunded
refund.created
refund.updated
refund.failed
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
charge.dispute.funds_withdrawn
charge.dispute.funds_reinstated
```

Other event types return 200 without processing. Wrong-mode and Connect-account events return 400. Invalid signatures return 400; bodies over 1 MiB return 413, including streamed requests without Content-Length. Processing failures return 500 with generic messages; no SDK/database error is returned or logged.

## Entitlement policy

| Current verified state | Ledger entitlement |
| --- | --- |
| Unpaid, delayed, failed, expired, or no-payment-required | Inactive |
| Complete paid Session + succeeded PaymentIntent + fully captured charge | Active |
| Successful partial refund | Active, reason `partially_refunded` |
| Successful full refund | Revoked |
| Open dispute or an unknown future dispute status | Suspended |
| Lost dispute | Revoked |
| Won dispute or closed/prevented inquiry | Active unless a refund independently revokes it |

The current checkout is THB, one known price, quantity one, no tax/shipping, with optional discounts. Unexpected product/price purchases are ignored. Invalid relationships on an owned order cause a retriable failure. Historical recorded item prices are reused when the active price changes. An unrecorded historical price/version needs a reviewed catalog/backfill change; it is never automatically trusted. Zero-charge orders remain inactive, matching the existing delivery rule that requires a paid Session.

## Reconciliation and cutover plan

This PR receives webhook history **from activation onward**. It does not import previous sales, create orders before checkout, send customer emails, issue guest tokens, or enforce the derived entitlement at download time.

Before PR 2 switches authorization:

1. Build an operator-only backfill/reconciliation command that calls the same snapshot verification and transaction path, using its own run identifiers rather than deleting webhook receipts.
2. Dry-run against all historical InkZ Sessions, explicitly mapping approved historical prices/versions. Include refunded and disputed purchases, not just successful charges.
3. Compare order counts, actual captured amounts, refunds, and dispute outcomes against Stripe. Never infer sales by multiplying the current list price.
4. Replay missed events before Stripe's delivery retry window expires; use reconciliation for older gaps. Replaying a previously committed event is intentionally a no-op, including ignored events.
5. Verify database restore/recovery, guest access recovery, and old `/download?session_id=...` URLs before cutover. Unknown credentials must not unlock files.

Until that cutover, new ledger state is observational only. Disabling the ledger mode stops ingestion without affecting current checkout/delivery; do not drop ledger tables as a rollback. A refund cannot retrieve files already downloaded.

## Tests and operating costs

`npm run test:server` applies the actual committed migrations to PGlite (embedded PostgreSQL) and tests real SQL transactions/constraints. CI reruns the same integration cases against a pooled PostgreSQL service, including concurrent deliveries. Set `INKZ_LEDGER_TEST_DATABASE_URL` to a disposable **localhost** database to run that second suite locally; the suite truncates its own commerce tables and refuses remote hosts.

Stripe HTTP responses and signatures use explicit test fixtures. No test reads live Stripe credentials or sends real charges/refunds. Existing store regression tests still run. For observability, monitor non-2xx webhook deliveries and the generic ledger error signal through private provider tooling; never log event bodies, connection URLs, signing secrets, customer emails, or raw SDK errors.

Planning estimate: Neon Launch approximately USD 5–15/month at low volume, subject to actual compute/storage/restore usage. This PR adds no paid service automatically. Database role isolation, backup/restore policy, retention, and privacy disclosures must be finalized before live ingestion. Keep payment records only for documented business/retention needs; never publish the tables or database credentials to the browser.
