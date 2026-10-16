# INKZ — visual and motion rework

A full visual rework on top of the merged Stripe Sandbox integration, keeping INKZ pre-launch. This review uses actual rendered production builds, not mockups or generated artwork. Earlier Phase II/II.5 captures remain historical comparisons.

## What changed

- A bone/charcoal/acid-green identity with larger editorial typography, a balanced split hero, collection showcase, brand manifesto, process, engineering notes, and quieter FAQ sections.
- Shared navigation with restrained indexing and a clear pre-launch indicator; a new oversized wordmark/footer composition. Inner-page type, document navigation, product record navigation, release panel, catalog, and Sandbox styling follow the same visual system.
- Original **Form—02** Three.js sculpture: beveled INKZ plates, a recessed accent core, split orbital chassis, bolts, braces, procedural studio reflections, and directional lighting. This is brand artwork, not verified product architecture or gameplay.
- A finite assembling entrance, pointer damping, and explicit **Inspect form / Reset form** controls for mouse, touch, and keyboard. Reset returns to the precise neutral composition. The scene stops drawing at rest, offscreen, and in background tabs; Pause motion remains available.
- Finite type entrances, one-time editorial reveals, directional link feedback, a short mobile menu entrance, and native FAQ transitions. No scroll interception, cursor replacement, autoplay footage, or endless ambient render loop.

## Actual rendered evidence

- [Desktop hero](./desktop-hero.png) and [full homepage](./desktop-homepage.png).
- [Mobile hero](./mobile-hero.png) and [full homepage](./mobile-homepage.png).
- [Open 3D assembly](./assembly-inspection.png).
- [Browser motion recording](./motion-review.mp4): entrance, pointer inspection, assembly opening/reset, and the collection transition. Captured in Chromium with software WebGL; recording speed is not a hardware/device performance benchmark.
- [Reduced-motion SVG fallback](./reduced-motion.png), with no WebGL canvas initialized.
- [Catalog](./desktop-products.png), [Combat Framework](./desktop-combat-framework.png), [documentation](./desktop-docs.png), and [Sandbox](./desktop-checkout.png).
- [Mobile catalog](./mobile-products.png), [product](./mobile-combat-framework.png), [documentation](./mobile-docs.png), and [Sandbox](./mobile-checkout.png).
- [Machine-readable render checks](./render-checks.json).

## Accessibility and rendering behavior

All critical text, links, and the geometric SVG fallback render without JavaScript. Reduced motion and Save-Data avoid initializing the 3D scene; preference changes and WebGL/context loss restore the fallback. Inspection and pause states remain in memory only. Coarse-pointer rendering caps at 20 fps and DPR 1.25; fine-pointer rendering caps at 30 fps and DPR 1.5. The finite 4.2-second entrance uses active wall-clock time, independent of renderer frame throughput. Geometry/materials/reflections are local, with no new font/model/texture services or packages.

Native button controls work without pointer hover. The new keyboard test compares actual canvas images: opening changes the rendered geometry, and resetting returns byte-for-byte to its original resting image. It matches focus/scroll state between captures so the comparison measures the same composition. Existing tests also verify no GPU draws at rest and an exact return after pointer inspection.

## Validation

- Lint, TypeScript, and production build passed.
- 45 server tests passed; payment behavior is unchanged.
- Existing 55 browser checks passed, with one intentional desktop skip for the mobile-only navigation test. The two new desktop/mobile assembly tests passed after matching keyboard focus between their image comparisons. CI runs the complete final suite.
- Existing viewport checks cover 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels, unclipped headline text, usable controls, and no horizontal overflow. Axe checks cover the eight core routes and all three Sandbox routes at desktop/mobile sizes.
- A local metadata-base warning remains expected without a configured public deployment origin.

No live payments, paid downloads, framework source, license rights, verified feature claims, contact details, or business facts were added or enabled. Stripe credentials are not needed to review the rework; the existing independent Sandbox configuration and manual-verification limitations remain documented in STRIPE_SANDBOX.md.
