# INKZ V2 — complete label rework review

Review date: 16 October 2026 (Asia/Bangkok). Branch: `rework/inkz-label-v2`. These are actual Chromium captures of the local Next.js production build, not generated mockups. The standalone images use the exported GLB in a separate Three.js viewer. Historical green captures remain in the preceding review directories for comparison.

## Review the website

The design system, shared navigation/footer and all eleven public routes are rebuilt around one real pre-launch software product. Product discovery includes real-data category/search and an honest empty state. Product evaluation separates confirmed targets, planned release and pending verification. Documentation has a reading workspace; support routes to existing information without an invented email or form. Policies preserve the actual pending business details. Sandbox pages remain isolated, explicitly TEST MODE, and fail closed.

| Surface | Desktop / 1440 × 1000 | Mobile / 390 × 844 |
| --- | --- | --- |
| Homepage | [Hero](./desktop-hero.png) · [Full page](./desktop-home.png) | [Hero](./mobile-hero.png) · [Full page](./mobile-home.png) |
| Products | [Catalog](./desktop-products.png) | [Catalog](./mobile-products.png) |
| Combat Framework | [Product record](./desktop-product.png) | [Product record](./mobile-product.png) |
| Documentation | [Reading workspace](./desktop-docs.png) | [Reading workspace](./mobile-docs.png) |
| Contact/support | [Support directory](./desktop-contact.png) | [Support directory](./mobile-contact.png) |
| Terms | [Terms](./desktop-terms.png) | [Terms](./mobile-terms.png) |
| Refunds | [Refund policy](./desktop-refunds.png) | [Refund policy](./mobile-refunds.png) |
| Privacy | [Privacy policy](./desktop-privacy.png) | [Privacy policy](./mobile-privacy.png) |
| Sandbox | [Disabled test checkout](./desktop-sandbox.png) | [Disabled test checkout](./mobile-sandbox.png) |
| Checkout return | [Informational return](./desktop-success.png) | [Informational return](./mobile-success.png) |
| Checkout cancellation | [Cancellation](./desktop-cancel.png) | [Cancellation](./mobile-cancel.png) |
| Unknown route | [Actual 404](./desktop-404.png) | [Actual 404](./mobile-404.png) |
| Empty search | [Clear-selection recovery](./desktop-empty.png) | [Clear-selection recovery](./mobile-empty.png) |

Additional review: [mobile menu](./mobile-menu.png), [320px](./home-320.png), [768px](./home-768.png), [1280px](./home-1280.png), [reduced motion](./mobile-reduced-motion.png), [failed-model poster](./model-unavailable.png), [independent GLB inspection](./standalone-model.png), [actual wireframe](./standalone-wireframe.png).

Motion evidence: [actual browser recording](./motion-review.mp4) and [opened ring arrangement](./rings-inspected.png). This is Chromium software WebGL, not a synthetic animation or a device-speed benchmark.

The new generic error boundary and scoped Sandbox loading state use the same components and tokens. No deliberate production error or payment operation was introduced to manufacture those states. The 404 retains an actual HTTP 404; a root loading boundary was avoided because it can convert streamed missing routes into a soft 404.

## Real geometry and motion

See [Blender source and reproducible export](../../../assets/source/README.md). The file is actual glTF 2.0 geometry: **588,224 bytes, 32,304 triangles, 15 meshes, zero textures**. Three named orbital ring meshes have independent transform axes/phases and inspection positions around a black-chrome core. The accent channels are real geometry. The original INKZ mark is geometric mesh strokes. A separate 113,171-byte local gzip studio texture is prefiltered offline, avoiding runtime PMREM capture/blur; model shaders prepare with `compileAsync` before the first revealed frame. The poster is rendered from that same `.blend` and is not used as a 3D image plane. Source ownership/export limitations are documented with the model.

Poster-first, visible-only lazy import; no external model/HDR/texture service. Renderer caps: 30 fps/DPR 1.5 desktop, 20 fps/DPR 1.25 coarse pointer. Finite 4.8-second active settling then zero draws at rest. Explicit keyboard/touch Inspect/Reset and Pause/Resume, clamped damped pointer interaction, offscreen/background suspension, reduced-motion/Save-Data static rendering, abortable model loading, and complete teardown. Tests compare real canvas images to confirm an exact neutral reset and no duplicated canvases after navigation.

## Reproduce visual review

```sh
npm ci
npm run build
npm run start -- --port 3110
# Separate terminal:
node scripts/view-rings.mjs
# Separate terminal:
node scripts/capture-v2.mjs
# For video, install Playwright FFmpeg and provide the system ffmpeg command:
npx playwright install ffmpeg
node scripts/record-v2.mjs
```

The capture helper uses system Chromium when available; otherwise install Playwright Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `INKZ_REVIEW_ORIGIN` can select a different locally reviewed build. The independent viewer binds only to localhost on port 3112 and is not deployed as an app route. Capture data: [render-review.json](./render-review.json).

## Verification

- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed.
- `npm run build` — passed; all expected public/API/metadata routes retained.
- `npm run test:server` — **45 passed**. No payment implementation was changed.
- `npm run test:e2e -- --workers=1` — **71 passed, 1 intentional skip** (desktop instance of the mobile-only navigation test), no failures. The first pass found a conceptual-diagram contrast regression on both viewports; the shared reading-style selector was corrected and the full suite reran successfully. No assertion was removed or disabled. After the final native-link label correction, all 18 content-route/empty-state accessibility checks passed again. WCAG 2.1 A coverage was added; the expanded Sandbox accessibility suite also passed separately (10 checks).
- `node scripts/check-rings.mjs` — actual independent GLTFLoader parse, required named Mesh objects, valid GLB header and geometry/file budgets passed.
- WCAG A/AA Axe checks passed across all eight content routes and all three Sandbox routes on desktop and mobile, plus the catalog empty-result state. Native keyboard/skip-link/mobile-menu, real-WebGL pause/inspect/reset, exact image neutrality, zero rest draws, context loss, failed transfer, live reduced motion, no-JavaScript critical navigation, teardown, no external requests/tracking storage and truthful purchase/media states are covered.
- Additional capture matrix: **72 route/width observations** (12 routes including 404 × 320/375/390/768/1280/1440), plus desktop/mobile screenshots. No horizontal overflow or page errors. The existing automated matrix also includes 430/1024/1920.
- `git diff --exit-code 6a8da99 -- src/app/api src/lib/stripe src/lib/products.ts` — unchanged. `src/lib/site.ts` changes only the navigation labels; `paymentsEnabled: false` and all business fields remain unchanged.
- `npm run stripe:verify` — **not verified**: safe configuration missing, exited without sending a request. No credentials are required to review the frontend.

## Performance observations

[All six Lighthouse observations](./performance-summary.json) are retained, including the initial regressions and run-to-run variation. Lighthouse 13.5.0 ran against the local production server with system Chromium/SwiftShader, `--throttling-method=provided` (unthrottled), desktop preset or mobile emulation. Runs were sequential and separate from regression/capture work. These are development observations, not field Core Web Vitals or physical-device benchmarks.

| Observation | Performance | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| Initial desktop / runtime PMREM | 67 | 0.9 s | 1,676 ms | 0.001 |
| Initial mobile / runtime PMREM | 77 | 1.0 s | 1,146 ms | 0.001 |
| Prefiltered studio desktop | 86 | 0.4 s | 337 ms | 0.001 |
| Prefiltered studio mobile | 100 | 0.4 s | 32 ms | 0.001 |
| Final native-label desktop | 70 | 0.9 s | 940 ms | 0.001 |
| Final native-label mobile | 94 | 1.0 s | 291 ms | 0.001 |

Accessibility, Best Practices and SEO category scores were 100 in these runs. The unweighted visible-label diagnostic still found an artwork-link issue initially; native link text was corrected and **the final diagnostic passes on both viewports**. No score or test exception was used to hide it. Source-map diagnostics are informational; public production source maps were not enabled.

The studio bake removes synchronous capture/blur from customer devices and adds a 113 KB compressed local reflection asset. Final total transfer is about 0.9 MB including the GLB, fonts, JavaScript, poster and prefetched resources; exact measurements are in JSON. GPU compilation remains a notable cold-start cost on SwiftShader: post-optimization desktop observations range 337–940 ms TBT and mobile 32–291 ms. No universal “100 performance” or hardware/frame-rate claim is made. Hardware-device profiling remains an owner-review item. The model stays within geometry/transfer budgets, reduced motion/Save-Data skip 3D, and automated instrumentation verifies zero GPU draws at rest.

To reproduce each observation (run with the production server on 3110 and no competing browser work):

```sh
CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@13.5.0 http://127.0.0.1:3110 \
  --preset=desktop --throttling-method=provided \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage --use-angle=swiftshader --enable-unsafe-swiftshader' \
  --output=json --output-path=/tmp/inkz-lighthouse-desktop.json
# Omit --preset=desktop for mobile emulation. Retain every result; do not select only the fastest run.
```

## Known limitations and release boundaries

- **Missing primary references:** `design/references/` and `inkz-rings-main.png` are absent. This was reported before visual implementation. The written brief and visible task composite guided the original interpretation. Exact comparison/approval against the named primary image remains blocked; the asset is not claimed as an exact approved reconstruction.
- Blender 4.3.2 is available, but its packaged build has no OpenImageDenoise. The matching poster uses 192 actual Cycles samples, without a claim of denoising.
- Real gameplay footage, source/API verification, production price, license, refund terms, operator and support contact remain pending. Label artwork is explicitly not a product demonstration. No paid framework source is included.
- Stripe Sandbox configuration is absent locally. `npm run stripe:verify` exits safely without sending a request. No actual Dashboard Price lookup, hosted card payment or webhook forwarding is claimed in this rework. Existing manual steps and volatile-storage limitations remain in [STRIPE_SANDBOX.md](../../../STRIPE_SANDBOX.md).
- `paymentsEnabled: false`; product data, API routes and payment/security implementation are unchanged from baseline `6a8da99`. No real money, delivery, download, account, live order or license is enabled. Return URLs remain informational.
- Automated accessibility and software-WebGL measurements supplement human/device review. They are not a certification or a real-phone GPU benchmark. Owner visual review and physical-device testing remain appropriate before approval.
- Local builds without a configured public origin produce the expected metadataBase warning. Canonicals/sitemap still require the real configured origin; no fake production domain was added.
- No merge or Production deployment is performed. Draft PR #5 is the review surface.
