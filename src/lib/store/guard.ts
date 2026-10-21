import "server-only";
import { createHash } from "node:crypto";

/** Per-process request limits (best effort; Vercel may run several instances). */
export class RateLimit {
  private readonly hits = new Map<string, { count: number; until: number }>();
  private total = { count: 0, until: 0 };
  constructor(private readonly perIp: number, private readonly overall: number, private readonly windowMs = 60_000) {}
  allow(ip: string, now = Date.now()) {
    for (const [id, hit] of this.hits) if (now >= hit.until) this.hits.delete(id);
    if (now >= this.total.until) this.total = { count: 0, until: now + this.windowMs };
    const id = createHash("sha256").update(ip).digest("hex");
    const hit = this.hits.get(id) ?? { count: 0, until: now + this.windowMs };
    if (this.total.count >= this.overall || hit.count >= this.perIp || this.hits.size >= 5000) return false;
    this.total.count++;
    hit.count++;
    this.hits.set(id, hit);
    return true;
  }
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Checkout may only be opened by this site's own page (same origin, a fresh idempotency UUID, no body). */
export function checkoutRequestAllowed(request: Request, origin: string) {
  return request.headers.get("origin") === origin &&
    (!request.headers.has("sec-fetch-site") || request.headers.get("sec-fetch-site") === "same-origin") &&
    UUID.test(request.headers.get("idempotency-key") ?? "");
}

const store = globalThis as typeof globalThis & { inkzLimits?: { checkout: RateLimit; download: RateLimit } };
export const limits = store.inkzLimits ??= { checkout: new RateLimit(6, 60), download: new RateLimit(20, 300) };
