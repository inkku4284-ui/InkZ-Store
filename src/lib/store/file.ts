import "server-only";
import { readFile } from "node:fs/promises";
import { createDecipheriv } from "node:crypto";
import path from "node:path";
import { COMBAT_SALE } from "./config";

/**
 * The product file lives in the repository ENCRYPTED (AES-256-GCM): the repo is public, the key
 * (COMBAT_FILE_KEY) is only in the server environment. Layout: 12-byte IV | 16-byte auth tag | ciphertext.
 * Re-encrypt a new version with scripts/encrypt-product.mjs.
 */
export function decryptPackage(encrypted: Buffer, key: Buffer): Buffer {
  if (encrypted.length < 29) throw new Error("Package file is damaged");
  const iv = encrypted.subarray(0, 12);
  const tag = encrypted.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted.subarray(28)), decipher.final()]);
}

export async function productFile(key: Buffer): Promise<Buffer> {
  const encrypted = await readFile(path.join(process.cwd(), COMBAT_SALE.encryptedFile));
  return decryptPackage(encrypted, key);
}
