# Phase II — rendered motion identity review

These are actual Chromium captures of the local **production build**, not mockups or generated illustrations. Capture date: 15 October 2026. Chromium used its software WebGL 2 backend in the cloud environment; this validates geometry and behavior, not physical-device GPU performance. A deployed Phase II build is a separate check.

## Visual evidence

- [Desktop hero, 1440 × 1000](./desktop-hero.png): live WebGL rendering, with studio-lit metal plates and recessed red core.
- [Pointer inspection](./desktop-inspection.png): the same geometry after a restrained change in viewing angle.
- [Mobile hero, 390 × 844](./mobile-hero.png): real WebGL, touch layout, and visible catalog navigation.
- [Short mobile viewport, 390 × 664](./mobile-short-viewport.png): the primary CTA remains within the first viewport.
- [Reduced motion](./reduced-motion.png): the SVG poster shares the sculpture’s plate outlines; no WebGL is initialized.
- [Full homepage](./desktop-homepage.png): the existing editorial sequence and section layout are retained.
- [Conceptual diagram selection](./concept-diagram.png): keyboard-operable stages and an explicit conceptual-only explanation.
- [Live hero recording](./hero-motion.mp4): arrival, pointer inspection, pause/resume, and scrolling in the real browser. The recording is 15.6 seconds; it is not a rendered animation asset used by the site.

## Verification

- `npm run lint`, `npm run typecheck`, and `npm run build`: passed.
- `npm run test:e2e`: 37 passed; one intentional desktop skip of the mobile-only navigation test.
- Automated WCAG A/AA checks passed on all eight routes at desktop and mobile sizes.
- Motion coverage includes actual WebGL context creation, pause/resume, offscreen suspension, reduced motion on initial load and live changes, unsupported WebGL, context loss, and keyboard diagram selection.
- Desktop DPR 2 was capped to a 1.5 canvas pixel ratio. Mobile DPR 3 was capped to a 1.0 canvas pixel ratio.
- Paused canvas screenshots taken 350 ms apart were pixel-identical. Offscreen mode reported rendering suspended. Normal capture produced no page errors.
- Additional homepage and product-layout checks at widths 320, 360, 768, 1024, and 1920 found no horizontal overflow. The full test suite also covers 390 and 1440.
- The WebGL module is a separate lazy chunk: approximately 138 KiB gzip in this build. It is not required to render the headline, links, or static poster.
- Production dependency audit: zero known vulnerabilities at verification time.

Purchasing remains disabled. The 3D identity study and conceptual diagram do not demonstrate verified Combat Framework functionality or change the pending business, support, licensing, pricing, or delivery status.

## Deployment

No new service, secret, or environment variable is needed. Build normally with `npm ci` and `npm run build`. The existing Vercel Git integration can build the branch/PR preview; merge the reviewed PR to deploy the updated `main` branch. Existing production-origin configuration still applies. Verify the live hero and fallback behavior on the resulting deployment before claiming public deployment success.
