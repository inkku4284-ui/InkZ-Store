# INKZ V2 — implementation audit

Date: 16 October 2026 (Asia/Bangkok). Branch: `rework/inkz-label-v2`. Baseline: `6a8da99`; main is not modified. Read `AGENTS.md` and `INKZ_V2_REWORK_PLAN.md` before implementation. Blender 4.3.2 is available.

## Reference availability

`design/references/` does not exist in this branch or the workspace. No `inkz-rings-main.png` or other reference image files were found in the repository, workspace attachments, shared/library directories, or scratch files. Workspace attachments contain three earlier text directives, not the requested image set. This was reported before visual implementation. The composite image attached to the task is visible in chat and informs hierarchy/material direction, but cannot stand in for the missing primary art file. All named reference-image inspection remains blocked until those files are supplied. The asset authored here interprets the written THE RINGS specification and the visible composite; it is not claimed to be an exact reconstruction of an unavailable approved image.

## Actual route inventory and decisions

| Route | Existing behavior | V2 experience |
| --- | --- | --- |
| `/` | Long editorial portfolio/manifesto and procedural green artifact | Compact label/shop introduction, actual GLB, single honest product spotlight and evaluation paths |
| `/products` | Single static catalog row | Search/category discovery, product artwork, status and specifications, real empty-result state |
| `/products/combat-framework` | Long record and disabled purchase panel | Product evaluation hero, explicit media state, summary/release panel, section navigation, verified/planned/pending details |
| `/docs` | General marketing intro and policy-style body | Documentation workspace with product navigation, contents, readable preparation guide, links back to evaluation |
| `/contact` | Pending channel and long support notes | Clear support availability, topic routing to documentation and policies, no nonfunctional form or invented email |
| `/terms` | Accurate pending operator/license details | Rebuilt policy shell, summary, section navigation and preserved legal content/anchors |
| `/refund-policy` | Pre-launch/no sales and mandatory rights | Same coherent policy shell; preserved refund/consumer-rights content |
| `/privacy` | Hosting and optional Sandbox disclosures | Same coherent policy shell; update local model/poster asset description only |
| `/sandbox/checkout` | Server-gated verified test Price and disabled/active test control | Separate TEST MODE review panel with product/context, configuration state and unchanged server gate |
| `/sandbox/checkout/success` | Informational, never payment proof | Clear informational return state, no download or fulfillment |
| `/sandbox/checkout/cancel` | No payment mutation | Clear cancellation/return state, safe next actions |
| Unknown URL | 404 and catalog link | Rebuilt missing-page state with real 404 status |
| `/api/sandbox/checkout` | Origin, credentials, allowlisted Price, request/idempotency/rate validation | Unchanged |
| `/api/stripe/webhook` | Raw-body signature, live-event rejection, payment/state/dedup checks | Unchanged |

Metadata/image/icon, robots and sitemap routes are also inspected; retain canonical/noindex/sitemap behavior and update only brand presentation. No cart, account, fulfillment, reviews, new products, production prices or support channels exist. None will be invented.

## Exact file-level implementation scope

1. `src/app/globals.css`: replace accumulated legacy rules with authoritative V2 tokens, component system, page layouts and breakpoints. Delete `rework.css`; keep `home-motion.css` limited to finite choreography. Update `layout.tsx` imports/theme metadata.
2. `components/{ui,header,footer,document-layout,product-media}.tsx`: rebuild structural shared components and semantic states. Add catalog exploration and truthful product artwork components; preserve native links, button semantics and keyboard disclosure behavior.
3. All 11 `app/**/page.tsx` files, `not-found.tsx`, plus scoped loading/error boundaries: route-specific layouts and purposeful information hierarchy. Preserve every existing route/anchor, metadata meaning and business-policy fact. Product media remains unverified; show an explicit unavailable state without an invented demonstration.
4. `scripts/build-rings.py`, `assets/source/`, `public/models/`, `public/images/`: original Blender source, deterministic named GLB nodes, matching rendered poster and measured export report. No third-party model, concept PNG plane or paid product source.
5. `components/identity/{hero-artifact,artifact-scene,artifact-poster}.ts(x)`: actual GLTFLoader integration, independently controlled rings, pointer/inspect/pause controls, visibility and finite frame budgets, local poster and complete resource disposal. Remove obsolete green geometry sources.
6. `tests/`: preserve security suites and meaningful accessibility/route coverage; migrate wording/scene semantics, add discovery/empty-state and GLB/failure/lifecycle checks. Large pixel comparisons should report booleans rather than dumping PNG buffers.
7. `docs/visual-review/v2/`, model notes, README and Draft PR #5: actual rendered screenshots/video, route matrix, measured geometry/transfer/performance observations, exact test outcomes and unresolved reference limitation.

## Invariants and release restrictions

- `business.paymentsEnabled === false`; product array, `price: null`, `media: null`, country and all pending business/license/contact facts are preserved.
- Stripe implementation and server secrets unchanged; no actual Stripe payment is asserted without credentials/verification.
- No `main` edits, merge, or Production deployment. Branch Preview/local production-build verification only.
- Every active surface uses black/chrome/bone/restrained deep red. No green, generic CSS glow/gradient cards, fictional proof or unimplemented navigation icons.
- No image-plane substitution: completion of the 3D stage requires measured real GLB geometry loaded through Three.js.
