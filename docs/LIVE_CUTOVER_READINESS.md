# Live secure-delivery readiness

The new guest-delivery code still refuses Live mode in `src/lib/delivery/config.ts`. The Resend adapter still restricts email to the configured owner test mailbox. This change does not remove either safeguard. Merging code alone does not establish sender ownership, import old customer rights, or prove webhook completeness.

## Work that can be completed without changing Live

- Implement and test owner authentication, dashboard queries, purchase-linked reviews and storefront interactions on a feature branch.
- Prepare reviewed schema migrations and run them against isolated Test data.
- Implement the dormant Web Analytics read/collection adapter and explain costs before activation; see [analytics and costs](ANALYTICS_AND_COSTS.md).
- Review the Production cutover and recovery procedure, preserve the known-good deployment, and keep a rollback owner/time window.

## External gates still required

| Gate | Required evidence before Live activation |
| --- | --- |
| Owned sender | DNS-manageable domain, Resend domain reports verified, approved sender mailbox matches that domain, SPF/DKIM and delivery demonstrated |
| Isolated Live database | Production-only credentials and database/Neon branch, verified TLS, schema applied and backed up; no shared Test data or Preview credential access |
| Historical customer rights | Dry-run reconciliation over the full sales history, reviewed legacy prices, then approved apply and counts/amounts reconciled against Stripe; refunded/disputed orders checked |
| Live webhook | Separate endpoint and signing secret, correct event subscriptions, raw-body signature verification and retry proof; this requires explicit approval to change Live Stripe resources |
| Delivery configuration | Production origin and mode agree across store/ledger/delivery, valid private file key, no public product files; sender and migration gates satisfied before modifying the current Live block |
| Email recovery | Real customer recovery works on a fresh browser; used/expired/wrong-browser proof rejected; refund revokes access; provider failures remain generic and retryable |
| Release approval | Reviewable PRs, exact-head tests and CI pass, explicit approval to deploy and activate; no silent flag change |

Do not add an environment variable that merely claims “domain verified” or “history complete” and treat it as proof. Keep the evidence in the reviewed cutover record, without customer emails, payment identifiers, API keys, database URLs or decrypted files. Verify provider status and reconciliation results with the approving operator.

## Safe activation order

1. Obtain sender domain and configure DNS with owner approval; leave the test sender restriction until its replacement is reviewed.
2. Prepare the isolated Production database and backup/restore process. Apply reviewed migrations without enabling new delivery.
3. Reconcile historical orders with approved read/apply scope and check sample paid/refunded/disputed customers. Avoid deleting legacy access before replacements work.
4. Configure and verify the approved Live webhook in shadow-ledger mode. Confirm retries, duplicates and current payment state converge correctly.
5. Review a small follow-up PR that adds the verified sender configuration and guarded Live support. Run a fresh-browser recovery and refund exercise under an explicitly agreed Live test plan; never charge or refund a customer as a test.
6. Approve the exact release, activate the scoped flags, observe checkout/delivery failures, and retain the previous deployment. Record success or roll back promptly.

## Rollback constraints

Stop new purchases if secure delivery cannot safely fulfill them. Reverting from secure delivery to Session-ID-only delivery would restore reusable-link access; do not silently do that as a security rollback. Prefer the reviewed previous deployment/configuration and a documented support path for already paid customers. Do not delete the ledger or revoke legitimate existing entitlements while investigating. Pause email sends if sender credentials fail, preserve order records and retryable webhooks, and record only non-sensitive operational outcomes.

All items above remain operational gates, not claims of work already performed. This document purchases nothing and changes no Live resource or secret.
