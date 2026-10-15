# INKZ®

The public website for an independent software label making Roblox development tools. Next.js App Router, strict TypeScript, Tailwind CSS, and self-hosted Space Grotesk, Inter, and IBM Plex Mono. No payment infrastructure or paid framework source is included.

## Development

Use Node.js 24 LTS (Node 22 is also supported) and npm. Work in this existing checkout; cloud tasks are already isolated, so a Git worktree is unnecessary unless explicitly requested.

```sh
npm ci
npm run dev
```

The dev server uses port 3000. Stop it before starting the production server on the same port.

```sh
npm run lint
npm run typecheck
npm run build
npm run start
```

The npm cache is directed to `/tmp/inkz-npm-cache` for the cloud sandbox. No external font request is needed at build time or in the browser. All eight required content routes are rendered with semantic HTML. Only navigation needs a client component; FAQ disclosures use native HTML.

## Browser checks

Build first. Tests start a production server automatically if one is not running. The suite covers all routes at desktop/mobile sizes, WCAG A/AA automated checks, keyboard navigation, FAQ behavior, internal links and anchors, disabled purchasing, network requests, tracking storage, social images, and the 404 page. Automated checks complement manual review; they are not a certification of accessibility.

```sh
# Uses /usr/bin/chromium automatically in this cloud environment.
# Else install Playwright's Chromium (and its OS dependencies if needed):
npx playwright install --with-deps chromium
npm run test:e2e
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to select another Chromium binary. CI uses Playwright’s managed Chromium. No credentials are needed for development or these tests.

## Content and launch status

- `src/lib/site.ts`: public business configuration, navigation, and owner checklist. Unconfirmed facts are `null` and visibly identified as pending. Never put private personal information or secrets here.
- `src/lib/products.ts`: typed product collection. There is one pre-launch product; its price is unconfirmed. Add future products only with verified information and matching routes.
- `src/app/`: homepage, catalog, Combat Framework, documentation, contact, terms, refunds, and privacy.
- `src/components/system-diagram.tsx`: original conceptual diagram, explicitly not a verified product architecture.

**Not ready for Stripe submission or live sales.** See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md). There is no contact form, email placeholder, fake checkout, invented API, analytics, or sales claim. Update the policies whenever actual business practices or data processing change.

Confirmed owner information: business country Thailand; business type Independent Software Label / Digital Software Products. Combat Framework pricing is planned in USD, with no confirmed amount. Secure digital download after verified payment is planned and not implemented. Legal operator confirmation with the owner and parent/guardian, a verified support email, license rights, and refund terms remain pending.

## Deploy to Vercel

1. Push this project to GitHub, then import the repository into Vercel as a Next.js project. The project root is this directory, with `npm ci` and `npm run build`; use Node.js 24.
2. Configure the real public HTTPS origin as `NEXT_PUBLIC_SITE_URL` in Vercel’s environment settings and redeploy. The value must be an origin, e.g. your verified domain with no path, query, or credentials. Never commit secret values. When the variable is omitted, Vercel’s `VERCEL_PROJECT_PRODUCTION_URL` is used if present.
3. Verify the public deployment: all routes, navigation, policy links, HTTPS, mobile layout, `/opengraph-image`, `/robots.txt`, and `/sitemap.xml`. Canonical and sitemap URLs are emitted only when a public origin is configured; local builds without an origin have no canonical URL and may warn about the social-image base URL.
4. Review provider logs, data retention, recipients, and privacy disclosures for the actual hosting configuration. The app includes no analytics or tracking cookies; do not assume that describes infrastructure logging.
5. Complete the launch checklist before Stripe submission. Keep checkout disabled until every commercial, product, payment, and delivery requirement is verified.

No deployment is performed by this repository’s setup. A working public site does not establish Stripe approval. Vercel preview deployment and publication are separate from a local production build.

## Future payments

The purchase state is intentionally disabled in code. A product or a visible price alone must never enable purchasing. A separate implementation must establish:

1. Server-side price lookup and Stripe Checkout Session creation. Client input must not determine trusted prices or product entitlements.
2. Signature-verified webhook processing using the raw request body, durable event deduplication, and explicit handling of payment, refund, and dispute states.
3. Durable order/license records and fulfillment only after a verified successful payment event. A success-page redirect is not proof of payment.
4. Private artifact storage, authenticated or expiring download links, authorization checks, and an auditable delivery process. Never expose paid source in `public/` or this repository.
5. Tests for invalid signatures, duplicated/out-of-order events, failed payments, unauthorized access, expired links, and refunds.

Keep Stripe secret keys and webhook secrets in secure server-side deployment settings only. Do not add payment secrets now; no current workflow needs them. Verify age/country requirements and authorized adult involvement before live onboarding or acceptance of funds.
