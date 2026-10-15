# Stripe Sandbox — Phase III

INKZ remains **pre-launch**. This integration only creates simulated payments. It provides no framework files, downloads, licenses, reservations, live orders, or fulfillment. The existing production purchase control stays disabled. Business/legal/support/refund requirements remain pending in `LAUNCH_CHECKLIST.md`. The planned live USD price is unrelated to this THB test.

## Local setup

Use Node 24 and `npm ci`. Copy `.env.example` to ignored `.env.local`; enter credentials locally through a secure editor or environment settings, never chat, commits, logs, or `NEXT_PUBLIC_` variables.

| Server variable | Value |
| --- | --- |
| `INKZ_STRIPE_SANDBOX` | Exactly `true` to opt in; otherwise closed |
| `STRIPE_SECRET_KEY` | Sandbox `sk_test_…` key from the correct Stripe Sandbox |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` signing secret for this endpoint (CLI and Dashboard secrets differ) |
| `STRIPE_COMBAT_PRICE_ID` | `price_1UQpbi2L1yv98dz3uh9U1TME` |
| `STRIPE_SANDBOX_ORIGIN` | Exact app origin, e.g. `http://localhost:3000`, with no trailing slash/path/query/credentials |

Raw server environment values are required: webhook HMAC verification and the key-prefix safety check run locally. Proxy-only credential placeholders are not a substitute for these bindings. Use secure runtime settings that inject the actual server values; do not print them to diagnose setup.

Remote origins must be HTTPS. HTTP is permitted only for localhost/loopback outside Vercel. `VERCEL_ENV=production` always disables checkout and webhooks, even with the feature flag. `NODE_ENV=production` alone does not block local `next start` or a Vercel Preview. Missing or unsafe configuration returns HTTP 503 and disables the button. No Stripe calls occur at build time.

1. Select the intended **Sandbox** in Stripe Dashboard. Confirm that the product and Price exist in that same Sandbox. Never use live keys.
2. Install/authenticate the official Stripe CLI separately. Run `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook`. Enter the printed CLI signing secret securely as `STRIPE_WEBHOOK_SECRET`; don't share its output.
3. Run `npm run stripe:verify`. This makes a read-only request using the official SDK. It must report the product below, `livemode: false`, `currency: thb`, and `unit_amount: 9900` (99 THB). It also requires active, one-time, per-unit pricing and an active test product. **Do not start a payment test unless this succeeds.** Failures deliberately omit raw Stripe error details.
4. Run `npm run dev` and navigate to `/sandbox/checkout`, also linked from the product's release panel. The page enables the button only after a successful server Price lookup. Every POST verifies it again.

Allow outbound HTTPS to `api.stripe.com`. A browser also needs Stripe-hosted Checkout and its required Stripe assets. Do not disable TLS validation. This phase pins Stripe SDK 23's API contract (`2026-09-30.endive`); configure Dashboard snapshot webhook events to the matching API version. Review Stripe API changes before upgrading the SDK.

## Test record and expected values

- Allowlisted product: `prod_VRj357Xbgw87ig` — INKZ Combat Framework.
- Allowlisted Price: `price_1UQpbi2L1yv98dz3uh9U1TME`.
- Expected amount: **99 THB / 9900 minor units**. An identifier alone is not verification.
- The actual account's Price and hosted Sandbox payment have **not been verified in the development environment**: no Stripe credentials were supplied. Automated tests use synthetic fixtures and mocks, never real charges. Run the read-only verifier first, then complete the manual checklist below.

## Manual Sandbox acceptance

Use fictitious customer information. Never use a real card in Sandbox.

- Verify the Price with `npm run stripe:verify`; retain only its non-secret output as evidence.
- Open the separate **TEST MODE** button. Check the Stripe Sandbox indicator, product, and 99 THB amount on hosted Checkout.
- Successful simulated payment: card `4242 4242 4242 4242`, any future expiry, any three-digit CVC. Confirm Dashboard payment success and a successful signed webhook delivery. Return to `/sandbox/checkout/success`; it must say the URL is informational and unlock nothing.
- Authentication challenge: Stripe test card `4000 0025 0000 3155`. Decline: `4000 0000 0000 9995`. Confirm no paid state for declined/unconfirmed payments.
- Cancel via Stripe's back control. Confirm return to `/sandbox/checkout/cancel`, no state mutation, and no download. Leaving Checkout does not itself expire a Session or prove its payment state.
- Resend the **same actual integration Session event** from Dashboard/CLI; it must return `duplicate: true` in the same running process and not repeat the transition. Another paid event ID for the same Session yields `changed: false`. This endpoint exposes no customer order-status API.
- Bad/missing/stale signatures and modified raw bodies must return 400. Repeated failure responses retry; an unsuccessful handler does not mark an event processed.
- Cards are the only allowed method in this phase. Asynchronous success/failure handling is exercised with signed fixtures and mocked line-item retrieval in automated tests; `stripe trigger` default fixtures lack this integration's metadata/Price and are intentionally ignored. Do not claim end-to-end delayed-method testing from those unrelated fixtures.
- Remove the flag or credentials and restart/redeploy: both API endpoints return 503, the test button is disabled, and the live purchase control remains disabled. Verify Vercel Production also stays closed.

The CLI signs forwarded requests with its own secret. A Dashboard endpoint uses its separately issued signing secret. Do not mix them. No webhook payloads, secrets, customer data, or Stripe error objects are logged by application code.

## Vercel Preview and Dashboard steps

Configure the five variables above for a **dedicated Preview** environment/branch only, then redeploy. Set the exact stable HTTPS Preview origin; don't derive return URLs from an incoming Host header. Use Vercel Deployment Protection or equivalent access restrictions for the tester-facing pages. Protecting the app may require a narrowly scoped webhook protection bypass configured securely with Vercel; verify Stripe can reach the webhook without exposing an unrestricted site. Do not put protection secrets in repository docs or logs. Review provider access logs and access controls.

In the matching Stripe Sandbox, register `https://<verified-preview-origin>/api/stripe/webhook` for the four events above. Select matching snapshot event API version, enter that endpoint's signing secret securely in Preview variables, and redeploy. Dashboard setup, Price verification, opening hosted Checkout, and completing a simulated payment still require owner access. The PR does not create Dashboard resources or deploy manually. Do not merge or deploy live-payment code as part of this phase.

Do **not** add test secrets or opt-in flags to Vercel Production. Production is hard-disabled here. To turn testing off, remove `INKZ_STRIPE_SANDBOX` and redeploy; remove/disable the Sandbox webhook endpoint afterward. No change to this configuration can accept `sk_live_` keys.

## Security and state limitations

`POST /api/sandbox/checkout` takes **no body or purchase parameters**. Origin, URL origin, fetch-site when supplied, and a UUIDv4 idempotency header are validated. Server-fixed return paths are used. Only one allowlisted Price, quantity one, `mode: payment`, and card methods are accepted. Adaptive pricing, automatic tax, and promotion codes are disabled so the expected amount/currency remain fixed. Returned URLs must use `https://checkout.stripe.com`. Client status, prices, product IDs, return paths, and success-page query strings never authorize anything.

The button retains its idempotency UUID across retry attempts during that page visit; Stripe handles duplicate Session requests with that key. Different page visits/keys can create separate Sessions. A per-process limit of 5 requests per IP/minute plus 20 total/minute limits creation (including failed attempts). Forwarded IPs depend on trusted hosting proxies; the global limit applies even when headers are forged. These are **not distributed** abuse controls. Use private Preview access; shared/public testing requires an external shared limiter. Application request bodies are stream-bounded (no checkout body, 128 KB webhook body).

The verified webhook, not a redirect, is authoritative. It rejects live events, checks integration metadata, mode, total/currency, and retrieves Stripe line items to verify the exact active test Price/product/quantity. A completed unpaid Session stays pending. Async success must be paid and complete. Paid is terminal; late failures/expiry/pending events cannot undo it. No database or fulfillment service is invoked.

**Storage is only bounded process memory**: at most 10,000 event IDs and 10,000 Session states, expiring after 24 hours on subsequent activity and lost on restart, redeploy, or eviction of the process. Capacity exhaustion fails closed with 500 for webhook retry. State changes and duplicate checks happen synchronously after asynchronous validation. Within one process, concurrent duplicates and distinct paid event IDs cannot repeat a paid transition. Across workers, cold starts, or after expiry, deduplication is not durable and can repeat. There is no durable audit trail or exactly-once guarantee. Successful webhook responses include `changed`/`duplicate` for testing, not fulfillment authorization. Stripe Dashboard remains the persistent source for investigating simulated payments. Durable transactional event/order storage and distributed rate limits are prerequisites to any future public commerce system.

No paid source, source archives, delivery URLs, accounts, or license issuance are added. A future live-payment/fulfillment system requires a separately reviewed design and every launch prerequisite; enabling this flag cannot enable it.

## Automated verification

```
npm run lint
npm run typecheck
npm run test:server
npm run build
npm run test:e2e
```

Server tests cover gates, exact Price validation, server-only Session parameters, safe redirects, idempotency, request validation, bounded bodies, rate limits, paid/unpaid/async/out-of-order states, capacity, duplicate/concurrent events, and the actual webhook route using Stripe SDK-generated HMAC signatures. They distinguish fixtures from actual Stripe verification. Browser tests verify closed checkout, informational returns, the preserved product button, accessibility, responsive layouts, and existing site behavior. No credentials are needed for CI.
