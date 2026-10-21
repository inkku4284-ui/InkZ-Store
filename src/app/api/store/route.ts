import { storeStatus } from "@/lib/store/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Is buying open right now (and in which mode)? Read by the product page's purchase panel. */
export async function GET() {
  const status = await storeStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
