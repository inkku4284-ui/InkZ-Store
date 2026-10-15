import {
  ACESFilmicToneMapping, AmbientLight, DirectionalLight, EdgesGeometry,
  ExtrudeGeometry, Group, LineBasicMaterial, LineSegments, Mesh,
  MeshStandardMaterial, OrthographicCamera, Path, PMREMGenerator,
  Scene, Shape, SRGBColorSpace, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { core, plates, type Point } from "./insignia-shape";

export type ArtifactController = { setPaused: (paused: boolean) => void; dispose: () => void };
type Options = { ready: () => void; unavailable: () => void; motion: (state: string) => void };

function outline(points: readonly Point[], hole?: Point) {
  const shape = new Shape();
  shape.moveTo(...points[0]);
  points.slice(1).forEach(point => shape.lineTo(...point));
  shape.closePath();
  if (hole) {
    const cut = new Path();
    cut.absarc(hole[0], hole[1], 0.055, 0, Math.PI * 2, true);
    shape.holes.push(cut);
  }
  return shape;
}

export function mountArtifact(host: HTMLElement, options: Options): ArtifactController {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1 : 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
  camera.position.set(4.8, 1.8, 9.5);
  camera.lookAt(0, 0, 0);

  // Procedural studio reflections: no HDR downloads, textures, or model requests.
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.85;
  room.dispose();
  pmrem.dispose();
  const key = new DirectionalLight(0xf3f1eb, 4.5);
  key.position.set(-4, 6, 4);
  scene.add(key);
  const rim = new DirectionalLight(0xeae7e0, 6);
  rim.position.set(4, 2, -3);
  scene.add(rim, new AmbientLight(0xeae7e0, 0.18));

  const fronts = [0.32, 0.38, 0.29, 0.36, 0.33].map(roughness => new MeshStandardMaterial({ color: 0x757575, metalness: 0.82, roughness }));
  const side = new MeshStandardMaterial({ color: 0x353535, metalness: 0.8, roughness: 0.42 });
  const red = new MeshStandardMaterial({ color: 0x963a33, metalness: 0.5, roughness: 0.42 });
  const backing = new MeshStandardMaterial({ color: 0x343434, metalness: 0.85, roughness: 0.45 });
  const edgeMaterial = new LineBasicMaterial({ color: 0xd5d9ce, transparent: true, opacity: 0.2 });
  const sculpture = new Group();
  const geometries: (ExtrudeGeometry | EdgesGeometry)[] = [];

  function layer(points: readonly Point[], depth: number, z: number, material: MeshStandardMaterial | MeshStandardMaterial[], bevel: number, hole?: Point) {
    const geometry = new ExtrudeGeometry(outline(points, hole), { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 12 });
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.z = z;
    sculpture.add(mesh);
    return mesh;
  }
  layer(core, 0.16, -0.55, backing, 0.025);
  layer(core, 0.12, -0.29, red, 0.018);
  plates.forEach((plate, index) => {
    const mesh = layer(plate.points, 0.44, -0.16, [fronts[index], side], 0.028, plate.hole);
    const edges = new EdgesGeometry(mesh.geometry, 35);
    geometries.push(edges);
    mesh.add(new LineSegments(edges, edgeMaterial));
  });
  scene.add(sculpture);

  let disposed = false;
  let paused = false;
  let visible = true;
  let frame = 0;
  let timer = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let pointerX = 0;
  let pointerY = 0;
  let rotationX = 0;
  let rotationY = 0;
  let ready = false;
  const frameInterval = 1000 / (coarse ? 20 : 30);
  const idleDuration = 6;

  function wake() {
    if (!disposed && !frame && !timer && visible && !paused && !document.hidden) frame = requestAnimationFrame(render);
  }

  function render(time: number) {
    frame = 0;
    if (disposed) return;
    const running = visible && !paused && !document.hidden;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.08) : 0;
    previousTime = time;
    lastFrame = time;
    if (running) {
      elapsed += delta;
      const damping = 1 - Math.exp(-8 * delta);
      rotationX += (pointerY * 0.09 - rotationX) * damping;
      rotationY += (pointerX * 0.16 - rotationY) * damping;
    }
    const interpolating = Math.abs(rotationX - pointerY * 0.09) + Math.abs(rotationY - pointerX * 0.16) > 0.00015;
    if (running && !interpolating) { rotationX = pointerY * 0.09; rotationY = pointerX * 0.16; }
    const settling = Math.pow(Math.max(0, 1 - elapsed / idleDuration), 2);
    sculpture.rotation.set(rotationX + Math.sin(elapsed * 0.5) * 0.025 * settling, rotationY + Math.sin(elapsed * 0.4) * 0.065 * settling, -0.11);
    try { renderer.render(scene, camera); }
    catch { dispose(); options.unavailable(); return; }
    if (!ready) { ready = true; options.ready(); }
    const activity = running && (elapsed < idleDuration || interpolating) ? "settling" : "resting";
    if (host.dataset.activity !== activity) host.dataset.activity = activity;
    if (running && (elapsed < idleDuration || interpolating)) {
      timer = window.setTimeout(() => { timer = 0; wake(); }, Math.max(0, frameInterval - (performance.now() - lastFrame)));
    }
  }

  function sync(force = false) {
    if (disposed) return;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = 0;
    timer = 0;
    previousTime = 0;
    options.motion(paused ? "paused" : document.hidden || !visible ? "suspended" : "running");
    if (!visible || document.hidden || paused && ready && !force) return;
    frame = requestAnimationFrame(render);
  }
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || disposed) return;
    const halfHeight = 2.5;
    camera.left = -halfHeight * width / height;
    camera.right = halfHeight * width / height;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    sync(true);
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 });
  intersection.observe(host);
  const pointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    wake();
  };
  const pointerLeave = () => { pointerX = 0; pointerY = 0; wake(); };
  const pointerUp = (event: PointerEvent) => { if (event.pointerType !== "mouse") pointerLeave(); };
  const visibilityChanged = () => sync();
  const contextLost = (event: Event) => { event.preventDefault(); dispose(); options.unavailable(); };
  // Stop at the native preference event as well as React's effect cleanup.
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const preferenceChanged = () => { if (motionPreference.matches) { dispose(); options.unavailable(); } };
  host.addEventListener("pointermove", pointerMove);
  host.addEventListener("pointerleave", pointerLeave);
  host.addEventListener("pointerup", pointerUp);
  host.addEventListener("pointercancel", pointerLeave);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibilityChanged);
  motionPreference.addEventListener("change", preferenceChanged);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    resize.disconnect();
    intersection.disconnect();
    host.removeEventListener("pointermove", pointerMove);
    host.removeEventListener("pointerleave", pointerLeave);
    host.removeEventListener("pointerup", pointerUp);
    host.removeEventListener("pointercancel", pointerLeave);
    canvas.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", visibilityChanged);
    motionPreference.removeEventListener("change", preferenceChanged);
    geometries.forEach(geometry => geometry.dispose());
    [...fronts, side, red, backing, edgeMaterial].forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
    canvas.remove();
  }
  sync();
  return { setPaused: (value: boolean) => { paused = value; sync(); }, dispose };
}
