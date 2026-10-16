import {
  ACESFilmicToneMapping, AmbientLight, CubeUVReflectionMapping, DataTexture, DirectionalLight, Group, HalfFloatType, LinearFilter, LinearSRGBColorSpace, Material,
  Mesh, MeshStandardMaterial, OrthographicCamera, Quaternion, RGBAFormat, Scene, SRGBColorSpace,
  Texture, Vector3, WebGLRenderer, type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type ArtifactController = { setPaused: (paused: boolean) => void; setInspected: (inspected: boolean) => void; dispose: () => void };
type Options = { ready: () => void; unavailable: () => void; motion: (state: string) => void };
const MODEL = "/models/inkz-rings.glb";
const RING_NAMES = ["Ring_Primary", "Ring_Secondary", "Ring_Tertiary"] as const;

function disposeModel(model: Object3D, retainedMaterials: Iterable<Material> = []) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Material>(retainedMaterials);
  const textures = new Set<Texture>();
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      // Studio/probe envMaps are owned separately by mountArtifact.
      for (const [key,value] of Object.entries(material)) if (key !== "envMap" && value instanceof Texture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  const bitmaps = new Set<ImageBitmap>();
  textures.forEach(texture => {
    const image = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) bitmaps.add(image);
    texture.dispose();
  });
  // GLTFLoader's decoded ImageBitmaps are not released by Texture.dispose().
  // Shared metal/roughness maps can reference the same bitmap; close it once.
  bitmaps.forEach(bitmap => bitmap.close());
  materials.forEach(material => material.dispose());
  model.clear();
}


function decodeStudio(bytes: ArrayBuffer, width: number, height: number) {
  if (bytes.byteLength !== 16+width*height*8) throw new Error("Invalid studio texture");
  const header = new DataView(bytes);
  if (header.getUint32(0) !== 0x494e4b5a || header.getUint32(4,true) !== 1 || header.getUint32(8,true) !== width || header.getUint32(12,true) !== height) throw new Error("Invalid studio header");
  const pixels = new Uint16Array(width*height*4);
  for (let i=0; i<pixels.length; i++) pixels[i] = header.getUint16(16+i*2,true);
  const texture = new DataTexture(pixels,width,height,RGBAFormat,HalfFloatType);
  texture.mapping = CubeUVReflectionMapping; texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearFilter; texture.magFilter = LinearFilter; texture.needsUpdate = true;
  return texture;
}

/** Loads the actual Blender-authored GLB; the poster never acts as model geometry. */
export function mountArtifact(host: HTMLElement, options: Options): ArtifactController {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.25 : 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  host.dataset.load = "loading";

  const scene = new Scene();
  const camera = new OrthographicCamera(-2.6, 2.6, 2.6, -2.6, 0.1, 40);
  camera.position.set(3.4, 2.5, 7);
  camera.lookAt(0, 0, 0);
  let environment: DataTexture | null = null, coreEnvironment: DataTexture | null = null;
  let sourceCoreMaterial: Material | null = null;
  scene.environmentIntensity = 1;
  const key = new DirectionalLight(0xfff6ef, 1.6); key.position.set(-4, 5, 5);
  const rim = new DirectionalLight(0xe2e8ff, 1.4); rim.position.set(4, 2, -3);
  scene.add(key, rim, new AmbientLight(0xffffff, 0.025));
  const sculpture = new Group(); scene.add(sculpture);
  const abort = new AbortController();
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let disposed = false, paused = false, visible = true, ready = false, prepared = false;
  let frame = 0, timer = 0, previousTime = 0, activeStart = 0, elapsed = 0, activeBeforeSuspend = 0;
  let pointerX = 0, pointerY = 0, rotationX = 0, rotationY = 0, inspectTarget = 0, inspectAmount = 0;
  let model: Object3D | null = null;
  let rings: { object: Object3D; quaternion: Quaternion; position: Vector3 }[] = [];
  const interval = 1000 / (coarse ? 20 : 30);
  const idleDuration = 4.8;
  const axisX = new Vector3(1,0,0), axisY = new Vector3(0,1,0), axisZ = new Vector3(0,0,1);
  const tilt = new Quaternion(), spin = new Quaternion();

  function wake() {
    if (!disposed && model && prepared && !frame && !timer && visible && !paused && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(time: number) {
    frame = 0;
    if (disposed || !model || !prepared) return;
    const running = visible && !paused && !document.hidden;
    // Exponential damping is stable for any elapsed time. Capping this delta
    // made inspection/reset slow down on devices that miss frames. sync()
    // already resets previousTime when suspending, pausing or resizing.
    const delta = previousTime ? (time - previousTime) / 1000 : 0;
    previousTime = time;
    if (running) {
      if (!activeStart) activeStart = time;
      elapsed = activeBeforeSuspend + (time - activeStart) / 1000;
      const damping = 1 - Math.exp(-8 * delta);
      rotationX += (pointerY * .08 - rotationX) * damping;
      rotationY += (pointerX * .15 - rotationY) * damping;
      inspectAmount += (inspectTarget - inspectAmount) * damping;
    }
    if (paused || Math.abs(inspectTarget - inspectAmount) < .00015) inspectAmount = inspectTarget;
    const interpolating = Math.abs(inspectTarget - inspectAmount) > .00015 || Math.abs(rotationX - pointerY * .08) + Math.abs(rotationY - pointerX * .15) > .00015;
    if (running && !interpolating) { rotationX = pointerY * .08; rotationY = pointerX * .15; }
    const settling = Math.pow(Math.max(0,1-elapsed/idleDuration),3);
    rings.forEach(({object, quaternion, position}, index) => {
      // Each named ring has an independent axis, phase and inspection position.
      const opening = inspectAmount * [0.38,-0.5,0.32][index];
      const angle = Math.sin(elapsed * [.35,-.28,.41][index] + index) * .10 * settling + opening;
      object.quaternion.copy(quaternion).multiply(tilt.setFromAxisAngle(index === 1 ? axisY : axisX, angle));
      object.quaternion.multiply(spin.setFromAxisAngle(axisZ, (index-1) * .12 * settling + inspectAmount * .12 * (index+1)));
      object.position.copy(position);
      object.position.x += inspectAmount * [-.16,.22,.08][index];
      object.position.y += inspectAmount * [.2,-.18,.12][index];
    });
    sculpture.rotation.set(rotationX + .025 * settling, rotationY - .08 * settling, 0);
    host.dataset.assembly = inspectAmount === 1 ? "open" : inspectAmount === 0 ? "closed" : "moving";
    try { renderer.render(scene, camera); } catch { fail(); return; }
    if (!ready) { ready = true; host.dataset.load = "ready"; options.ready(); }
    const moving = running && (elapsed < idleDuration || interpolating);
    host.dataset.activity = moving ? "settling" : "resting";
    if (moving) timer = window.setTimeout(() => { timer = 0; wake(); }, Math.max(0,interval-(performance.now()-time)));
  }
  function sync(force = false) {
    if (disposed) return;
    cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; timer = 0;
    previousTime = 0; activeBeforeSuspend = elapsed; activeStart = 0;
    options.motion(paused ? "paused" : !visible || document.hidden ? "suspended" : "running");
    if (!model || !prepared || !visible || document.hidden || paused && ready && !force) return;
    frame = requestAnimationFrame(render);
  }
  function fail() { if (disposed) return; dispose(); host.dataset.load = "failed"; options.unavailable(); }
  const resize = new ResizeObserver(() => {
    if (disposed || !host.clientWidth || !host.clientHeight) return;
    const half = 2.45;
    camera.left = -half * host.clientWidth / host.clientHeight;
    camera.right = half * host.clientWidth / host.clientHeight;
    camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight); sync(true);
  }); resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold:0}); intersection.observe(host);
  const pointer = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX-rect.left)/rect.width*2-1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY-rect.top)/rect.height*2-1)); wake();
  };
  const leave = () => { pointerX = 0; pointerY = 0; wake(); };
  const release = (event: PointerEvent) => { if (event.pointerType !== "mouse") leave(); };
  const visibility = () => sync();
  const contextLost = (event: Event) => { event.preventDefault(); fail(); };
  const preferenceChanged = () => { if (preference.matches) fail(); };
  host.addEventListener("pointermove", pointer); host.addEventListener("pointerleave", leave);
  host.addEventListener("pointerup", release); host.addEventListener("pointercancel", leave);
  canvas.addEventListener("webglcontextlost", contextLost); document.addEventListener("visibilitychange", visibility);
  preference.addEventListener("change", preferenceChanged);

  void (async () => {
    try {
      const [bytes, studio, coreStudio] = await Promise.all([MODEL,"/models/inkz-studio.bin.gz","/models/inkz-core-studio.bin.gz"].map(async url => {
        const response = await fetch(url, { signal:abort.signal, cache:"default" });
        if (!response.ok) throw new Error("Model environment unavailable");
        return url.endsWith(".gz")
          ? new Response(response.body!.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
          : response.arrayBuffer();
      }));
      if (disposed) return;
      // Offline-prefiltered local RGBA16F CubeUV; no runtime PMREM capture.
      environment = decodeStudio(studio,384,512);
      coreEnvironment = decodeStudio(coreStudio,384,512);
      scene.environment = environment;
      const gltf = await new GLTFLoader().parseAsync(bytes, "/models/");
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      const titanium = model.getObjectByName("Primary_Titanium_Panels");
      // GLTFLoader may resolve a model after a texture decode failure. Keep
      // the genuine poster rather than reveal a flat, incomplete material.
      if (!(titanium instanceof Mesh) || !(titanium.material instanceof MeshStandardMaterial) || !titanium.material.roughnessMap?.image) throw new Error("Missing machining material");
      const core = model.getObjectByName("INKZ_Core");
      const namedRings = RING_NAMES.map(name => model!.getObjectByName(name));
      if (!(core instanceof Mesh) || namedRings.some(ring => !(ring instanceof Mesh))) throw new Error("Invalid model structure");
      if (!(core.material instanceof MeshStandardMaterial)) throw new Error("Invalid core material");
      sourceCoreMaterial = core.material;
      core.material = core.material.clone();
      core.material.envMap = coreEnvironment;
      rings = namedRings.map(object => ({ object:object!, quaternion:object!.quaternion.clone(), position:object!.position.clone() }));
      let triangles = 0;
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count)/3;
        // Cycles uses emission as a light source; realtime has no path-traced
        // bounce. Keep the inserts red under ACES instead of clipping orange.
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof MeshStandardMaterial && material.name === "Embedded_Red") material.emissiveIntensity = 1.5;
        }
      });
      host.dataset.model = MODEL; host.dataset.rings = String(rings.length); host.dataset.triangles = String(triangles);
      sculpture.add(model);
      await renderer.compileAsync(scene,camera);
      if (disposed) return;
      prepared = true; sync(true);
    } catch { if (!disposed) fail(); }
  })();
  function dispose() {
    if (disposed) return;
    disposed = true; abort.abort(); cancelAnimationFrame(frame); clearTimeout(timer);
    resize.disconnect(); intersection.disconnect();
    host.removeEventListener("pointermove", pointer); host.removeEventListener("pointerleave", leave);
    host.removeEventListener("pointerup", release); host.removeEventListener("pointercancel", leave);
    canvas.removeEventListener("webglcontextlost", contextLost); document.removeEventListener("visibilitychange", visibility);
    preference.removeEventListener("change", preferenceChanged);
    if (model) { sculpture.remove(model); disposeModel(model,sourceCoreMaterial ? [sourceCoreMaterial] : []); model = null; sourceCoreMaterial = null; }
    rings = []; scene.environment = null; environment?.dispose(); environment = null; coreEnvironment?.dispose(); coreEnvironment = null; scene.clear(); renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    canvas.remove();
  }
  return { setPaused: value => { paused=value; sync(); }, setInspected: value => { inspectTarget=value ? 1 : 0; sync(true); }, dispose };
}
