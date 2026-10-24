import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const OAUTH_SECONDS = 5 * 60;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
type CookieKind = "session" | "oauth";
export const adminToken = () => randomBytes(32).toString("base64url");
export const adminDigest = (value: string) => createHash("sha256").update(value).digest("hex");
export const pkceChallenge = (value: string) => createHash("sha256").update(value).digest("base64url");
export const adminCookieName = (kind: CookieKind, origin: string) => `${origin.startsWith("https:") ? "__Host-" : ""}inkz_admin${kind === "oauth" ? "_oauth" : ""}`;
export const validAdminToken = (value: string) => TOKEN.test(value);

export function readAdminCookie(cookie: string | null, kind: CookieKind, origin: string) {
  const name = adminCookieName(kind, origin);
  const matches = (cookie ?? "").split(";").map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1);
  const valid = kind === "session" ? TOKEN.test(value) : /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value);
  return valid ? value : null;
}

export function adminCookie(kind: CookieKind, value: string, origin: string, seconds: number) {
  if (value && !(kind === "session" ? TOKEN.test(value) : /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value))) throw new Error("Invalid owner credential.");
  return `${adminCookieName(kind, origin)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${origin.startsWith("https:") ? "; Secure" : ""}`;
}

export function equalAdminToken(left: string, right: string) {
  return TOKEN.test(left) && TOKEN.test(right) && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function canonicalAdminRequest(request: Request, origin: string, mutation = false) {
  if (new URL(request.url).origin !== origin) return false;
  return !mutation || (request.headers.get("origin") === origin &&
    (!request.headers.has("sec-fetch-site") || request.headers.get("sec-fetch-site") === "same-origin"));
}

export const adminHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
