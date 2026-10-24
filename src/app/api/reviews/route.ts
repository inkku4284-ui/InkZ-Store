import { listReviews, submitReview } from "@/lib/reviews/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = listReviews;
export const POST = submitReview;
