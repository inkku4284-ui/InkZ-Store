import { getAdminContext } from "@/lib/admin/auth";
import { createAdminAuthHandlers } from "@/lib/admin/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createAdminAuthHandlers(getAdminContext).logout;
