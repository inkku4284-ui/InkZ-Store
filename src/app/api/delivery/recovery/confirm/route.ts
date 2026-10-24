import { confirmRecovery } from "@/lib/delivery/recovery-http";
import { deliveryReply } from "@/lib/delivery/http";

export const runtime = "nodejs";
export const POST = confirmRecovery;
export const GET = () => deliveryReply("Method not allowed.", 405);
export const HEAD = GET;
