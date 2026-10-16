# INKZ® V2 — Label Rework / Phase 01–02

Status: implementation specification, not a claim that the GLB or UI is complete.
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
