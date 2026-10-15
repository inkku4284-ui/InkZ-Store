# Phase III rendered evidence

Captured from the actual local Next.js production build on 15 October 2026 using Chromium, self-hosted fonts, and reduced motion. These are application screenshots, not design mockups. Stripe credentials were absent: no hosted Checkout or simulated payment is shown or claimed. `render-checks.json` records response codes, viewports, overflow checks, and disabled controls.

- [Desktop Sandbox](./desktop-sandbox.png) — 1440 × 1000 viewport, full page; TEST MODE, expected/unverified amount, unavailable button.
- [Mobile Sandbox](./mobile-sandbox.png) — 390 × 844 viewport; same closed state.
- [Informational return](./checkout-return.png) — even a forged `payment_status=paid` query unlocks nothing.
- [Cancellation](./checkout-cancel.png) — 390 × 844 viewport, no order mutation.
- [Pre-launch product](./product-prelaunch.png) — original production purchase control remains disabled; separate Sandbox link.

All five rendered checks returned 200 with no horizontal overflow. Automated browser checks also cover accessibility on the three Sandbox routes at desktop and mobile sizes.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:server`: 45 passed, including actual route HMAC validation with synthetic Stripe-signed fixtures.
- `npm run build`: passed; no credentials or Stripe calls needed. The local metadata-base warning is expected without a public deployment origin.
- `npm run test:e2e -- --workers=1`: 55 passed, one intentional desktop skip for a mobile-only test. An earlier two-worker run passed all new Sandbox checks but hit the existing desktop software-WebGL settling timeout. The unchanged GPU test passed on the serial rerun; no assertions or homepage code were weakened.
- `npm run stripe:verify`: deliberately failed closed with “Sandbox configuration incomplete or unsafe”; no request sent. Actual account Price verification, hosted Sandbox Checkout, simulated payment, Dashboard delivery/resend, and deployed cancellation remain manual prerequisites in [STRIPE_SANDBOX.md](../../../STRIPE_SANDBOX.md).

Memory-only test state/deduplication is neither durable nor coordinated across workers. There is no framework fulfillment or download.
