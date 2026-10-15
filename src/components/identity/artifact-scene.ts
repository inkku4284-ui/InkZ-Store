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
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
  camera.position.set(4.5, 2.6, 9);
  camera.lookAt(0, 0, 0);

  // Procedural studio reflections: no HDR downloads, textures, or model requests.
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.2;
  room.dispose();
  pmrem.dispose();
  const key = new DirectionalLight(0xfff4dc, 4.2);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight(0xeae7e0, 2.5);
  rim.position.set(5, 1, -2);
  scene.add(rim, new AmbientLight(0xeae7e0, 0.3));

  const front = new MeshStandardMaterial({ color: 0xb8b6ad, metalness: 0.88, roughness: 0.3 });
  const side = new MeshStandardMaterial({ color: 0x555753, metalness: 0.85, roughness: 0.4 });
  const red = new MeshStandardMaterial({ color: 0xa43d36, metalness: 0.6, roughness: 0.35 });
  const backing = new MeshStandardMaterial({ color: 0x343735, metalness: 0.85, roughness: 0.45 });
  const edgeMaterial = new LineBasicMaterial({ color: 0xeae7e0, transparent: true, opacity: 0.12 });
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
  plates.forEach(plate => {
    const mesh = layer(plate.points, 0.36, -0.12, [front, side], 0.035, plate.hole);
    const edges = new EdgesGeometry(mesh.geometry, 35);
    geometries.push(edges);
    mesh.add(new LineSegments(edges, edgeMaterial));
  });
  scene.add(sculpture);

  let disposed = false;
  let paused = false;
  let visible = true;
  let frame = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let pointerX = 0;
  let pointerY = 0;
  let rotationX = 0;
  let rotationY = 0;
  let ready = false;
  const frameInterval = 1000 / (coarse ? 20 : 30);

  function render(time: number) {
    frame = 0;
    if (disposed) return;
    const running = visible && !paused && !document.hidden;
    if (running && time - lastFrame < frameInterval) { frame = requestAnimationFrame(render); return; }
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.08) : 0;
    previousTime = time;
    lastFrame = time;
    if (running) {
      elapsed += delta;
      rotationX += (pointerY * 0.12 - rotationX) * 0.075;
      rotationY += (pointerX * 0.2 - rotationY) * 0.075;
    }
    sculpture.rotation.set(rotationX + Math.sin(elapsed * 0.38) * 0.025, rotationY + Math.sin(elapsed * 0.25) * 0.075, -0.11);
    renderer.render(scene, camera);
    if (!ready) { ready = true; options.ready(); }
    if (running) frame = requestAnimationFrame(render);
  }

  function sync() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    previousTime = 0;
    options.motion(paused ? "paused" : document.hidden || !visible ? "suspended" : "running");
    frame = requestAnimationFrame(render);
  }
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || disposed) return;
    const halfHeight = 2.65;
    camera.left = -halfHeight * width / height;
    camera.right = halfHeight * width / height;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    sync();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 });
  intersection.observe(host);
  const pointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  };
  const pointerLeave = () => { pointerX = 0; pointerY = 0; };
  const contextLost = (event: Event) => { event.preventDefault(); dispose(); options.unavailable(); };
  // Stop at the native preference event as well as React's effect cleanup.
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const preferenceChanged = () => { if (motionPreference.matches) { dispose(); options.unavailable(); } };
  host.addEventListener("pointermove", pointerMove);
  host.addEventListener("pointerleave", pointerLeave);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", sync);
  motionPreference.addEventListener("change", preferenceChanged);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    intersection.disconnect();
    host.removeEventListener("pointermove", pointerMove);
    host.removeEventListener("pointerleave", pointerLeave);
    canvas.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", sync);
    motionPreference.removeEventListener("change", preferenceChanged);
    geometries.forEach(geometry => geometry.dispose());
    [front, side, red, backing, edgeMaterial].forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
    canvas.remove();
  }
  sync();
  return { setPaused: (value: boolean) => { paused = value; sync(); }, dispose };
}
