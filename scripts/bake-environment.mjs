// Bake the local procedural studio once, avoiding PMREM generation on customer devices.
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const {outputFiles}=await build({stdin:{resolveDir:process.cwd(),contents:`
import { WebGLRenderer, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const renderer=new WebGLRenderer(), studio=new RoomEnvironment(), generator=new PMREMGenerator(renderer);
const target=generator.fromScene(studio,.04,.1,100,{size:64});
const {width,height}=target;
const pixels=new Uint16Array(width*height*4);
await renderer.readRenderTargetPixelsAsync(target,0,0,width,height,pixels);
window.baked={width,height,colorSpace:target.texture.colorSpace,pixels:Array.from(pixels)};
target.dispose();studio.dispose();generator.dispose();renderer.dispose();renderer.forceContextLoss();
`},bundle:true,format:"esm",write:false});
const server=createServer((request,response)=>{
  response.setHeader("Content-Type",request.url==="/bake.js"?"text/javascript":"text/html");
  response.end(request.url==="/bake.js"?outputFiles[0].contents:'<!doctype html><script type="module" src="/bake.js"></script>');
}).listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.baked,{timeout:30_000});
  const {width,height,colorSpace,pixels}=await page.evaluate(()=>window.baked);
  const bytes=Buffer.alloc(16+pixels.length*2);bytes.write("INKZ");bytes.writeUInt32LE(1,4);bytes.writeUInt32LE(width,8);bytes.writeUInt32LE(height,12);
  pixels.forEach((value,index)=>bytes.writeUInt16LE(value,16+index*2));
  writeFileSync(new URL("../public/models/inkz-studio.bin.gz",import.meta.url),gzipSync(bytes,{level:9}));
  console.log(JSON.stringify({width,height,colorSpace,bytes:bytes.length,compressedBytes:gzipSync(bytes,{level:9}).length,format:"INKZ v1 / RGBA16F CubeUV / little endian",source:"Three.js RoomEnvironment + PMREM 64",three:"0.186.1"}));
} finally {await browser.close();server.close();}
