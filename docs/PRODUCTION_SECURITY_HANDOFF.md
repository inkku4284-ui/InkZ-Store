# Production security cutover and next work

Status baseline: main `91f1ec5`, after PRs #10, #11 and #12 merged.
This is an operator handoff, not authorization to change Production.
Recheck provider configuration before any future cutover.

## What is available now

| Area | Production | Sandbox Preview |
| --- | --- | --- |
| Existing Stripe Checkout / PromptPay | Live money; existing delivery | Test payments |
| Durable ledger | Code merged; activation still separate | Isolated test database and signed webhook |
| Browser-bound, single-use delivery | Disabled; intentionally test-only | Implemented and tested |
| Receipt-email recovery | Disabled | Owner-only Resend test sender |
| Storefront V2 | Existing implementation in repository | Existing implementation |
| Owner dashboard / moderated purchase reviews | Not implemented by these commerce PRs | Future work |

The public store is https://inkz-store.vercel.app.
The long branch deployment URL is Preview; confirm its TEST MODE label and API status before paying.
Never use a real payment to check Preview.

## Gates before any live cutover

1. Obtain an owned sender domain and DNS access. Verify the sender with Resend,
   disable tracking for authorization messages, and test a controlled recipient inbox.
   The current `onboarding@resend.dev` adapter permits only the account owner's address.
2. Implement and review live-capable delivery and recovery configuration in a separate PR.
   `src/lib/delivery/config.ts` explicitly returns null for live mode.
   `src/lib/delivery/recovery-email.ts` accepts only test recovery and uses the test sender.
   Changing environment flags alone cannot enable secure live delivery.
3. Extend the cleanup command for the reviewed live configuration:
   `scripts/prune-delivery.ts` currently depends on the test-only delivery guard.
   Set a retention/cleanup schedule and review database roles and restore procedure.
4. Provision a distinct Production database only after approval. Do not reuse the Preview
   database or automatically copy its secrets. Require verified TLS and confirm the target host.
5. With explicit approval for live integration/configuration, configure a live shadow ledger
   and correctly scoped signed webhook. Use the 13 subscriptions in
   [COMMERCE_LEDGER.md](./COMMERCE_LEDGER.md#event-subscriptions).
   Review SDK/endpoint compatibility and delivery retries. Keep secure delivery off.
6. Reconcile all historical sale windows and approved old prices. Resolve every error,
   unrecognized order and truncated result. Compare captured amounts, successful refunds,
   disputes and active entitlements with Stripe. Never multiply quantity by today's price.
7. Test historical URL + receipt recovery, lost URL + email recovery, new device,
   pending/failed PromptPay, full/partial refund, disputes, provider outages,
   copied links, replay and concurrent redemption. Confirm customer inbox receipt
   and download, not just provider acceptance.
8. Record the exact reviewed commit, green CI, restore evidence, customer support procedure
   and delivery/privacy policy. Obtain explicit approval for Production configuration
   changes and cutover before enabling the reviewed release.

## Existing operator commands

These are reference commands, not instructions to run against Production now.
All commands use the environment already selected by the operator; verify it first.
The package scripts read ignored `.env.local` when present. Do not print that file,
put secrets in CLI arguments, commit it or copy Preview values into Production.

```powershell
# Schema changes only after inspecting the target and obtaining required approval.
npm.cmd run db:migrate -- --confirm-host=VERIFIED_DATABASE_HOST

# Read-only Stripe lookup; no order writes by default.
npm.cmd run orders:reconcile -- --from=2026-10-01 --to=2026-10-24

# Only after reviewing the complete dry run and target host.
npm.cmd run orders:reconcile -- --from=2026-10-01 --to=2026-10-24 --apply --confirm-host=VERIFIED_DATABASE_HOST

# Test-only cleanup today: dry run, then explicitly approved apply.
npm.cmd run delivery:prune
npm.cmd run delivery:prune -- --apply --confirm-host=VERIFIED_TEST_DATABASE_HOST
```

Reconciliation windows are UTC, end-exclusive, at most 31 days and 500 Sessions.
Narrow and repeat truncated windows. Legacy price allowlists require explicit review;
see [SECURE_DELIVERY.md](./SECURE_DELIVERY.md#historical-customers).
Migration and reconciliation writes do not belong in build commands.

## Incident handling and rollback

- Before activation, keep a known-good release reference and an explicit incident owner.
- After activation, a failed database, Stripe lookup or invalid enabled configuration
  must deny delivery; do not turn off the security flag as an emergency bypass.
  Turning it off restores legacy Session-ID delivery and weakens authorization.
- Restore a known-good secure release/configuration or pause checkout and delivery
  using a reviewed procedure. Clearly communicate temporary recovery unavailability.
- Preserve financial records and webhook receipts. Do not drop tables or delete receipts
  to replay events. Fix ingestion, retry failures, then reconcile gaps.
- Already downloaded files cannot be recalled. This protects delivery access, not DRM.

## Next reviewable PRs

1. **Live recovery readiness:** verified sender configuration, mode isolation,
   cleanup support and regression tests; leave live activation behind approval.
   Domain/DNS is the external dependency.
2. **Owner authentication:** choose the actual identity provider and owner allowlist;
   enforce authorization on every admin page and API. No public registration path
   grants owner access. Test unauthenticated and non-owner denial.
3. **Sales dashboard:** derive counts and integer-minor-unit financial totals from
   reconciled ledger data. Define dates, refund and dispute accounting explicitly.
   Until the live ledger is reconciled, show unavailable/incomplete states.
4. **Traffic analytics:** investigate Vercel analytics export/API access, available
   retention and pricing before choosing an integration. Never invent visitor numbers
   or report conversion across incompatible visitor/payment time windows.
5. **Verified reviews:** reuse purchase-linked guest authorization, check current
   entitlement, moderate before publishing, validate bounded plain text and apply
   persistent rate limits. Public output excludes receipt emails and payment IDs.
6. **Storefront review integration:** extend the existing V2 interface with real approved
   reviews and verify video, Buy Now, accessibility and mobile layouts. Audit current
   visuals first; do not assume the storefront needs to be rebuilt from zero.

No new recurring services or paid plans are provisioned by this document.
Current provider prices and account quotas must be checked before selecting a plan.
