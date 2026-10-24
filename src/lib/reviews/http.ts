import "server-only";
import { reviewsConfig } from "./config";
import { reviewsService } from "./runtime";
import { browserToken, privateHeaders, sameOrigin } from "../delivery/security";
import { clientIp } from "../store/guard";
import { COMBAT_SALE } from "../store/config";
import { validateReview } from "./validation";

type Dependencies = { config: typeof reviewsConfig; service: (config: NonNullable<ReturnType<typeof reviewsConfig>>) =>
  Pick<ReturnType<typeof reviewsService>, "allow" | "submit" | "publicList"> };
const reply = (message: string, status: number) => Response.json({ message }, { status, headers: privateHeaders });

async function reviewForm(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32768) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export function createReviewHandlers(deps: Dependencies = { config: reviewsConfig, service: reviewsService }) {
  return {
    async submitReview(request: Request) {
      const config = deps.config();
      if (!config) return reply("Reviews are not available yet.", 503);
      if (!sameOrigin(request) || new URL(request.url).origin !== config.store.origin) return reply("Request rejected.", 403);
      const browser = browserToken(request.headers.get("cookie"), request.url);
      if (!browser) return reply("Open your verified order in the browser used at checkout, or recover your purchase.", 403);
      const form = await reviewForm(request);
      const fields = ["session_id", "rating", "display_name", "body", "website"];
      if (!form || [...form.keys()].some(key => !fields.includes(key)) ||
        fields.some(key => form.getAll(key).length !== 1) || form.get("website") !== "" || !/^[1-5]$/.test(form.get("rating")!)) {
        return reply("Check your review and try again.", 400);
      }
      const input = validateReview({ rating: Number(form.get("rating")), displayName: form.get("display_name"), body: form.get("body") });
      if (!input) return reply("Use 1–5 stars, a name of 2–40 characters and a review of 20–2000 characters. Leave out links and contact details.", 400);
      try {
        const service = deps.service(config);
        if (!await service.allow(`review:ip:${clientIp(request)}`, 20, 60 * 60) ||
          !await service.allow("review:global", 300, 60 * 60)) return reply("Please wait before trying again.", 429);
        const outcome = await service.submit(form.get("session_id")!, browser, input);
        if (outcome === "limited") return reply("Please wait before trying again.", 429);
        if (outcome !== "submitted") return reply("Your purchase could not be verified. Open your order or recover access before reviewing.", 403);
        return reply("Thanks. Your review is awaiting moderation. Edits also need approval before appearing publicly.", 202);
      } catch { return reply("Reviews are temporarily unavailable. Please try again shortly.", 503); }
    },
    async listReviews(request: Request) {
      const config = deps.config();
      if (!config) return reply("Reviews are not available yet.", 503);
      const query = new URL(request.url).searchParams;
      if ([...query.keys()].some(key => !["product", "page"].includes(key)) || query.getAll("product").length > 1 ||
        query.getAll("page").length > 1 || (query.has("page") && !/^[1-9]\d{0,2}$/.test(query.get("page")!))) return reply("Request rejected.", 400);
      const product = query.get("product") ?? COMBAT_SALE.slug;
      const page = Number(query.get("page") ?? 1);
      if (product !== COMBAT_SALE.slug || page > 100) return reply("Reviews were not found.", 404);
      try {
        return Response.json(await deps.service(config).publicList(product, page), { headers: privateHeaders });
      } catch { return reply("Reviews are temporarily unavailable. Please try again shortly.", 503); }
    },
  };
}

export const { submitReview, listReviews } = createReviewHandlers();
