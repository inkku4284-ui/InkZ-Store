import "server-only";
import type { AdminConfig } from "./config";
import { githubOwnerId } from "./github";
import type { OwnerStore } from "./store";
import { ADMIN_SESSION_SECONDS, OAUTH_SECONDS, adminCookie, adminHeaders, adminToken, canonicalAdminRequest,
  equalAdminToken, pkceChallenge, readAdminCookie, validAdminToken } from "./security";

export type AdminContext = { config: AdminConfig; store: OwnerStore };
const closed = (status: number) => new Response(status === 503 ? "Owner access is unavailable." : "Owner access denied.", { status, headers: adminHeaders });
const redirect = (destination: string) => new Response(null, { status: 303, headers: { ...adminHeaders, location: destination } });

/** The injected boundary keeps provider I/O testable; production routes use only the fixed GitHub adapter. */
export function createAdminAuthHandlers(context: () => AdminContext | null, identity = githubOwnerId) {
  return {
    async login(request: Request) {
      const ctx = context();
      if (!ctx) return closed(503);
      if (!canonicalAdminRequest(request, ctx.config.origin, true)) return closed(403);
      try {
        if (!await ctx.store.loginAllowed(ctx.config.live)) return closed(429);
        const state = adminToken(); const verifier = adminToken();
        await ctx.store.start(state, verifier, ctx.config.live, new Date(Date.now() + OAUTH_SECONDS * 1000));
        const url = new URL("https://github.com/login/oauth/authorize");
        url.search = new URLSearchParams({ client_id: ctx.config.clientId, redirect_uri: `${ctx.config.origin}/api/admin/auth/callback`,
          scope: "", state, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256", allow_signup: "false" }).toString();
        const response = redirect(url.href);
        response.headers.append("set-cookie", adminCookie("oauth", `${state}.${verifier}`, ctx.config.origin, OAUTH_SECONDS));
        return response;
      } catch { return closed(503); }
    },
    async callback(request: Request) {
      const ctx = context();
      if (!ctx) return closed(503);
      if (!canonicalAdminRequest(request, ctx.config.origin)) return closed(403);
      const url = new URL(request.url);
      const state = url.searchParams.get("state") ?? "";
      const code = url.searchParams.get("code") ?? "";
      const cookie = readAdminCookie(request.headers.get("cookie"), "oauth", ctx.config.origin);
      if (url.searchParams.getAll("state").length !== 1 || url.searchParams.getAll("code").length !== 1 ||
        !validAdminToken(state) || !/^[A-Za-z0-9_.-]{1,200}$/.test(code) || !cookie) return closed(403);
      const [boundState, verifier] = cookie.split(".");
      if (!equalAdminToken(state, boundState)) return closed(403);
      try {
        // Consume atomically BEFORE exchanging code. Replay and concurrent callbacks fail closed.
        if (!await ctx.store.consume(state, verifier, ctx.config.live)) return closed(403);
        const ownerId = await identity(ctx.config, code, verifier);
        if (!ownerId || !ctx.config.ownerIds.includes(ownerId)) return closed(403);
        const oldToken = readAdminCookie(request.headers.get("cookie"), "session", ctx.config.origin);
        if (oldToken) await ctx.store.revoke(oldToken, ctx.config.live);
        const token = adminToken();
        await ctx.store.createSession(token, ctx.config.live, ownerId, new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000));
        const response = redirect(`${ctx.config.origin}/admin`);
        response.headers.append("set-cookie", adminCookie("session", token, ctx.config.origin, ADMIN_SESSION_SECONDS));
        response.headers.append("set-cookie", adminCookie("oauth", "", ctx.config.origin, 0));
        return response;
      } catch { return closed(503); }
    },
    async logout(request: Request) {
      const ctx = context();
      if (!ctx) return closed(503);
      if (!canonicalAdminRequest(request, ctx.config.origin, true)) return closed(403);
      try {
        const token = readAdminCookie(request.headers.get("cookie"), "session", ctx.config.origin);
        if (token) await ctx.store.revoke(token, ctx.config.live);
        const response = redirect(`${ctx.config.origin}/admin`);
        response.headers.append("set-cookie", adminCookie("session", "", ctx.config.origin, 0));
        response.headers.append("set-cookie", adminCookie("oauth", "", ctx.config.origin, 0));
        return response;
      } catch { return closed(503); }
    },
  };
}
