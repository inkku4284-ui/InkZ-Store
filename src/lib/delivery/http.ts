import "server-only";
import { deliveryConfig } from "./config";
import { deliveryService } from "./runtime";
import { browserToken, privateHeaders, sameOrigin, smallForm } from "./security";
import { clientIp } from "../store/guard";
import { productFile } from "../store/file";
import { COMBAT_SALE } from "../store/config";

export const deliveryReply = (message: string, status: number) => new Response(message, {
  status, headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
});

export function createDeliveryHandlers(deps = { config: deliveryConfig, service: deliveryService, file: productFile }) {
  async function issueDownload(request: Request) {
    const config = deps.config();
    if (!config) return deliveryReply("Downloads are not available.", 503);
    if (!sameOrigin(request)) return deliveryReply("Request rejected.", 403);
    const browser = browserToken(request.headers.get("cookie"), request.url);
    if (!browser) return deliveryReply("Open your order page in the browser used at checkout.", 403);
    const form = await smallForm(request);
    if (!form || form.getAll("session_id").length !== 1 || [...form.keys()].length !== 1) return deliveryReply("Request rejected.", 400);
    try {
      const service = deps.service(config);
      if (!await service.allow(`ticket:ip:${clientIp(request)}`, 20, 60) || !await service.allow("ticket:global", 300, 60)) {
        return deliveryReply("Please wait a minute and try again.", 429);
      }
      const token = await service.issue(form.get("session_id")!, browser);
      if (!token) return deliveryReply("Access could not be verified. Return to your order page or contact support with your receipt.", 403);
      return new Response(null, { status: 303, headers: { ...privateHeaders, Location: `/api/download?ticket=${token}` } });
    } catch { return deliveryReply("The download is temporarily unavailable. Please try again shortly.", 503); }
  }

  async function secureDownload(request: Request) {
    const config = deps.config();
    if (!config) return deliveryReply("Downloads are not available.", 503);
    const browser = browserToken(request.headers.get("cookie"), request.url);
    const query = new URL(request.url).searchParams;
    const token = query.get("ticket") ?? "";
    if (!browser || query.getAll("ticket").length !== 1) return deliveryReply("Return to your order page to request a download.", 403);
    try {
      const service = deps.service(config);
      if (!await service.allow(`download:ip:${clientIp(request)}`, 20, 60) || !await service.allow("download:global", 300, 60)) {
        return deliveryReply("Please wait a minute and try again.", 429);
      }
      if (!await service.redeem(token, browser)) return deliveryReply("Download expired or access unavailable. Return to your order page.", 403);
      // Decrypt only after authorization. On a file failure the buyer can request a new ticket.
      const file = await deps.file(config.store.fileKey);
      return new Response(new Uint8Array(file), { headers: { ...privateHeaders,
        "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${COMBAT_SALE.fileName}"`,
        "Content-Length": String(file.length),
      } });
    } catch { return deliveryReply("The download is temporarily unavailable. Please try again shortly.", 503); }
  }

  return { issueDownload, secureDownload };
}

export const { issueDownload, secureDownload } = createDeliveryHandlers();
