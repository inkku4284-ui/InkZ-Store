# INKZ®

## Commerce ledger foundation

An opt-in PostgreSQL order ledger and signed Stripe webhook handler are now available. They run in shadow mode and do not change the existing checkout or download authorization. See [setup, event subscriptions, tests, limitations, and staged cutover](./docs/COMMERCE_LEDGER.md). Hosted provisioning and live activation require separate approval; builds never apply database migrations.

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
- `src/lib/products.ts`: typed product collection. One product: Combat Framework (349 THB). Add future products only with verified information and matching routes.
- `src/app/`: homepage, catalog, Combat Framework, documentation, contact, terms, refunds, and privacy.
- `src/components/system-diagram.tsx`: original conceptual diagram, explicitly not a verified product architecture.

**Sales: test mode first.** Checkout + instant download are implemented (see "Store" below); live sales open when the owner completes [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) and sets `INKZ_SALES=live` with live keys, then flips `business.launched` in `src/lib/site.ts`.

Confirmed owner information: business country Thailand; business type Independent Software Label / Digital Software Products. Combat Framework: 349 THB one-time, instant .rbxm download, support on Discord (inkz_xko). License, refund and delivery terms are published in `src/lib/site.ts` (owner to confirm before live sales).

## Deploy to Vercel

1. Push this project to GitHub, then import the repository into Vercel as a Next.js project. The project root is this directory, with `npm ci` and `npm run build`; use Node.js 24.
2. Configure the real public HTTPS origin as `NEXT_PUBLIC_SITE_URL` in Vercel’s environment settings and redeploy. The value must be an origin, e.g. your verified domain with no path, query, or credentials. Never commit secret values. When the variable is omitted, Vercel’s `VERCEL_PROJECT_PRODUCTION_URL` is used if present.
3. Verify the public deployment: all routes, navigation, policy links, HTTPS, mobile layout, `/opengraph-image`, `/robots.txt`, and `/sitemap.xml`. Canonical and sitemap URLs are emitted only when a public origin is configured; local builds without an origin have no canonical URL and may warn about the social-image base URL.
4. Review provider logs, data retention, recipients, and privacy disclosures for the actual hosting configuration. The app includes no analytics or tracking cookies; do not assume that describes infrastructure logging.
5. Complete the launch checklist before Stripe submission. Keep live checkout disabled until every commercial, product, payment, and delivery requirement is verified; Sandbox testing is separately gated.

No deployment is performed by this repository’s setup. A working public site does not establish Stripe approval. Vercel preview deployment and publication are separate from a local production build.

## Store: Stripe checkout + instant download

How a sale works:

1. `/products/combat-framework` → **Buy** → `POST /api/checkout` (same-origin, idempotency UUID, no body). The server checks the Stripe Price is exactly the advertised one (`COMBAT_SALE` in `src/lib/store/config.ts`: 349 THB, one-time, active) and opens Stripe-hosted Checkout. Payment methods come from the Stripe Dashboard (card, PromptPay, Apple Pay).
2. Stripe returns the buyer to `/download?session_id={CHECKOUT_SESSION_ID}`. That page asks **Stripe** whether the session is complete + paid, for this Price, in this mode. Query strings prove nothing; PromptPay that isn't confirmed yet shows a "confirming" state.
3. `GET /api/download?session_id=…` re-checks the same thing and streams the file, decrypted on the fly from `private/combat-framework.rbxm.enc` (AES-256-GCM; the repo is public, the key lives only in `COMBAT_FILE_KEY`). The order page address is the buyer's download link.

No database, no webhook: Stripe is the order record. Rate limits are per process (best effort).

### Environment (Vercel → Settings → Environment Variables)

| Variable | Preview (test) | Production (live) |
| --- | --- | --- |
| `INKZ_SALES` | `test` | `live` (only when launching) |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `rk_test_…` | `sk_live_…` / `rk_live_…` |
| `STRIPE_COMBAT_PRICE_ID` | `price_1UT60N2L1yv98dz3gj1uOuiG` | the live 349 THB Price |
| `COMBAT_FILE_KEY` | the key from `scripts/encrypt-product.mjs` | same |

Test mode is refused on Vercel Production, and test keys are refused in live mode. Without all variables the store is closed and the button reads "Launching soon". Mark keys as Sensitive.

### Ship a new version of the product

```
COMBAT_FILE_KEY=<key> node scripts/encrypt-product.mjs path/to/INKZ_CombatFramework.rbxm
git add private/combat-framework.rbxm.enc && git commit -m "Combat Framework vX.Y"
```

Update `COMBAT_SALE.version` too. Changing the price: create a new Price in Stripe, set `STRIPE_COMBAT_PRICE_ID`, and update `COMBAT_SALE.amount` and `combat.price`.

### Test a purchase (Preview deployment, Stripe test mode)

Open the Preview URL (Vercel Authentication keeps it private) → Buy → card `4242 4242 4242 4242`, any future date, any CVC → you land on `/download` → download → install. Decline test: `4000 0000 0000 9995`.
