import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const BROWSER_TTL = 30 * 24 * 60 * 60;
export const TICKET_TTL = 90;
export const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const newToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const cookieName = (origin: string) => origin.startsWith("https:") ? "__Host-inkz_buyer" : "inkz_buyer_local";

export function browserToken(cookie: string | null, origin: string): string | null {
  const name = cookieName(origin);
  const values = (cookie ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(name + "="));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return TOKEN.test(value) ? value : null;
}

export function browserCookie(token: string, origin: string) {
  if (!TOKEN.test(token)) throw new Error("Invalid browser credential.");
  return `${cookieName(origin)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${BROWSER_TTL}${origin.startsWith("https:") ? "; Secure" : ""}`;
}

export function sameOrigin(request: Request) {
  const origin = new URL(request.url).origin;
  return request.headers.get("origin") === origin &&
    (!request.headers.has("sec-fetch-site") || request.headers.get("sec-fetch-site") === "same-origin");
}

/** Read bounded form bytes even when a client omits Content-Length. */
export async function smallForm(request: Request): Promise<URLSearchParams | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
