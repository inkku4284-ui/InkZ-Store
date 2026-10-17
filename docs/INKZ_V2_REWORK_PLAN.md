# INKZ® V2 — Label Rework / Phase 01–02

Status (16 October 2026): frontend delivered for review; THE RINGS quality overhaul now uses the subsequently attached approved primary image. See the latest quality record below; the earlier reference limitation describes the prototype. See the implementation record below; this is not owner visual approval.
Branch: `rework/inkz-label-v2` (never merge/deploy without owner review).
Brand rule: **INKZ IS LABEL.** Product-first software commerce; not an abstract AI-generated SaaS landing page.

## Verified baseline (main, 2026-10-16)
- Next.js 16.4.1, React 19.3.1, Tailwind 4, Three.js 0.186.1, Stripe sandbox.
- `src/app/page.tsx`: editorial hero + `HeroArtifact`, product spotlight later.
- `src/app/home-motion.css`: `var(--accent)` across hero, strips and interactions; green radial glow.
- `src/app/globals.css`: existing void/carbon/bone/oxide tokens; inspect every accent override before edits.
- `src/components/identity/hero-artifact.tsx`: dynamic scene loading, SVG poster, reduced-motion, save-data handling, pause/inspect.
- `src/components/identity/artifact-scene.ts`: procedural extruded plates and acid-green torus/core; scene resources and lifecycle managed here.
- `src/lib/products.ts`: Combat Framework is NOT launched, `price: null`, `media: null`. Never fabricate media, claims or pricing.
- `src/lib/site.ts`: `paymentsEnabled: false`; preserve.
- `AGENTS.md`: read installed Next.js 16 documentation from `node_modules/next/dist/docs/` before implementation.
- Existing `docs/visual-review`, Playwright, server tests, lint/typecheck/build. Preserve coverage and update tests for changed scene semantics.

## Visual contract / Phase 01
1. Preserve accessible semantic structure, navigation, footer, policies, metadata and payment gating.
2. Create a **single authoritative token system** (e.g. `src/app/globals.css`), eliminate conflicting legacy green values in other styles. Core colors: void `#0A0A0B`, carbon `#1C1C20`, bone `#F2F0EB`, muted `#B7B7BA`, signature red `#D61F35`. Red is an accent, not a full-page background. Chrome is a material treatment, not a flat CSS gradient.
3. Use a deliberate typography hierarchy: Space Grotesk for strong headlines, Inter for readable product copy, IBM Plex Mono only for compact metadata. No blanket 8px UI text; keep readable accessible sizes and contrast.
4. Navigation: Products, Docs, Contact; maintain clear focus, mobile menu and CTA states.
5. Homepage product-first wireframe: header → compact label statement + direct catalog CTA → concise THE RINGS visual on one side → Combat Framework spotlight with honest prelaunch status → concise product benefits backed by verified source → documentation/FAQ → footer. Reduce manifesto/process repetition.
6. Catalog and product detail: clear status, supported platform, documentation link, no fake price/buy button, reserved slot for approved genuine demo media. Keep existing public routes.
7. Avoid generic SaaS cards, glowing blobs, fake testimonials, artificial social proof and invented sales claims.
8. Review mobile widths 320/375/390/768 and desktop 1280/1440; no horizontal overflow or hero content occlusion.

## Asset contract / Phase 02: THE RINGS / FORM 001
The generated reference image is **concept art only**, not a geometry file. Do not claim image-to-GLB reconstruction is exact. Use Blender to author a real model, export GLB, then load with Three.js.

Blender structure (named objects for independent control):
- `INKZ_Core`: black chrome central sphere, physically plausible reflections; branded mark via approved texture/geometry, not unsupported HTML overlay pretending to be part of mesh.
- `Ring_Primary`, `Ring_Secondary`, `Ring_Tertiary`: interlocking rings on different axes, restrained brushed/chrome metal, bevelled edges.
- `Accent_Light_A`, `Accent_Light_B`: recessed red emissive channels; avoid blown-out neon.
- `Satellite_01..03`: optional small dark metal satellites with sensible poly budgets.
- `Inspect_* `: optional detail groups; no geometry duplication solely for effect.
Target visual: asymmetrical yet readable silhouette; black/chrome/controlled deep red; studio reflections; no acid green, rocks, giant spikes or overcomplicated noise.

GLB handoff:
- Source `.blend` in `assets/source/` only if appropriate licensing and repo size; optimized `.glb` in `public/models/inkz-rings.glb` (only when actually produced).
- Produce `public/images/inkz-rings-poster.webp` from the same approved asset, plus accessible alt/caption. No generated concept art passed off as a real GLB render.
- Name nodes deterministically; apply transforms, clean normals, inspect pivot positions; export glTF 2.0 with embedded PBR materials. Document Blender version, exporter settings, triangle count, texture dimensions, compressed size and licenses.
- Target <= 1.5 MB GLB compressed and <= 100k triangles on desktop as initial budgets; adjust with measured visual evidence. Aim for poster-first and lazy loading. Use texture compression / mesh compression only if runtime loader supports it and tests cover it.
- Verify model in a standalone glTF viewer and in the site. No runtime external asset requests.

Three.js integration:
- Replace procedural `artifact-scene.ts` content with GLTFLoader-based scene or a new `rings-scene.ts`, keeping `HeroArtifact` lifecycle API or intentionally migrating tests.
- Load GLB lazily after visible; poster is SSR-safe and remains if WebGL/model fails; error handling and abort/disposal must prevent stale scene updates.
- Independent subtle ring motion; interactive pointer parallax with clamped angles; explicit Inspect/Reset and Pause/Resume buttons; keyboard operation. Respect reduced motion and save-data.
- Suspend offscreen/hidden tabs, cap pixel ratio and frame budget; avoid continuous expensive idle animation on mobile. Preserve WebGL context loss behavior.
- Dispose meshes/materials/textures, renderer, observers and listeners on unmount; prevent multiple canvases after navigation.
- Check realistic metal highlights, red emission, edge aliasing, exposure, camera composition, silhouette and crop on mobile.

## Implementation order for Codex (commit separately)
**Commit A — Audit and design tokens:** document current accent source, route matrix, screenshots; centralize tokens and eliminate green. Update tests for theme invariants.
**Commit B — Homepage layout:** product-first layout and responsive header/CTA; truthful prelaunch copy, no false commercial claims.
**Commit C — Asset prototype:** create Blender source + optimized GLB + matching poster; document model measurements and licensing. If Blender unavailable, DO NOT silently substitute procedural approximation: create an asset-blocker report and implement the loader against a clearly labelled temporary test model in preview only.
**Commit D — Three.js runtime:** lazy GLB loader, motion, inspect/pause, poster and lifecycle; adapt Playwright and unit coverage.
**Commit E — QA:** screenshots/video across viewport matrix, Lighthouse/WebGL performance observations, accessibility, lint/typecheck/build/test:e2e/test:server/stripe:verify where credentials available. Record exact pass/fail and blockers.

## Release gates
- Branch/preview only. Never modify `main`, production deployment, live Stripe secrets, or enable purchases.
- Existing URLs and server payment validation behavior preserved.
- Product remains Not launched, with no price or media claims unless verified by owner.
- No green accent remains in active styles, scene materials, posters or metadata.
- GLB actually loads as 3D with separately controlled named ring nodes; screenshot alone does not pass.
- Functional fallback, keyboard controls, reduced motion, mobile layout and performance checked.
- Open draft PR with screenshots, test output, remaining gaps and owner approval checklist. Do not merge without explicit approval.

## Codex task prompt (recommended GPT-6 High reasoning)
Work only on branch `rework/inkz-label-v2` in `inkku4284-ui/InkZ-Store`. First read `AGENTS.md`, this specification, `README.md`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/home-motion.css`, `src/components/identity/{hero-artifact,artifact-scene}.ts(x)`, `src/lib/{products,site}.ts`, and the installed Next.js docs. Produce a short file-level audit and exact change list before coding. Implement Phase 01 as a coherent token + layout redesign; preserve all commerce/legal/payment invariants and accessibility. Then implement Phase 02 with a REAL Blender-authored, optimized GLB and Three.js GLTFLoader, not an image plane or fake procedural stand-in. If asset authoring is blocked, report it explicitly and stop short of claiming Phase 02 complete. Work in small reviewable commits; run checks, capture screenshots and explain discrepancies against the approved INKZ THE RINGS reference. No production deployment or merge.


## Implementation record — 16 October 2026

- Audit: [all actual routes, exact scope and preserved invariants](./INKZ_V2_AUDIT.md). `design/references/` and `inkz-rings-main.png` were missing; reported before visual work. The visible task composite and written specification informed an original interpretation. Inspection/comparison against those named files is still blocked.
- One authoritative black/chrome/bone/deep-red token system; rebuilt shared navigation/footer/components and every existing public content, documentation, policy and Sandbox route. No new products, prices, proof, contacts, accounts, cart or fulfillment were invented.
- Real Blender 4.3.2 source, optimized GLB, independent named ring nodes and matching 192-sample Cycles poster: [asset record](../assets/source/README.md). Measured GLB 588,224 bytes / 32,304 triangles / 15 meshes / zero model textures. Separate locally baked studio lighting removes runtime PMREM capture/blur; model shaders prepare before first reveal. The source, exporter and environment bake are reproducible and licenses are documented.
- Pointer, Inspect/Reset, Pause/Resume, finite rendering, visibility suspension, reduced-motion/Save-Data, failure fallback, keyboard/touch and resource disposal are implemented and exercised in real WebGL. The independent glTF viewer verifies the export separately from the Next.js app.
- [Actual rendered evidence, full route matrix, browser recording, performance observations and exact verification](./visual-review/v2/README.md). All 11 public routes plus 404 are captured at desktop/mobile; the six-width, 12-route matrix has no overflow. Tests retain all payment security assertions and extend discovery, empty, GLB/environment failure and lifecycle coverage.
- Review through [Draft PR #5](https://github.com/inkku4284-ui/InkZ-Store/pull/5), on `rework/inkz-label-v2` against `main`. Preview and CI state are linked there. No merge or Production deployment is authorized/performed.
- `paymentsEnabled: false`, original product data, API routes and Stripe/security implementation are preserved. Actual Sandbox Price/card/webhook verification remains unperformed without safe credentials; do not claim a successful Stripe simulation or durable fulfillment.

Remaining owner gates: compare against the missing primary/reference set when available; review real-device motion and the complete preview; verify business/product/legal/media details separately before any future launch. These do not silently turn the interpretive model into an approved reference match or open purchases.


## THE RINGS quality overhaul — subsequent owner request

Scope is strictly the sculpture/materials/studio, motion reliability and asset lifecycle. The approved Hero typography, layout, navigation and CTA are preserved byte-for-byte; business/product/payment code remains untouched. The approved primary image is now visible in the task and was inspected. Named files in `design/references/` remain absent; that no longer blocks comparing the supplied primary concept.

Flat washers are replaced by original Blender-authored cylindrical, chamfered hoops: titanium panel seams, polished rails, recessed grooves/housings, flush fasteners, embedded red inserts, a surface-following solid INKZ inlay and an original band inscription. A real PBR roughness map exports in the GLB. The dark seven-card studio and a core reflection probe are prefiltered offline. No bloom, runtime PMREM or reflection capture is introduced.

The model remains below the original 1.5 MB / 100k-triangle budgets. Inspect/reset damping now follows wall time on slow devices; pause, reduced motion, lazy loading, failure fallback, zero draws at rest and resource cleanup remain explicit. Newly introduced decoded PBR images close exactly once on unmount. [Current source / reproduction](../assets/source/README.md), [matching-camera comparison and QA evidence](./visual-review/rings-quality/README.md). This supersedes the old prototype measurements and primary-image availability statement, not the preserved historical V2 test evidence. Owner visual approval and physical-device profiling remain outstanding.

## Layout rework — 17 October 2026 (Asia/Bangkok)

The owner rejected the overall layout and requested a complete layout rework while explicitly approving the current 3D. This request supersedes the earlier hero-layout constraint. PR #5 was already merged by the owner before this revision; continue on `rework/inkz-label-v2` from the merged main commit and submit a new Draft PR. No merge or Production deployment is part of this task.

- Audit: all eleven public page routes plus 404, error and scoped Sandbox loading; existing APIs, metadata, tests, business configuration and implementation records inspected. `design/references/` is absent; no new artistic reference or substitute model is introduced.
- Layout: a larger dark identity stage; a paper product presentation; original flat typographic product artwork; clear editorial sections; simpler sticky navigation; readable product, catalog, documentation, contact, legal and status layouts. Inter provides the new display hierarchy; local fonts remain self-hosted. One documentation contents rail replaces competing sidebars.
- Mobile: stacked layouts, visible release restrictions, full-width search, readable policy summaries, touch controls and keyboard navigation. No animation hides essential content. Reduced-motion and unavailable-WebGL paths retain their existing behavior.
- Preservation boundary: the approved GLB, both reflection probes, poster, Blender source and Three.js runtime/controller remain unchanged. Product data, Stripe routes and libraries, secret handling, `paymentsEnabled: false`, public URLs and metadata are preserved. No product, price, legal identity, contact channel or fulfillment is fabricated.
- Verification: production render review, all-route responsive matrix, existing Axe/keyboard/3D lifecycle/payment tests, lint, typecheck, server tests and production build. Results and actual screenshots belong in `docs/visual-review/layout-rework/`, separate from earlier evidence.
