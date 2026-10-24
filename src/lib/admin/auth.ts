import "server-only";
import { headers } from "next/headers";
import { adminConfig } from "./config";
import { getLedgerDatabase } from "../ledger/database";
import { createOwnerStore } from "./store";
import { canonicalAdminRequest, readAdminCookie } from "./security";

export function getAdminContext() {
  const config = adminConfig();
  if (!config) return null;
  const db = getLedgerDatabase(config.databaseUrl);
  return { config, db, store: createOwnerStore(db) };
}

/** Call in EACH server page/action/API that reads or changes owner data; layouts are insufficient. */
export async function requireOwner(request?: Request) {
  try {
    const context = getAdminContext();
    if (!context || (request && !canonicalAdminRequest(request, context.config.origin))) return null;
    const incoming = request?.headers ?? await headers();
    if (!request && incoming.get("host") !== new URL(context.config.origin).host) return null;
    const token = readAdminCookie(incoming.get("cookie"), "session", context.config.origin);
    if (!token) return null;
    return await context.store.session(token, context.config.live, context.config.ownerIds);
  } catch { return null; }
}
