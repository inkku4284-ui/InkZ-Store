# Phase II.5 — polish review

This refines Phase II at main commit `3e86a3f`; the routes, section sequence, fonts, palette, Fracture plate outlines, and pre-launch safeguards are preserved. The [audit](./AUDIT.md) guided the changes. All screenshots below come from actual local production builds in Chromium with software WebGL 2. They are not mockups or generated artwork.

## Before and after

| Area | Phase II | Phase II.5 |
| --- | --- | --- |
| Hero composition | The headline approaches the artifact frame; supporting copy sits far below it. | Shared columns separate the headline from the frame and align copy directly beneath the artifact. The first viewport explicitly identifies an independent Roblox software label. |
| Artifact | Pale, uniformly lit faces with relatively shallow depth. | Neutral dark machined metal, per-plate roughness, deeper edges, a more directional studio setup, and the same recessed red core. |
| Motion | Long full-travel headline reveals and indefinite idle rendering. | Short, finite entrances, immediately visible supporting copy, time-based pointer damping, predictable neutral return, and a finite settling phase before rendering sleeps. |
| Interaction | Small pause control and inconsistent active/focus treatment. | 44 px pause and diagram controls, high-contrast focus on both dark and bone surfaces, shared navigation feedback, larger footer targets, and native accordion transitions where supported. |
| Product information | Confirmed targets, plans, and unknowns share one table. | Separate confirmed-target, planned-release, and pending-verification groups; a prominent conceptual label; a calmer release-status panel. |

Compare [desktop before](./before-desktop.png) / [after](./desktop-hero.png), [mobile before](./before-mobile.png) / [after](./mobile-hero.png), and [product before](./before-product.png) / [after](./combat-framework.png).

## Rendered evidence

- [Desktop first viewport](./desktop-hero.png)
- [Full desktop homepage](./desktop-homepage.png)
- [Mobile homepage](./mobile-hero.png) and [short 664 px-high viewport](./mobile-short.png)
- [Actual 3D pointer inspection](./artifact-inspection.png)
- [Combat Framework product page](./combat-framework.png) and [mobile product page](./mobile-product.png)
- [Selected diagram with keyboard focus](./diagram-keyboard-focus.png)
- [Reduced-motion SVG version](./reduced-motion.png)
- [Measured render checks](./render-checks.json)

Visual review confirmed clearer headline/object separation, a neutral dark-metal finish, stronger object depth, more readable annotations, and more useful product grouping. The mobile CTA ends at approximately y=656 in a 664 px-high viewport. A vertical touch gesture beginning inside the artifact scrolled the page 129 px; inspection does not trap page scrolling. Normal captures reported zero console or page errors.

## Performance and accessibility

No new dependency or animation framework was added. The WebGL module remains lazy and approximately 138 KiB gzip in this build (141,454 bytes; this is the scene chunk, not total page transfer). There are no external model, font, or HDR requests. Initialization now also waits until the artifact approaches the viewport.

The scene has a finite six-second interval of active settling time, then stops GPU draws until inspection or another relevant event. A test instruments both indexed and non-indexed draws, verifies the count stays unchanged at rest, and confirms pointer exit returns to a pixel-identical neutral view. Frame cadence and DPR limits remain constrained for desktop and touch devices. Offscreen/background suspension, pause/resume, live reduced-motion changes, context-loss fallback, and disposal remain covered.

Server-rendered content and the poster remain available without JavaScript. Supporting copy has no opacity-zero entrance state. Selected controls on bone now have an ink focus outline; controls on void use bone. Native FAQ semantics and keyboard operation remain intact. A reusable, caption-ready product-media component renders nothing until approved real footage is configured; no fabricated footage or blank media panel is displayed.

## Validation

- ESLint: passed, with zero warnings.
- Strict TypeScript: passed.
- Production build: passed; all existing routes remain available. The known local social-image-origin warning occurs when no deployment origin is configured.
- Playwright: **45 passed; one intentional desktop skip** of the mobile-only navigation test.
- Automated WCAG A/AA checks: passed on all eight routes at desktop and mobile sizes.
- Required widths **320, 375, 390, 430, 768, 1024, 1440, 1920**: no document overflow or clipped hero headline in desktop and mobile test projects. The normal-WebGL capture also checked all eight widths.
- JavaScript-disabled content/navigation, renderer rest/wake behavior, exact neutral return, selected keyboard focus, pending product facts, and omitted unprovided media: passed.
- Production dependency audit: zero known vulnerabilities at verification time.

## Files changed

- `src/app/page.tsx`, `home-motion.css`, `globals.css`: composition, type, motion, focus, shared navigation, targets, and disclosure polish.
- `src/components/identity/artifact-scene.ts`, `artifact-poster.tsx`, `hero-artifact.tsx`, `home-motion.tsx`: material/depth/lighting refinement, matching fallback, damping, idle sleep, touch reset, visibility-aware initialization, and shorter editorial reveals.
- `src/app/products/combat-framework/page.tsx`, `src/components/concept-diagram.tsx`: certainty grouping, status hierarchy, and clearer conceptual selection.
- `src/lib/products.ts`, `src/components/product-media.tsx`: optional approved real-media slot, currently unset and omitted.
- `tests/polish.spec.ts`: renderer, no-JavaScript, certainty/focus, and viewport regression coverage.
- `vercel.json`: disables automatic deployment for `feat/inkz-polish` only.
- Root README and this review directory: documentation, audit, measurements, and before/after captures.

## Limits and review-only delivery

These checks use Chromium and touch emulation, not physical-device GPU/battery benchmarks or a full manual screen-reader/cross-browser certification. Accordion height animation uses progressive enhancement; unsupported browsers retain native disclosure behavior. Interactive navigation and inspection require JavaScript, while content, catalog links, the poster, and native FAQ remain server-rendered.

No real gameplay footage has been supplied. Product features and commercial details remain pending, purchasing remains disabled, and no new product guarantees are implied by the identity study.

This pass is **not merged or deployed**. `git.deploymentEnabled` is set to false only for the review branch, following Vercel’s official configuration schema. Main and unrelated branch defaults are unchanged. Review the PR before explicitly approving a preview deployment or merge; this task does not perform either action.
