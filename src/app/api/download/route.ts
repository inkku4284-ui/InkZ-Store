import { COMBAT_SALE, storeConfig } from "@/lib/store/config";
import { orderFor, stripeClient } from "@/lib/store/stripe";
import { productFile } from "@/lib/store/file";
import { clientIp, limits } from "@/lib/store/guard";

export const runtime = "nodejs";
const text = (body: string, status: number) => new Response(body, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(request: Request) {
  const config = storeConfig();
  if (!config) return text("Downloads are not available.", 503);
  if (!limits.download.allow(clientIp(request))) return text("Too many downloads, please wait a minute.", 429);
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  const order = await orderFor(stripeClient(config), config, sessionId);
  if (order.state === "pending") return text("Your payment is still being confirmed. Refresh the order page in a moment.", 409);
  if (order.state !== "paid") return text("This download link is not valid.", 403);
  let file: Buffer;
  try {
    file = await productFile(config.fileKey);
  } catch {
    return text("The download is temporarily unavailable. Contact support with your receipt.", 503);
  }
  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${COMBAT_SALE.fileName}"`,
      "Content-Length": String(file.length),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
