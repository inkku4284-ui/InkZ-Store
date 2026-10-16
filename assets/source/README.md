# THE RINGS / FORM 001 — machined hoop edition

Original INKZ brand sculpture authored in Blender 4.3.2 by `scripts/build-rings.py`. This quality overhaul replaces the V2 prototype's flat radial washers with three substantial **cylindrical hoops**. It preserves the approved website layout and all commerce restrictions. No gameplay/framework source is included; these art assets do not imply any software-product license.

The primary artistic reference is the approved THE RINGS image attached to the quality-overhaul task. It was visually inspected for the diagonal front band, reflective central core, interlocking silver structures, embedded red light and thin satellite orbits. The original named `design/references/inkz-rings-main.png` and other reference files remain absent on disk. This is an original modeled interpretation; visual comparison is documented in [the rendered review](../../docs/visual-review/rings-quality/README.md), with remaining differences stated explicitly.

## Geometry and PBR

- Three independent, centered mesh pivots: `Ring_Primary`, `Ring_Secondary`, `Ring_Tertiary`. Their axial widths are 0.40 / 0.32 / 0.29 scene units; radial walls are 0.105. Broad curved surfaces now reflect the studio, rather than presenting a constant flat face normal.
- Chamfered cross sections, 24 curved titanium panels per ring with real seam gaps, polished inner/outer rails, recessed grooves, service pockets, flush hexagonal fasteners and channel housings. Thin secondary details use fewer profile vertices. No torus primitive or concept-image plane is used.
- Black chrome core, brushed titanium panels, polished silver rails and dark gunmetal substrates. A deterministic **512 × 128** machining roughness image exports into the glTF metallic/roughness texture. It is a real PNG/PBR map with UVs; Blender procedural nodes are not passed off as exported detail.
- Red inserts `Accent_Light_A/B/C` are children of the corresponding rings. Two fine orbital filaments carry four small attached satellites. All exported meshes have their actual transforms and clean normals.
- The INKZ core inlay follows the sphere surface and uses solid original polygon outlines. The band inscription uses original geometric line segments. No external fonts, models, textures or HDRs are used.

## Reproduce

```sh
blender --background --threads 4 --python scripts/build-rings.py
node scripts/convert-poster.mjs
node scripts/bake-environment.mjs
node scripts/check-rings.mjs
node scripts/view-rings.mjs
```

The default Blender render uses 192 Cycles CPU samples without denoising (this build lacks OpenImageDenoise). `INKZ_RENDER_SAMPLES` can override samples for local iteration. The compressed `.blend` contains the real source, packed original machining map, camera and seven area lights. Export selects only the artwork, applies modifiers and writes glTF 2.0 GLB, Y-up, with no cameras/lights/animations and no external dependencies. The transparent 1000 × 1000 PNG is rendered from that exact source, then converted by Sharp to the website WebP. Neither poster nor reference PNG is used as 3D geometry.

See `inkz-rings-report.json` and the checker for measured file sizes, triangles, nodes and texture count. The original <1.5 MB GLB / <100,000 triangle budgets remain enforced. No Draco, Meshopt or KTX runtime decoder is needed. The checker parses the actual GLB through GLTFLoader, decodes its embedded image with Sharp in Node, checks PBR/UV presence, substantial hoop depth and required nodes. Browser tests verify actual GPU loading separately.

## Matching studio / realtime

The local-only viewer on port 3112 serves an explicit asset whitelist, not the repository. Its default orthographic camera matches Blender and the settled homepage: Blender `(3.4,-7,2.5)` maps to Three `(3.4,2.5,7)`, vertical extent 4.9. Drag to orbit or use its wireframe control. The diagnostic `window.review` object exists only in this undeployed local viewer, never in the application.

`inkz-studio.bin.gz` is an original seven-card dark photographic studio, prefiltered offline using Three.js PMREM at face size 128. Large white strips define chrome highlights; narrow red strips approximate the recessed emitters' reflections. Negative space stays dark. There is no bloom or runtime PMREM generation. Cycles renders real light bounce; realtime image-based lighting approximates it. Realtime insert intensity is deliberately reduced from Cycles' lighting intensity to keep the red hue under ACES.

Format: 384 × 512 RGBA16F CubeUV, linear sRGB; **1,572,880 decoded bytes** including a 16-byte header. Header: ASCII `INKZ`, version 1, width/height uint32 little endian; texels uint16 half-floats little endian. The runtime validates exact format and length. The base studio is 69,929 bytes gzip. A separate **135,807-byte**, face-size-64 probe (`inkz-core-studio.bin.gz`, 336 × 256 / 688,144 decoded bytes) captures the actual outer sculpture from its center, excluding the core/inlay. Only the core material uses this map, which supplies reflected ring shapes and red channels without any per-frame reflection capture. The probe is frozen at the authored neutral pose; it does not update as rings move. This deliberate approximation avoids mobile reflection passes. The checker validates both assets; the exact checker measurement is authoritative. Studio positions/sizes are authored in the bake script and correspond to the Blender rig. [Three.js license notice](./STUDIO_LICENSE.txt).

## Delivery and lifecycle

The real poster renders first. Model and studio requests begin only near the viewport; shader compilation completes before WebGL reveal. Reduced-motion and Save-Data users retain the actual poster without model transfer. Failed asset/context creation also retains that poster. A content-hashed static poster import prevents reusing the prototype's optimized image; model fetches use normal cache revalidation.

Three independent axes move subtly during the finite entrance and inspection, with clamped/damped pointer interaction, Inspect/Reset and Pause/Resume. The scene renders at most 30 fps on fine pointers / 20 fps on coarse pointers, caps DPR, suspends when offscreen/hidden, and stops GPU draws at rest. It does not continuously spin on mobile. Teardown aborts fetches, removes listeners/observers/timers, disposes unique geometries/materials/textures, **closes shared decoded ImageBitmaps once**, disposes the environment/renderer and releases the context. Tests cover loading, fallback, navigation, exact reset and image cleanup.
