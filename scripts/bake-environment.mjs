// Bake the local procedural studio once, avoiding PMREM generation on customer devices.
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const {outputFiles}=await build({stdin:{resolveDir:process.cwd(),contents:`
import { WebGLRenderer, PMREMGenerator, Scene, Color, Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide, DirectionalLight, AmbientLight } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const renderer=new WebGLRenderer(), studio=new Scene(), generator=new PMREMGenerator(renderer);
studio.background=new Color(.006,.007,.009);
// Original dark photographic studio; Blender XYZ maps to Three XZY(-Y).
// Large cards create defined silver highlights; dark intervals stay black.
const cards=[
  [[-3,4,4],2,5,[8,7.76,7.52]],
  [[4,3,-1],.8,4,[11.2,11.7,12.4]],
  [[-1,5,-1],3,.65,[12,12,12]],
  [[1,1,5],.45,3,[2,2,2]],
  [[-2,-1,.5],2,.18,[6,.012,.054]],
  [[-2,0,3],.12,3,[3,.003,.018]],
  [[2,-1,1],.12,2,[2,.002,.012]],
];
for(const [position,width,height,color] of cards){
  const card=new Mesh(new PlaneGeometry(width,height),new MeshBasicMaterial({color:new Color(...color),side:DoubleSide}));
  card.position.set(...position);card.lookAt(0,0,0);studio.add(card);
}
const target=generator.fromScene(studio,0,.1,100,{size:128});
async function read(target){
  const {width,height}=target,pixels=new Uint16Array(width*height*4);
  await renderer.readRenderTargetPixelsAsync(target,0,0,width,height,pixels);
  return {width,height,colorSpace:target.texture.colorSpace,pixels:Array.from(pixels)};
}
const base=await read(target);
// Capture the actual outer sculpture from the core's position. This static
// radiance probe supplies real ring/channel reflections without per-frame
// reflection rendering. Freeze at the authored neutral pose.
const {scene:model}=await new GLTFLoader().loadAsync('/model.glb');
model.getObjectByName('INKZ_Core').visible=false;model.getObjectByName('INKZ_Mark').visible=false;
model.traverse(o=>{if(o.isMesh&&o.material.name==='Embedded_Red')o.material.emissiveIntensity=1.5});
studio.environment=target.texture;studio.add(model);
const key=new DirectionalLight(0xfff6ef,1.6);key.position.set(-4,5,5);
const rim=new DirectionalLight(0xe2e8ff,1.4);rim.position.set(4,2,-3);studio.add(key,rim,new AmbientLight(0xffffff,.025));
const probe=generator.fromScene(studio,0,.1,100,{size:64});
window.baked={base,core:await read(probe)};
probe.dispose();target.dispose();studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});studio.clear();generator.dispose();renderer.dispose();renderer.forceContextLoss();
`},bundle:true,format:"esm",write:false});
const server=createServer((request,response)=>{
  if(request.url==='/model.glb'){response.setHeader('Content-Type','model/gltf-binary');response.end(readFileSync(new URL('../public/models/inkz-rings.glb',import.meta.url)));return;}
  response.setHeader("Content-Type",request.url==="/bake.js"?"text/javascript":"text/html");
  response.end(request.url==="/bake.js"?outputFiles[0].contents:'<!doctype html><script type="module" src="/bake.js"></script>');
}).listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.baked,null,{timeout:30_000});
  const baked=await page.evaluate(()=>window.baked);
  for(const [name,{width,height,colorSpace,pixels}] of Object.entries(baked)){
    const bytes=Buffer.alloc(16+pixels.length*2);bytes.write("INKZ");bytes.writeUInt32LE(1,4);bytes.writeUInt32LE(width,8);bytes.writeUInt32LE(height,12);
    pixels.forEach((value,index)=>bytes.writeUInt16LE(value,16+index*2));
    const asset=name==='base'?'inkz-studio.bin.gz':'inkz-core-studio.bin.gz';
    writeFileSync(new URL('../public/models/'+asset,import.meta.url),gzipSync(bytes,{level:9}));
    console.log(JSON.stringify({asset,width,height,colorSpace,bytes:bytes.length,compressedBytes:gzipSync(bytes,{level:9}).length,format:"INKZ v1 / RGBA16F CubeUV / little endian",source:name==='base'?"Original seven-card dark studio + PMREM 128":"Same sculpture radiance probe at origin, core/inlay excluded",three:"0.186.1"}));
  }
} finally {await browser.close();server.close();}
