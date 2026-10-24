import "server-only";
import type { AdminConfig } from "./config";

/** Fixed endpoints, no redirects, no provider tokens in storage, logs, or browser responses. */
export async function githubOwnerId(config: AdminConfig, code: string, verifier: string, transport: typeof fetch = fetch): Promise<string | null> {
  const tokenResponse = await transport("https://github.com/login/oauth/access_token", {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8_000),
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: verifier,
      redirect_uri: `${config.origin}/api/admin/auth/callback` }),
  });
  if (!tokenResponse.ok) return null;
  const token = await tokenResponse.json();
  if (typeof token.access_token !== "string" || token.access_token.length > 512 || !token.access_token || token.token_type !== "bearer") return null;
  const userResponse = await transport("https://api.github.com/user", {
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8_000),
    headers: { accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "InkZ-owner-dashboard", authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  return Number.isSafeInteger(user.id) && user.id > 0 ? String(user.id) : null;
}
