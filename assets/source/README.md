# THE RINGS / FORM 001

Original INKZ label geometry authored in Blender 4.3.2 by `scripts/build-rings.py`. It is brand artwork, not a software/product architecture model. No third-party models, image planes, fonts, HDRs, textures, or concept-image reconstruction service are used. The INKZ mark is original geometric mesh strokes. Framework code and paid product assets are not included. No product license or third-party redistribution rights are implied by these art files.

## Reference limitation

The task's inline composite informed hierarchy and material direction. The requested `design/references/` directory and `inkz-rings-main.png` are absent in the repository and workspace. This was reported before implementation. The model is a completed authored interpretation of the written THE RINGS specification and the visible composite, **not an exact match claimed against an unavailable approved primary image**. Owner comparison/approval against that primary image remains outstanding.

## Reproduce

```
blender --background --threads 4 --python scripts/build-rings.py
node scripts/convert-poster.mjs
node scripts/check-rings.mjs
node scripts/view-rings.mjs
```

The Blender script creates a compressed `.blend`, exports actual glTF 2.0 binary geometry and embedded PBR materials, checks its budgets, and renders a transparent 1000 × 1000 PNG from the same asset. Convert the PNG to the WebP poster after rendering. Next.js/Sharp serves responsive local versions in the website. The provided Blender build lacks OpenImageDenoise, so the script renders actual Cycles samples without that denoiser; do not claim a denoised render. Source geometry is deterministic. Area lights/camera are excluded from the GLB. Normals are recalculated outward before bevel/weighted-normal modifiers are applied during export; object pivots remain centered for independent ring control.

## Measured export

See `inkz-rings-report.json` and `node scripts/check-rings.mjs` for actual bytes, node names, mesh and triangle counts. Measured model: **32,304 triangles, 588,224 bytes**, 15 meshes, no textures. Offline gzip estimates vary by compressor (Python 239,526 bytes; Node 258,345 bytes); neither is a claim about deployed response headers. No Draco/KTX decoder is required. GLB budget: <1.5 MB file and <100,000 triangles. Source `.blend` is 235,487 bytes. The WebP poster is 126,576 bytes before Next.js responsive optimization.

`view-rings.mjs` serves an independent, local-only glTF viewer at port 3112 with orbit and wireframe controls. It uses the installed development toolchain (`esbuild` supplied by `tsx`); it serves only its three explicit viewer files, not the repository or environment. It is not part of the Next.js application or a new public route. Use it to check geometry, normals and silhouette separately from the homepage choreography.

Required meshes: `INKZ_Core`, `Ring_Primary`, `Ring_Secondary`, `Ring_Tertiary`, `Accent_Light_A`, `Accent_Light_B`; satellites and fasteners are sparse details. Accent channel children follow their ring transforms. All geometry is local and actually parsed with `GLTFLoader`. The site poster is rendered from the `.blend`; it is never a plane or texture masquerading as the GLB.
