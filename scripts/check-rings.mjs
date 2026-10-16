import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh } from "three";
const bytes = readFileSync(new URL("../public/models/inkz-rings.glb", import.meta.url));
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error("Invalid glTF 2 GLB header");
const buffer = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const { scene } = await new GLTFLoader().parseAsync(buffer, "");
for (const name of ["INKZ_Core","Ring_Primary","Ring_Secondary","Ring_Tertiary","Accent_Light_A","Accent_Light_B"]) {
  if (!(scene.getObjectByName(name) instanceof Mesh)) throw new Error(`Missing model mesh: ${name}`);
}
let triangles=0,meshes=0;
scene.traverse(object => { if (object instanceof Mesh) { meshes++; triangles+=(object.geometry.index?.count ?? object.geometry.attributes.position.count)/3; } });
if (triangles > 100000 || bytes.length > 1500000) throw new Error("Model exceeds its budget");
console.log(JSON.stringify({ format:"glTF 2.0 / actual GLBLoader parse", bytes:bytes.length, gzip_estimate:gzipSync(bytes,{level:9}).length, triangles, meshes, independentlyNamedRings:3 },null,2));
