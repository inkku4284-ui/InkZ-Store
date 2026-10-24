import { requestRecovery } from "@/lib/delivery/recovery-http";
import { deliveryReply } from "@/lib/delivery/http";

export const runtime = "nodejs";
export const maxDuration = 120;
export const POST = requestRecovery;
export const GET = () => deliveryReply("Method not allowed.", 405);
export const HEAD = GET;
