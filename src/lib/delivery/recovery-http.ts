import "server-only";
import { after } from "next/server";
import { deliveryConfig } from "./config";
import { deliveryService } from "./runtime";
import { recoveryEmailConfig, sendRecoveryEmail } from "./recovery-email";
import { normalizeReceiptEmail } from "./email-address";
import { browserCookie, browserToken, digest, newToken, privateHeaders, sameOrigin, smallForm } from "./security";
import { deliveryReply } from "./http";
import { clientIp } from "../store/guard";
import { SESSION_ID } from "../store/stripe";

export function recoveryRuntimeConfig() {
  const delivery = deliveryConfig(), email = recoveryEmailConfig();
  return delivery && email ? { delivery, email } : null;
}

const redirect = (path: string) => new Response(null, { status: 303, headers: { ...privateHeaders, Location: path } });

export function createRecoveryHandlers(deps = { config: recoveryRuntimeConfig, service: deliveryService,
  send: sendRecoveryEmail, schedule: (work: () => Promise<void>) => after(work) }) {
  async function requestRecovery(request: Request) {
    if (request.method !== "POST") return deliveryReply("Method not allowed.", 405);
    const config = deps.config();
    if (!config) return deliveryReply("Email recovery is temporarily unavailable. Contact support with your receipt.", 503);
    if (!sameOrigin(request)) return deliveryReply("Request rejected.", 403);
    if (new URL(request.url).origin !== config.delivery.store.origin) return deliveryReply("Use the store's canonical address to restore access.", 403);
    const form = await smallForm(request);
    if (!form || form.getAll("email").length !== 1 || form.getAll("session_id").length > 1 ||
      [...form.keys()].some(key => !["email", "session_id"].includes(key))) return deliveryReply("Request rejected.", 400);
    const email = normalizeReceiptEmail(form.get("email")!);
    const sessionId = form.get("session_id") || "";
    const browser = browserToken(request.headers.get("cookie"), request.url) ?? newToken();
    try {
      const service = deps.service(config.delivery);
      if (!await service.allow(`recovery:ip:${clientIp(request)}`, 6, 900) || !await service.allow("recovery:requests", 300, 60)) {
        return deliveryReply("Please wait before trying again. Contact support if you need help.", 429);
      }
      // Unknown and known purchases get the same response before any lookup/provider call.
      // Next after() keeps this work alive after the response on Vercel; no user data is logged.
      deps.schedule(async () => {
        try {
          if (!email || email !== config.email.testRecipient) return;
          if (!await service.allow(`recovery:email:${email}`, 3, 3600)) return;
          const candidates = sessionId ? (SESSION_ID.test(sessionId) ? [sessionId] : []) : await service.recoverySessions(email);
          for (const candidate of candidates) {
            if (!await service.allow(`recovery:order:${candidate}`, 3, 3600)) continue;
            const challenge = await service.prepareRecovery(candidate, email, browser);
            if (!challenge) continue;
            if (!await service.allow("recovery:send-budget", 80, 86400)) return;
            const sent = await deps.send(config.email, challenge.recipient, config.delivery.store.origin, challenge.token);
            if (sent) await service.markRecoverySent(challenge.token);
            else console.error("InkZ recovery: email delivery unavailable.");
            return;
          }
        } catch { console.error("InkZ recovery: request processing unavailable."); }
      });
      const response = redirect("/recover?sent=1");
      response.headers.set("Set-Cookie", browserCookie(browser, request.url));
      return response;
    } catch { return deliveryReply("Recovery is temporarily unavailable. Please try again shortly.", 503); }
  }

  async function confirmRecovery(request: Request) {
    if (request.method !== "POST") return deliveryReply("Method not allowed.", 405);
    const config = deps.config();
    if (!config) return deliveryReply("Recovery is temporarily unavailable.", 503);
    if (!sameOrigin(request)) return deliveryReply("Request rejected.", 403);
    const browser = browserToken(request.headers.get("cookie"), request.url);
    const form = await smallForm(request);
    if (!browser || !form || form.getAll("token").length !== 1 || [...form.keys()].length !== 1) return redirect("/recover?error=1");
    try {
      const service = deps.service(config.delivery);
      if (!await service.allow(`recovery:confirm:ip:${clientIp(request)}`, 10, 900) ||
        !await service.allow(`recovery:confirm:browser:${digest(browser)}`, 10, 900)) return deliveryReply("Please wait before trying again.", 429);
      const id = await service.recover(form.get("token")!, browser);
      if (!id) return redirect("/recover?error=1");
      const response = redirect(`/download?session_id=${encodeURIComponent(id)}`);
      response.headers.set("Set-Cookie", browserCookie(browser, request.url));
      return response;
    } catch { return deliveryReply("Recovery is temporarily unavailable. Please try the confirmation again shortly.", 503); }
  }
  return { requestRecovery, confirmRecovery };
}

export const { requestRecovery, confirmRecovery } = createRecoveryHandlers();
