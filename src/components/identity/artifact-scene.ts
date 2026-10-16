import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CylinderGeometry, DirectionalLight, EdgesGeometry,
  ExtrudeGeometry, Group, LineBasicMaterial, LineSegments, Mesh,
  MeshStandardMaterial, OrthographicCamera, Path, PMREMGenerator,
  Scene, Shape, SRGBColorSpace, TorusGeometry, WebGLRenderer, type BufferGeometry,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { core, plates, type Point } from "./insignia-shape";

export type ArtifactController = { setPaused: (paused: boolean) => void; setInspected: (inspected: boolean) => void; dispose: () => void };
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.25 : 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
  camera.position.set(3.5, 2.1, 11);
  camera.lookAt(0, 0, 0);

  // Procedural studio reflections: no HDR downloads, textures, or model requests.
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.2;
  room.dispose();
  pmrem.dispose();
  const key = new DirectionalLight(0xf3f1eb, 4.5);
  key.position.set(-4, 6, 4);
  scene.add(key);
  const rim = new DirectionalLight(0xeae7e0, 6);
  rim.position.set(4, 2, -3);
  scene.add(rim, new AmbientLight(0xeae7e0, 0.18));

  const fronts = [0.19, 0.24, 0.17, 0.21, 0.18].map(roughness => new MeshStandardMaterial({ color: 0xbfc5b9, metalness: 1, roughness }));
  const side = new MeshStandardMaterial({ color: 0x353c32, metalness: 0.92, roughness: 0.28 });
  const accent = new MeshStandardMaterial({ color: 0xc8ed69, metalness: 0.35, roughness: 0.35, emissive: 0x425813, emissiveIntensity: 0.25 });
  const backing = new MeshStandardMaterial({ color: 0x343434, metalness: 0.85, roughness: 0.45 });
  const edgeMaterial = new LineBasicMaterial({ color: 0xd5d9ce, transparent: true, opacity: 0.2 });
  const sculpture = new Group();
  const geometries: BufferGeometry[] = [];
  const assembly = new Group();
  assembly.scale.setScalar(0.82);
  sculpture.add(assembly);
  const movablePlates: Mesh[] = [];

  function layer(points: readonly Point[], depth: number, z: number, material: MeshStandardMaterial | MeshStandardMaterial[], bevel: number, hole?: Point) {
    const geometry = new ExtrudeGeometry(outline(points, hole), { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 12 });
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.z = z;
    assembly.add(mesh);
    return mesh;
  }
  layer(core, 0.16, -0.62, backing, 0.025);
  layer(core, 0.12, -0.3, accent, 0.018);
  plates.forEach((plate, index) => {
    const mesh = layer(plate.points, 0.34, -0.1, [fronts[index], side], 0.028, plate.hole);
    movablePlates.push(mesh);
    const edges = new EdgesGeometry(mesh.geometry, 35);
    geometries.push(edges);
    mesh.add(new LineSegments(edges, edgeMaterial));
  });
  // A split orbital chassis, not a downloaded model or a product specification.
  const chassis = new Group();
  chassis.rotation.set(0.24, -0.16, 0.14);
  const chrome = new MeshStandardMaterial({ color: 0xabb5a3, metalness: 1, roughness: 0.22 });
  const graphite = new MeshStandardMaterial({ color: 0x242b22, metalness: 0.8, roughness: 0.28 });
  function ring(radius: number, thickness: number, arc: number, material: MeshStandardMaterial, angle: number, z: number) {
    const geometry = new TorusGeometry(radius, thickness, 8, coarse ? 60 : 96, arc);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.rotation.z = angle;
    mesh.position.z = z;
    chassis.add(mesh);
  }
  ring(2.05, 0.085, Math.PI * 1.64, chrome, 0.25, -0.28);
  ring(2.18, 0.023, Math.PI * 1.3, graphite, -1.5, -0.42);
  ring(1.94, 0.012, Math.PI * 0.48, accent, -0.78, -0.2);
  ring(2.05, 0.085, Math.PI * 0.2, accent, -0.62, -0.28);
  const boltGeometry = new CylinderGeometry(0.095, 0.095, 0.11, 12);
  const slotGeometry = new BoxGeometry(0.105, 0.018, 0.012);
  const braceGeometry = new BoxGeometry(0.19, 0.4, 0.16);
  geometries.push(boltGeometry, slotGeometry, braceGeometry);
  for (let index = 0; index < 4; index++) {
    const angle = index * Math.PI / 2 + 0.45;
    const x = Math.cos(angle) * 2.05;
    const y = Math.sin(angle) * 2.05;
    const brace = new Mesh(braceGeometry, graphite);
    brace.position.set(x, y, -0.29);
    brace.rotation.z = angle - Math.PI / 2;
    const bolt = new Mesh(boltGeometry, chrome);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(x, y, -0.16);
    const slot = new Mesh(slotGeometry, graphite);
    slot.position.set(x, y, -0.1);
    slot.rotation.z = angle;
    chassis.add(brace, bolt, slot);
  }
  sculpture.add(chassis);
  scene.add(sculpture);

  let disposed = false;
  let paused = false;
  let visible = true;
  let frame = 0;
  let timer = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let activeStart = 0;
  let activeBeforeSuspend = 0;
  let pointerX = 0;
  let pointerY = 0;
  let rotationX = 0;
  let rotationY = 0;
  let ready = false;
  let inspectTarget = 0;
  let inspectAmount = 0;
  const frameInterval = 1000 / (coarse ? 20 : 30);
  const idleDuration = 4.2;

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
      if (!activeStart) activeStart = time;
      elapsed = activeBeforeSuspend + (time - activeStart) / 1000;
      const damping = 1 - Math.exp(-8 * delta);
      rotationX += (pointerY * 0.09 - rotationX) * damping;
      rotationY += (pointerX * 0.16 - rotationY) * damping;
      inspectAmount += (inspectTarget - inspectAmount) * damping;
    }
    if (paused || Math.abs(inspectTarget - inspectAmount) < 0.00015) inspectAmount = inspectTarget;
    const interpolating = Math.abs(inspectTarget - inspectAmount) > 0.00015 || Math.abs(rotationX - pointerY * 0.09) + Math.abs(rotationY - pointerX * 0.16) > 0.00015;
    if (running && !interpolating) { rotationX = pointerY * 0.09; rotationY = pointerX * 0.16; }
    const settling = Math.pow(Math.max(0, 1 - elapsed / idleDuration), 3);
    const entrance = Math.max(inspectAmount, Math.pow(Math.max(0, 1 - elapsed / 2.6), 3));
    movablePlates.forEach((mesh, index) => {
      mesh.position.x = (index % 2 ? 0.45 : -0.45) * entrance;
      mesh.position.y = (2 - index) * 0.12 * entrance;
      mesh.position.z = -0.1 + (index + 1) * 0.16 * entrance;
      mesh.rotation.y = (index % 2 ? 0.25 : -0.25) * entrance;
    });
    chassis.rotation.z = 0.14 + 0.35 * settling + inspectAmount * 0.25;
    chassis.position.z = -inspectAmount * 0.5;
    host.dataset.assembly = inspectAmount === 1 ? "open" : inspectAmount === 0 ? "closed" : "moving";
    sculpture.rotation.set(rotationX + Math.sin(elapsed * 0.5) * 0.025 * settling, rotationY - 0.18 * settling, -0.16);
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
    activeBeforeSuspend = elapsed;
    activeStart = 0;
    options.motion(paused ? "paused" : document.hidden || !visible ? "suspended" : "running");
    if (!visible || document.hidden || paused && ready && !force) return;
    frame = requestAnimationFrame(render);
  }
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || disposed) return;
    const halfHeight = 2.7;
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
    [...fronts, side, accent, backing, edgeMaterial, chrome, graphite].forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
    canvas.remove();
  }
  sync();
  return { setPaused: (value: boolean) => { paused = value; sync(); }, setInspected: (value: boolean) => { inspectTarget = value ? 1 : 0; sync(true); }, dispose };
}
