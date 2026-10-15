# Phase II.5 audit

Baseline: Phase II, merged into main as `3e86a3f`. Preserve the original routes, editorial sequence, Fracture plate outlines, self-hosted fonts, and pre-launch safeguards.

| Finding | Refinement |
| --- | --- |
| Pale, uniformly lit front faces flatten the artifact’s depth. | Dark machined metal, per-plate roughness variation, recessed red, and directional rim lighting. |
| The headline approaches the artifact frame while supporting copy sits far below it. | Rebalance optical spacing and present the object/copy as one editorial composition. |
| 7–8 px labels and a 38 px mobile pause control weaken usability. | Larger technical annotations and consistent 44 px controls. |
| Arrival delays conceal supporting copy; full-travel headline motion feels slow. | Shorter finite entrances, visible critical copy, consistent deceleration, and no-JavaScript readability. |
| Pointer easing depends on frame rate and has no explicit touch-cancel reset. | Time-based damping, bounded inspection, finite idle settling, and pointer-up/cancel return. |
| Selected diagram buttons inherit a bone focus outline against bone surroundings. | Context-aware focus colors and visible selection feedback. |
| Product specification rows mix confirmed targets with plans and unknowns. | Group the existing information into confirmed targets, planned release, and pending verification; keep conceptual content explicit. |
| Product media is absent. | Prepare a reusable real-footage component that renders nothing until approved media is supplied. |
| Navigation feedback depends on homepage-only CSS; footer links are small touch targets. | Shared navigation feedback, clearer active states, and practical 44 px links across routes. |

No new dependency, animation framework, product claim, pricing promise, or checkout functionality is needed. Local production-build screenshots and behavior checks will validate the changes. Automatic Vercel deployment is disabled for `feat/inkz-polish` only, using the officially supported `git.deploymentEnabled` setting; main and other branches retain their existing defaults. Do not merge or deploy this pass without review.
