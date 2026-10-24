# Commerce V2 continuation

User authorized implementation of all remaining areas on 24 October 2026.
Production activation, paid plans and live Stripe/secret mutations retain separate approval gates.
Work is split into reviewable branches; no automatic merge.

## Architecture

- Keep the existing Next.js storefront, Stripe Checkout and private encrypted package.
- Owner access: GitHub OAuth, immutable numeric owner ID allowlist, hashed opaque database sessions,
  strict origin/state validation, bounded lifetime and revocable logout. No public owner registration.
- Sales: aggregate reconciled ledger rows, integer minor units, UTC dates, explicit refund/dispute
  attribution; empty/unavailable states never fabricate statistics.
- Reviews: current browser purchase grant plus fresh financial verification; one review per order,
  pending moderation on create/edit, conditional revision approval, no public payment IDs or emails.
- Traffic: server-only official Vercel Web Analytics read API, explicit scoped configuration,
  bounded windows and honest unavailable states. No parallel tracking database or paid drains.
- Live security: retain test-only delivery guard until verified sender, historic reconciliation,
  production isolation and explicit cutover approval. Missing external prerequisites are blockers,
  never bypassed by enabling flags.

## Reviewable increments

1. Existing PR13: operator handoff and Thai testing guide; review links and current evidence.
2. Owner authentication and real sales dashboard: migration 0003, disabled unless configured;
   cover OAuth attacks, expiry/revocation, non-owner denial and financial aggregates.
3. Purchase-linked reviews and storefront integration: migration 0004; cover copied grants,
   refunds, concurrency, rate limiting, moderation edit races, safe public output and responsive UI.
4. Actual analytics read integration, costs and readiness reporting: adapter fixture tests,
   strict scope/date checks, no unconfigured zero statistics; preserve live block.

## Acceptance

- Each migration is additive and registered explicitly; build never migrates remote databases.
- Run focused tests first, then server, lint/type/build and meaningful desktop/mobile regressions.
- Verify sensitive admin routes deny anonymous access and cannot be indexed/cached publicly.
- Review all changes, commit feature slices separately, publish and attach PRs without merging.
- Report code completion separately from provider provisioning and hosted end-to-end activation.
