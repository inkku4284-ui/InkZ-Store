import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as ledgerSchema from "../ledger/schema";
import { adminOauth, adminSessions } from "./schema";
import { adminDigest, validAdminToken } from "./security";

export type OwnerSession = { ownerId: string; expiresAt: Date };

export function createOwnerStore<T extends PgQueryResultHKT>(db: PgDatabase<T, typeof ledgerSchema>) {
  return {
    async start(state: string, verifier: string, live: boolean, expiresAt: Date) {
      if (!validAdminToken(state) || !validAdminToken(verifier)) throw new Error("Invalid authentication state.");
      await db.transaction(async tx => {
        await tx.delete(adminOauth).where(lt(adminOauth.expiresAt, new Date()));
        await tx.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
        await tx.insert(adminOauth).values({ stateHash: adminDigest(state), verifierHash: adminDigest(verifier), live, expiresAt });
      });
    },
    async consume(state: string, verifier: string, live: boolean) {
      if (!validAdminToken(state) || !validAdminToken(verifier)) return false;
      const deleted = await db.delete(adminOauth).where(and(eq(adminOauth.stateHash, adminDigest(state)),
        eq(adminOauth.verifierHash, adminDigest(verifier)), eq(adminOauth.live, live), gt(adminOauth.expiresAt, new Date())))
        .returning({ stateHash: adminOauth.stateHash });
      return deleted.length === 1;
    },
    async createSession(token: string, live: boolean, ownerId: string, expiresAt: Date) {
      if (!validAdminToken(token) || !/^[1-9][0-9]{0,19}$/.test(ownerId)) throw new Error("Invalid owner credential.");
      await db.insert(adminSessions).values({ tokenHash: adminDigest(token), live, ownerId, expiresAt });
    },
    async session(token: string, live: boolean, owners: readonly string[]): Promise<OwnerSession | null> {
      if (!validAdminToken(token)) return null;
      const [row] = await db.select({ ownerId: adminSessions.ownerId, expiresAt: adminSessions.expiresAt }).from(adminSessions)
        .where(and(eq(adminSessions.tokenHash, adminDigest(token)), eq(adminSessions.live, live), gt(adminSessions.expiresAt, new Date())));
      return row && owners.includes(row.ownerId) ? row : null;
    },
    async revoke(token: string, live: boolean) {
      if (validAdminToken(token)) await db.delete(adminSessions).where(and(eq(adminSessions.tokenHash, adminDigest(token)), eq(adminSessions.live, live)));
    },
    async loginAllowed(live: boolean) {
      // A shared ceiling bounds anonymous OAuth state creation across serverless instances.
      // No IP address, email or usable credential is collected for this limit.
      const now = new Date();
      const keyHash = adminDigest(`owner-login:${live}`);
      const expiresAt = new Date(now.getTime() + 60_000);
      const [row] = await db.insert(ledgerSchema.deliveryLimits).values({ keyHash, hits: 1, expiresAt })
        .onConflictDoUpdate({ target: ledgerSchema.deliveryLimits.keyHash, set: {
          hits: sql`CASE WHEN ${ledgerSchema.deliveryLimits.expiresAt} <= ${now} THEN 1 ELSE ${ledgerSchema.deliveryLimits.hits} + 1 END`,
          expiresAt: sql`CASE WHEN ${ledgerSchema.deliveryLimits.expiresAt} <= ${now} THEN ${expiresAt} ELSE ${ledgerSchema.deliveryLimits.expiresAt} END`,
        } })
        .returning({ hits: ledgerSchema.deliveryLimits.hits });
      return row.hits <= 20;
    },
  };
}

export type OwnerStore = ReturnType<typeof createOwnerStore>;
