# Owner dashboard

`/admin` is a private server-rendered workspace. It has no public statistics endpoint and no default credentials. Missing configuration displays an unavailable sign-in state, without querying or exposing sales data. Each server page, action, or API that reads or changes owner data must call `requireOwner()` itself; a layout check alone is not authorization.

## Authentication design

GitHub OAuth is used only to establish the owner's numeric GitHub identity. No customer account system or password database is added. The dedicated app requests no OAuth scopes, exchanges the authorization code on the server, and reads `https://api.github.com/user` on every login. Public GitHub handles and email addresses are never used for authorization. Use GitHub account 2FA for the owner's account.

The flow follows [GitHub's authorization-code documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps): random state, S256 PKCE, an exact configured callback, fixed HTTPS provider endpoints, rejected redirects, and bounded provider timeouts. The browser carries a five-minute HttpOnly host-only cookie containing state and PKCE verifier. PostgreSQL stores only their SHA-256 digests. Callback redemption deletes the matching unexpired database state atomically before contacting GitHub. A copied URL, incorrect browser proof, concurrent callback, replay, expired state, or non-owner identity cannot mint a session.

An authorized owner receives a new 256-bit opaque session cookie. It is HttpOnly, host-only, SameSite=Lax, Secure on HTTPS, and expires after eight hours without sliding renewal. Only its SHA-256 digest, numeric owner ID, mode, and expiry are stored. Every protected request checks the current owner allowlist, mode, database session, and expiry. Removing an ID or disabling configuration immediately closes access. Login rotates any existing session; same-origin POST logout deletes the database session and cookies. A shared database ceiling permits at most 20 login initiations per minute per mode. Expired states and sessions are deleted during login initiation.

No provider access token, customer email, payment identifier, authorization code, cookie, or secret is displayed or logged by this feature. Provider tokens exist only in memory during sign-in and are discarded afterward. Use a dedicated OAuth app with no previously granted repository permissions.

## Configuration and activation

This PR does not create an OAuth app, change secrets, apply a Production migration, or enable the dashboard on any hosted deployment. Keep Preview and Production OAuth apps, database URLs, and owner settings separate.

1. Apply the migrations, including `drizzle/0003_owner_admin.sql`, to the intended isolated database.
2. Register a dedicated GitHub OAuth app. Set its callback exactly to `https://<canonical-store-origin>/api/admin/auth/callback`. GitHub documents that localhost callback ports may vary; this application deliberately requires the configured exact origin.
3. Configure server-only variables:

| Variable | Meaning |
| --- | --- |
| `INKZ_ADMIN` | `test` for Preview/local; `live` only on Vercel Production |
| `INKZ_ORDER_LEDGER` | Same mode as admin; the existing ledger must be fully configured |
| `STORE_ORIGIN` | Explicit canonical HTTPS origin; local HTTP is allowed only in test mode |
| `GITHUB_CLIENT_ID` | Dedicated OAuth app's client ID |
| `GITHUB_CLIENT_SECRET` | Dedicated OAuth app's secret; never a `NEXT_PUBLIC_` variable |
| `INKZ_OWNER_GITHUB_IDS` | Comma-separated numeric GitHub IDs, at most five, no duplicate IDs |
| `DATABASE_URL` | The existing ledger's database URL; remote connections require `sslmode=verify-full` |

The existing ledger also requires a correctly scoped Stripe key, webhook secret, and current product price. Admin configuration never requires or reads the product decryption key. It uses existing payment data and never modifies Stripe resources.

4. Test an allowed owner, a different GitHub account, expired sessions, logout, and configuration removal on Preview before authorizing live activation.

## Revenue definitions

All values come from the configured ledger, separated by Sandbox/Live mode. A missing database or failed query displays an unavailable state. An empty recorded ledger displays honest zero totals and an explicit notice that historical imports may be incomplete.

- **Paid purchases:** recorded orders in `paid` state with a positive capture, grouped by the original `paid_at` timestamp in UTC. Fully refunded purchases remain in this historical purchase count.
- **Gross captured:** actual captured amounts, including purchases that were subsequently refunded. Discounts are already reflected in the captured amount.
- **Successful refunds:** the sum of stored refund records whose current status is `succeeded`. Pending and failed refunds are excluded. Refunds are grouped by original purchase date, regardless of when they were issued.
- **Net after refunds:** captured gross minus successful refunds. This is not a payout balance: processor fees and dispute deductions are excluded.
- **Disputed amount:** displayed separately; disputes whose current state is neither `won` nor `warning_closed`, including open and lost disputes.
- **Product sales:** recorded item quantities and captured revenue for each product in the selected paid-date cohort.

Reports offer 30 daily days, 12 weeks, or 365 days grouped by month. All windows end at the next UTC midnight; first/last weekly or monthly buckets can be partial. Only periods with recorded paid orders appear in the trend table. One read-only repeatable-read transaction keeps totals, product counts, adjustments, and trends on a consistent database snapshot.

Visitor counts, page views, traffic sources, and purchase conversion are unavailable in this slice; no estimated numbers are invented. A subsequent analytics slice can render measured traffic only after the same owner authorization check. Review moderation lives at `/admin/reviews` and must independently call `requireOwner()`.

## Shared interface

`src/lib/admin/auth.ts` exports:

- `requireOwner(request?: Request): Promise<{ ownerId: string; expiresAt: Date } | null>`. Route handlers pass their Request; server pages omit it. It fails closed for missing settings, an incorrect canonical host/origin, malformed or duplicate cookies, a missing/expired/revoked session, a removed owner, or database failure.
- `getAdminContext()` returns `{ config, db, store } | null` for already-authorized server code. **Calling this alone is not authorization.**

`salesMetrics(db, live, { from, to, interval })` returns aggregate-only commerce data for a bounded window of at most 366 days. `interval` is `day`, `week`, or `month`. Start is inclusive and end exclusive. No email, Stripe identifier, or individual purchase record is returned.

## Tests and cost

Run `node --conditions=react-server --import tsx --test tests/server/admin.test.ts` for configuration, cookies, real embedded PostgreSQL state/session persistence, OAuth replay/races, provider boundaries, and revenue SQL. `tests/admin.spec.ts` covers the actual unconfigured browser page and fail-closed auth endpoints on desktop/mobile. Real owner OAuth sign-in still requires a configured dedicated GitHub app; these tests do not claim hosted activation.

No new dependencies, paid authentication plan, or separate database are required. GitHub OAuth and the existing Postgres connection handle this owner-only flow. Database storage for a few hashed state/session records is small; existing Vercel and database plan limits still apply.
