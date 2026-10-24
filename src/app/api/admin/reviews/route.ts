import { moderateReview } from "@/lib/reviews/moderation-http";
import { privateHeaders } from "@/lib/delivery/security";

export const runtime = "nodejs";
export const POST = moderateReview;
export const GET = () => new Response("Method not allowed.", { status: 405, headers: privateHeaders });
