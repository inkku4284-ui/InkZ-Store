import "server-only";
import { requireOwner } from "../admin/auth";
import { privateHeaders, sameOrigin, smallForm } from "../delivery/security";
import { reviewsConfig } from "./config";
import { reviewsService } from "./runtime";

type ModerationService = { moderate: (id: string, decision: "approved" | "rejected", revision: number) => Promise<boolean> };
type Dependencies = { owner: (request: Request) => Promise<{ ownerId: string } | null>; service: () => ModerationService | null };
const service = () => { const config = reviewsConfig(); return config ? reviewsService(config) : null; };
const reply = (status: number) => new Response(status === 503 ? "Review moderation is unavailable." : "Request rejected.", { status, headers: privateHeaders });

export function createModerationHandler(deps: Dependencies = { owner: requireOwner, service }) {
  return async function moderateReview(request: Request) {
    if (!sameOrigin(request)) return reply(403);
    try {
      if (!await deps.owner(request)) return reply(401);
      const form = await smallForm(request);
      const fields = ["id", "decision", "revision"];
      if (!form || [...form.keys()].some(key => !fields.includes(key)) || fields.some(key => form.getAll(key).length !== 1) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.get("id")!) ||
        !["approved", "rejected"].includes(form.get("decision")!) || !/^[1-9]\d{0,8}$/.test(form.get("revision")!)) return reply(400);
      const reviews = deps.service();
      if (!reviews) return reply(503);
      const changed = await reviews.moderate(form.get("id")!, form.get("decision")! as "approved" | "rejected", Number(form.get("revision")));
      return new Response(null, { status: 303, headers: { ...privateHeaders,
        Location: new URL(`/admin/reviews?result=${changed ? "saved" : "stale"}`, request.url).href } });
    } catch { return reply(503); }
  };
}

export const moderateReview = createModerationHandler();
