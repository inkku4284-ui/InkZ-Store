import { readFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh } from "three";
import sharp from "sharp";
// Node has no browser ImageBitmap. Decode embedded PNGs with Sharp for this
// CPU structure check; Playwright separately verifies real GPU texture upload.
globalThis.self = globalThis;
globalThis.createImageBitmap = async blob => {
  const {data,info}=await sharp(Buffer.from(await blob.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {width:info.width,height:info.height,data,close(){}};
};
const bytes = readFileSync(new URL("../public/models/inkz-rings.glb", import.meta.url));
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error("Invalid glTF 2 GLB header");
const buffer = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const { scene } = await new GLTFLoader().parseAsync(buffer, "");
for (const name of ["INKZ_Core","Ring_Primary","Ring_Secondary","Ring_Tertiary","Accent_Light_A","Accent_Light_B"]) {
  if (!(scene.getObjectByName(name) instanceof Mesh)) throw new Error(`Missing model mesh: ${name}`);
}
const titanium = scene.getObjectByName("Primary_Titanium_Panels");
if (!(titanium instanceof Mesh) || !titanium.material.roughnessMap || !titanium.geometry.attributes.uv) throw new Error("Missing exported PBR machining map / UVs");
for(const name of ["Ring_Primary","Ring_Secondary","Ring_Tertiary"]) {
  const ring=scene.getObjectByName(name);
  ring.geometry.computeBoundingBox();
  const bounds=ring.geometry.boundingBox;
  // glTF Y-up converts each unrotated Blender hoop axis to local Y.
  if(bounds.max.y-bounds.min.y < .25) throw new Error("Ring regressed to a flat washer");
}
let triangles=0,meshes=0;
scene.traverse(object => { if (object instanceof Mesh) { meshes++; triangles+=(object.geometry.index?.count ?? object.geometry.attributes.position.count)/3; } });
if (triangles > 100000 || bytes.length > 1500000) throw new Error("Model exceeds its budget");
console.log(JSON.stringify({ format:"glTF 2.0 / actual GLTFLoader parse", bytes:bytes.length, gzip_estimate:gzipSync(bytes,{level:9}).length, triangles, meshes, independentlyNamedRings:3 },null,2));

const studioBytes = readFileSync(new URL("../public/models/inkz-studio.bin.gz", import.meta.url));
const studio = gunzipSync(studioBytes);
if (studio.length !== 1572880 || studio.toString("ascii",0,4) !== "INKZ" || studio.readUInt32LE(4) !== 1 || studio.readUInt32LE(8) !== 384 || studio.readUInt32LE(12) !== 512) throw new Error("Invalid prefiltered studio texture");
console.log(JSON.stringify({studioGzipBytes:studioBytes.length,studioDecodedBytes:studio.length,width:384,height:512,runtimePMREMCapture:false}));

const coreProbeBytes=readFileSync(new URL("../public/models/inkz-core-studio.bin.gz",import.meta.url));
const coreProbe=gunzipSync(coreProbeBytes);
if(coreProbe.length!==1572880 || coreProbe.toString("ascii",0,4)!=="INKZ" || coreProbe.readUInt32LE(4)!==1 || coreProbe.readUInt32LE(8)!==384 || coreProbe.readUInt32LE(12)!==512)throw new Error("Invalid core radiance probe");
console.log(JSON.stringify({coreProbeGzipBytes:coreProbeBytes.length,coreProbeDecodedBytes:coreProbe.length,width:384,height:512,runtimeReflectionCapture:false}));
