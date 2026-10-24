import { issueDownload, deliveryReply } from "@/lib/delivery/http";

export const runtime = "nodejs";
export const POST = issueDownload;
export const GET = () => deliveryReply("Use the download button on your order page.", 405);
export const HEAD = () => deliveryReply("Method not allowed.", 405);
