// Encrypts a new build of the product for the store.
//   node scripts/encrypt-product.mjs <path/to/INKZ_CombatFramework.rbxm>
// Uses COMBAT_FILE_KEY from the environment (base64, 32 bytes). Without it, a new key is generated and printed
// ONCE: put it in Vercel as COMBAT_FILE_KEY (Sensitive) and never commit it.
// Writes private/combat-framework.rbxm.enc (12-byte IV | 16-byte tag | AES-256-GCM ciphertext).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createCipheriv, randomBytes, createHash } from "node:crypto";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/encrypt-product.mjs <file.rbxm>");
  process.exit(1);
}
let key = process.env.COMBAT_FILE_KEY ? Buffer.from(process.env.COMBAT_FILE_KEY, "base64") : null;
if (key && key.length !== 32) {
  console.error("COMBAT_FILE_KEY must be base64 of 32 bytes");
  process.exit(1);
}
if (!key) {
  key = randomBytes(32);
  console.log(`New COMBAT_FILE_KEY (store it in Vercel, Sensitive): ${key.toString("base64")}`);
}
const plain = readFileSync(input);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const body = Buffer.concat([cipher.update(plain), cipher.final()]);
mkdirSync("private", { recursive: true });
writeFileSync("private/combat-framework.rbxm.enc", Buffer.concat([iv, cipher.getAuthTag(), body]));
console.log(`Encrypted ${plain.length} bytes (sha256 ${createHash("sha256").update(plain).digest("hex").slice(0, 16)}) -> private/combat-framework.rbxm.enc`);
