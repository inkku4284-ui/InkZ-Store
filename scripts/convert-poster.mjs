import sharp from "sharp";
import { fileURLToPath } from "node:url";
const source = fileURLToPath(new URL("../assets/source/inkz-rings-poster.png", import.meta.url));
const target = fileURLToPath(new URL("../public/images/inkz-rings-poster.webp", import.meta.url));
await sharp(source).webp({ quality:92, effort:6 }).toFile(target);
console.log("Rendered model poster converted to WebP; no image content substituted.");
