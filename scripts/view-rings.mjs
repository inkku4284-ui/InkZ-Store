// Local, independent glTF inspection; not a Next.js route or deployed viewer.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    import { ACESFilmicToneMapping, Color, DirectionalLight, Mesh, PerspectiveCamera, PMREMGenerator, Scene, WebGLRenderer } from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
    const renderer=new WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.setSize(innerWidth,innerHeight); renderer.toneMapping=ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
    const scene=new Scene(); scene.background=new Color('#0a0a0b');
    const room=new RoomEnvironment(), pmrem=new PMREMGenerator(renderer);
    const environment=pmrem.fromScene(room,.04); scene.environment=environment.texture; room.dispose(); pmrem.dispose();
    const light=new DirectionalLight(0xffffff,4); light.position.set(-4,5,5); scene.add(light);
    const camera=new PerspectiveCamera(35,innerWidth/innerHeight,.1,40); camera.position.set(3.4,2.5,7);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=false; controls.update();
    const render=()=>renderer.render(scene,camera); controls.addEventListener('change',render);
    const {scene:model}=await new GLTFLoader().loadAsync('/model.glb'); scene.add(model);
    let triangles=0; model.traverse(o=>{if(o instanceof Mesh) triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
    document.querySelector('output').textContent='glTF 2.0 / '+triangles.toLocaleString()+' triangles / drag to orbit';
    document.querySelector('button').onclick=()=>{model.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=!m.wireframe;});render();};
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
    render(); document.body.dataset.ready='true';
  ` }, bundle:true, format:"esm", write:false,
});
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>INKZ — independent GLB inspection</title><style>body{margin:0;background:#0a0a0b;color:#f2f0eb;font:13px monospace}header{position:absolute;top:24px;left:24px;display:grid;gap:12px}button{font:inherit;color:inherit;background:#1c1c20;border:1px solid #939399;padding:12px;cursor:pointer}</style><header><strong>THE RINGS / FORM 001 — independent GLB viewer</strong><output>Loading actual model…</output><button>Toggle wireframe</button></header><script type="module" src="/viewer.js"></script></html>`;
const files = new Map([
  ["/", {type:"text/html; charset=utf-8",body:html}],
  ["/viewer.js", {type:"text/javascript",body:bundle.outputFiles[0].contents}],
  ["/model.glb", {type:"model/gltf-binary",body:readFileSync(new URL("../public/models/inkz-rings.glb",import.meta.url))}],
]);
createServer((request,response)=>{
  const file=files.get(request.url);
  if(!file) { response.writeHead(404); response.end(); return; }
  response.writeHead(200,{"Content-Type":file.type,"X-Content-Type-Options":"nosniff","Cache-Control":"no-store"}); response.end(file.body);
}).listen(3112,"127.0.0.1",()=>console.log("Independent GLB viewer: http://127.0.0.1:3112 (local only; Ctrl-C to stop)"));
