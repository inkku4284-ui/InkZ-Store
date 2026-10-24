# Commerce V2 checkpoint — 24 October 2026

## Review order

| PR | Work | State at this checkpoint |
| --- | --- | --- |
| [13](https://github.com/inkku4284-ui/InkZ-Store/pull/13) | Production handoff and Thai security guide | Reviewed documentation; open, not merged |
| [14](https://github.com/inkku4284-ui/InkZ-Store/pull/14) | Owner OAuth and actual ledger sales dashboard | Ready for review; exact-head GitHub checks and Vercel Preview succeeded |
| [15](https://github.com/inkku4284-ui/InkZ-Store/pull/15) | Purchase-verified reviews and owner moderation | Ready for review; exact-head GitHub checks and Vercel Preview succeeded |
| [16](https://github.com/inkku4284-ui/InkZ-Store/pull/16) | Actual traffic adapter, optional private collection and processing notice | Ready for review; exact-head GitHub checks and Vercel Preview succeeded |

These are stacked branches. Review/merge parents before children and retarget deliberately;
no automatic merge or Production activation has been performed.

Verified provider heads: PR14 `f453b8239452196f5ab2ba6e2442bd9c75236a35`,
PR15 `6d6365fbecd07ba1bd275e14d1f99cd10652bef5`,
PR16 `4782c2a3f858105ecc04a88b856484564d7c835e`.

## Executed checks

- Latest combined server suite: 85 passed, zero failures, one local pooled PostgreSQL skip.
  PGlite applies the registered schema and exercises financial/access/moderation SQL.
- Lint and production build with TypeScript validation passed.
- Full npm audit after adding exact `@vercel/analytics@2.0.1`: zero known vulnerabilities.
  Install used `--ignore-scripts`; the lockfile changes only the analytics package and root declaration.
- Broad desktop/mobile browser checkpoint: 109 passed, one expected skip, two reduced-motion
  second-toggle failures. The two failures led to the accessibility follow-up below; they were
  not ignored or converted to passing expectations.
- After removing optional forced GPU context loss, all six relevant desktop/mobile tests passed:
  reduced-motion toggling, lost-context fallback, and embedded PBR image disposal. Assertions and
  timeouts were unchanged. Existing renderer/resource disposal remains intact.
- The owner workspace was exercised locally with the actual isolated Sandbox ledger and
  database-seeded temporary test sessions. Desktop/mobile passed axe checks, had no page overflow,
  and native Sign out revoked the database session. Test sessions were deleted afterward.
  This verifies the authenticated UI/session path, not real GitHub OAuth provisioning.
- Real Sandbox schema migrations 0003 and 0004 were applied through the existing explicit
  verified-host test migration helper. No Production schema migration was run.
- Local secret scan: 11 known private values, 191 tracked text files, 463 history text blobs,
  24 public/client build assets; no findings and no tracked private env files. It excluded 160
  large/binary blobs and did not scan all external provider content. It is a scoped result.

Owner screenshots and private aggregate evidence remain in ignored `.vercel/`, not source history.
The authenticated UI test uses `http://localhost:3100` as both its configured and browser origin.
Do not substitute a deployment alias for the configured canonical OAuth origin.

## Accessibility follow-up

Authenticated mobile testing identified horizontally scrollable reporting tables that could not
receive keyboard focus. Named focusable regions now expose those tables to keyboard users.
GPU instrumentation identified `forceContextLoss()` as a synchronous software-driver stall;
it simulates a lost context and is unnecessary after `renderer.dispose()`. The follow-up preserves
all geometry/material/texture/bitmap cleanup, listener removal and canvas detachment.

## What is NOT activated or verified yet

- Production still uses the pre-cutover delivery behavior. Live secure delivery remains
  explicitly blocked; the owner-only Resend test sender is unchanged.
- An owned verified sender domain, isolated live database/backup process, full historical
  rights reconciliation and approved Live webhook/cutover are still required.
- A dedicated GitHub OAuth app and scoped server settings are required for hosted owner sign-in.
  No real hosted GitHub login is claimed by the seeded-session test.
- The real Vercel API reports Web Analytics is not enabled for this project. No collection flag,
  paid plan or read credential was enabled. Unavailable traffic is never presented as zero.
- Hosted purchase-to-review and authenticated moderation still need an end-to-end Preview run
  after scoped owner/review configuration. Local SQL/browser tests are not that hosted proof.
- Refund visibility in public reviews follows ledger reconciliation; submission checks Stripe
  freshly. The reporting conversion figure is an observed orders/visitor ratio, not customer attribution.

See [Live gates](./LIVE_CUTOVER_READINESS.md), [analytics and costs](./ANALYTICS_AND_COSTS.md),
[owner setup](./ADMIN_DASHBOARD.md), and [reviews](./VERIFIED_REVIEWS.md).
