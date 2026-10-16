# INKZ®

The public website for an independent software label making Roblox development tools. Next.js App Router, strict TypeScript, Tailwind CSS, and self-hosted Space Grotesk, Inter, and IBM Plex Mono. A separately gated Stripe Sandbox integration is included. No live payments, fulfillment, or paid framework source is included.

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

The npm cache is directed to `/tmp/inkz-npm-cache` for the cloud sandbox. No external font request is needed at build time or in the browser. All eleven public content/checkout routes use semantic HTML. Client components provide navigation, catalog search/filtering, reading navigation, homepage identity/motion, the conceptual product diagram and the separately gated Sandbox button. FAQ disclosures use native HTML.

## INKZ V2 — label and motion identity

**INKZ IS LABEL.** Every public route shares one black, chrome, bone-white and restrained deep-red design system in `src/app/globals.css`. The homepage, real-product catalog/search, product evaluation page, documentation workspace, support directory, three policies, three Sandbox states and 404 are rebuilt together. Price, source, support and legal facts remain pending where unverified; the label artwork is explicitly not product footage. No live purchasing or delivery is enabled.

**THE RINGS / FORM 001** is original Blender-authored geometry: a black-chrome core, three independently controlled metal orbital rings, sparse satellites and recessed deep-red details. Three.js `GLTFLoader` loads the actual local GLB, not an image plane. Inspect form opens the ring arrangement; Reset form returns it precisely. The server-rendered poster is a Cycles render of the same `.blend`. The studio reflection map is prefiltered offline, avoiding runtime PMREM capture/blur; shaders prepare asynchronously before the first revealed frame. All geometry, materials, fonts and studio reflections are local; no external asset service is contacted. See [source, measurements and reproduction instructions](./assets/source/README.md).

The poster and editorial content render before the visible, delayed WebGL import. Rendering is capped at 30 fps on fine-pointer devices and 20 fps on coarse-pointer devices, with pixel-ratio limits of 1.5 and 1.25. After a finite 4.8-second settling phase, GPU draws stop until pointer interaction, inspection or another relevant event. Rendering suspends offscreen and in background tabs; Pause/Resume controls movement. Reduced-motion and Save-Data keep the poster without transferring the model or initializing WebGL. Context loss, load failure, live reduced-motion changes and teardown restore the poster and dispose resources. Touch scrolling and native keyboard controls remain available.

Arrival uses finite typography choreography, with no animated background or continuous decorative loop. Critical content and links work without JavaScript. Motion controls, catalog searches and diagram selections stay in memory only. The keyboard-accessible product diagram explains conceptual stages without claiming verified product functionality.

The requested `design/references/` images, including `inkz-rings-main.png`, are missing from this checkout/workspace. That was reported before implementation. The original model interprets the written brief and visible task composite; exact comparison and owner approval against the unavailable primary image remain outstanding. Do not describe it as an approved exact reconstruction.

See [V2 rendered evidence and verification](./docs/visual-review/v2/README.md) and the [route/source audit](./docs/INKZ_V2_AUDIT.md). Historical [Phase II](./docs/visual-review/README.md), [Phase II.5](./docs/visual-review/phase-2-5/README.md), and [earlier rework](./docs/visual-review/rework/README.md) documents describe previous versions, not the current identity.

For future approved product footage, configure `media` in `src/lib/products.ts` with genuine public footage and captions. Currently the product page explicitly shows that no approved footage is available. Never publish paid framework source or archives as media.

## Browser checks

Build first and leave port 3000 free. Tests start their own production server so a development or stale server cannot satisfy the checks. The suite covers all routes at desktop/mobile sizes, WCAG A/AA automated checks, keyboard navigation, FAQ behavior, internal links and anchors, disabled purchasing, network requests, tracking storage, social images, and the 404 page. Motion tests exercise real WebGL, pause/resume, offscreen suspension, live reduced-motion changes, unsupported WebGL, context loss, and the conceptual diagram. Headless Chromium uses a software WebGL backend in the test runner; these checks are not device performance benchmarks. Automated checks complement manual review; they are not a certification of accessibility.

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
5. Complete the launch checklist before Stripe submission. Keep live checkout disabled until every commercial, product, payment, and delivery requirement is verified; Sandbox testing is separately gated.

No deployment is performed by this repository’s setup. A working public site does not establish Stripe approval. Vercel preview deployment and publication are separate from a local production build.

## Future payments

The purchase state is intentionally disabled in code. A product or a visible price alone must never enable purchasing. A separate implementation must establish:

1. Server-side price lookup and Stripe Checkout Session creation. Client input must not determine trusted prices or product entitlements.
2. Signature-verified webhook processing using the raw request body, durable event deduplication, and explicit handling of payment, refund, and dispute states.
3. Durable order/license records and fulfillment only after a verified successful payment event. A success-page redirect is not proof of payment.
4. Private artifact storage, authenticated or expiring download links, authorization checks, and an auditable delivery process. Never expose paid source in `public/` or this repository.
5. Tests for invalid signatures, duplicated/out-of-order events, failed payments, unauthorized access, expired links, and refunds.

Keep Stripe secret keys and webhook secrets in secure server-side deployment settings only. Use Sandbox credentials only for the optional test workflow; never configure live credentials in this phase. Verify age/country requirements and authorized adult involvement before live onboarding or acceptance of funds.

## Stripe Sandbox (Phase III)

See [STRIPE_SANDBOX.md](./STRIPE_SANDBOX.md) for secure environment setup, Price verification, test cards, webhook forwarding, Vercel Preview configuration, and storage limitations. `/sandbox/checkout` is clearly labelled TEST MODE; the production purchase button remains disabled. Run `npm run test:server` for payment security checks.
