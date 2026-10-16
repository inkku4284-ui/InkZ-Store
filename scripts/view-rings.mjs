// Local, independent glTF inspection; not a Next.js route or deployed viewer.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    import { ACESFilmicToneMapping, AmbientLight, Color, CubeUVReflectionMapping, DataTexture, DirectionalLight, HalfFloatType, LinearFilter, LinearSRGBColorSpace, Mesh, OrthographicCamera, RGBAFormat, Scene, WebGLRenderer } from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    const renderer=new WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.setSize(innerWidth,innerHeight); renderer.toneMapping=ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
    document.body.appendChild(renderer.domElement);
    const scene=new Scene(); scene.background=new Color('#0a0a0b'); scene.environmentIntensity=1;
    const packed=await fetch('/studio.bin.gz');
    const studio=await new Response(packed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const header=new DataView(studio),width=header.getUint32(8,true),height=header.getUint32(12,true),pixels=new Uint16Array(width*height*4);
    for(let i=0;i<pixels.length;i++)pixels[i]=header.getUint16(16+i*2,true);
    const environment=new DataTexture(pixels,width,height,RGBAFormat,HalfFloatType);
    environment.mapping=CubeUVReflectionMapping;environment.colorSpace=LinearSRGBColorSpace;environment.minFilter=LinearFilter;environment.magFilter=LinearFilter;environment.needsUpdate=true;scene.environment=environment;
    const key=new DirectionalLight(0xfff6ef,1.6);key.position.set(-4,5,5);
    const rim=new DirectionalLight(0xe2e8ff,1.4);rim.position.set(4,2,-3);scene.add(key,rim,new AmbientLight(0xffffff,.025));
    const camera=new OrthographicCamera(-2.45*innerWidth/innerHeight,2.45*innerWidth/innerHeight,2.45,-2.45,.1,40); camera.position.set(3.4,2.5,7);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=false; controls.update();
    const render=()=>renderer.render(scene,camera); controls.addEventListener('change',render);
    const {scene:model}=await new GLTFLoader().loadAsync('/model.glb'); scene.add(model);
    const coreBytes=await new Response((await fetch('/core-studio.bin.gz')).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const coreHeader=new DataView(coreBytes),coreWidth=coreHeader.getUint32(8,true),coreHeight=coreHeader.getUint32(12,true),corePixels=new Uint16Array(coreWidth*coreHeight*4);
    for(let i=0;i<corePixels.length;i++)corePixels[i]=coreHeader.getUint16(16+i*2,true);
    const coreEnvironment=new DataTexture(corePixels,coreWidth,coreHeight,RGBAFormat,HalfFloatType);
    coreEnvironment.mapping=CubeUVReflectionMapping;coreEnvironment.colorSpace=LinearSRGBColorSpace;coreEnvironment.minFilter=LinearFilter;coreEnvironment.magFilter=LinearFilter;coreEnvironment.needsUpdate=true;
    const core=model.getObjectByName('INKZ_Core');core.material=core.material.clone();core.material.envMap=coreEnvironment;
    let triangles=0; model.traverse(o=>{if(o instanceof Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.material.name==='Embedded_Red')o.material.emissiveIntensity=1.5;}});
    document.querySelector('output').textContent='glTF 2.0 / '+triangles.toLocaleString()+' triangles / drag to orbit';
    document.querySelector('button').onclick=()=>{model.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=!m.wireframe;});render();};
    addEventListener('resize',()=>{camera.left=-2.45*innerWidth/innerHeight;camera.right=2.45*innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
    window.review={pose:(x,y,z)=>{camera.position.set(x,y,z);controls.update();render();},model,renderer,scene,camera};
    await renderer.compileAsync(scene,camera);render(); document.body.dataset.ready='true';
  ` }, bundle:true, format:"esm", write:false,
});
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>INKZ — independent GLB inspection</title><style>body{margin:0;background:#0a0a0b;color:#f2f0eb;font:13px monospace}header{position:absolute;top:24px;left:24px;display:grid;gap:12px}button{font:inherit;color:inherit;background:#1c1c20;border:1px solid #939399;padding:12px;cursor:pointer}</style><header><strong>THE RINGS / FORM 001 — independent GLB viewer</strong><output>Loading actual model…</output><button>Toggle wireframe</button></header><script type="module" src="/viewer.js"></script></html>`;
const files = new Map([
  ["/", {type:"text/html; charset=utf-8",body:html}],
  ["/viewer.js", {type:"text/javascript",body:bundle.outputFiles[0].contents}],
  ["/core-studio.bin.gz",{type:"application/octet-stream",body:readFileSync(new URL("../public/models/inkz-core-studio.bin.gz",import.meta.url))}],
  ["/studio.bin.gz",{type:"application/octet-stream",body:readFileSync(new URL("../public/models/inkz-studio.bin.gz",import.meta.url))}],
  ["/model.glb", {type:"model/gltf-binary",body:readFileSync(new URL("../public/models/inkz-rings.glb",import.meta.url))}],
]);
createServer((request,response)=>{
  const file=files.get(request.url);
  if(!file) { response.writeHead(404); response.end(); return; }
  response.writeHead(200,{"Content-Type":file.type,"X-Content-Type-Options":"nosniff","Cache-Control":"no-store"}); response.end(file.body);
}).listen(3112,"127.0.0.1",()=>console.log("Independent GLB viewer: http://127.0.0.1:3112 (local only; Ctrl-C to stop)"));
