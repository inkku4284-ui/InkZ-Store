# InkZ analytics and recurring costs

Reviewed against official vendor pages on 24 October 2026. Prices below are USD, before tax. No paid plan, domain, analytics collection, drain, or new Production credential was activated by this change.

## Recommended architecture

Keep PostgreSQL/Drizzle as the commerce source of truth: orders, immutable product snapshots, adjustments, entitlements, review authorization, moderation, and owner sessions. Keep Test and Live in different databases and credentials. Do not build another order database from browser events.

Use Vercel Web Analytics for recorded visitors, page views, routes, and time trends. Its [public read API](https://vercel.com/docs/analytics/web-analytics-api) supports a custom owner dashboard; a paid raw-event drain is unnecessary. The server adapter queries `visits/count` and `visits/aggregate`, with an explicit project/team and Production filter. It validates provider responses and returns unavailable on any error. The owner must authenticate before the component renders. API credentials never enter client props or public APIs.

Actual project check: the authenticated read endpoint returned **400, Web Analytics is not enabled for this project**. This is unavailable data, not zero visitors. Collection begins after enablement; previous traffic cannot be reconstructed. The connector separately lacked team authorization; the existing authenticated CLI was used only for this read check.

## Configuration and activation

The implementation is dormant until configured:

| Server variable | Purpose |
| --- | --- |
| `INKZ_ANALYTICS=vercel` | Enable owner dashboard reads |
| `INKZ_VERCEL_ANALYTICS_TOKEN` | Dedicated expiring Vercel access token scoped to the owning team; keep server-only |
| `INKZ_VERCEL_PROJECT_ID` | Fixed `prj_...` identifier, never browser input |
| `INKZ_VERCEL_TEAM_ID` | Fixed `team_...` identifier |
| `INKZ_ANALYTICS_COLLECTION=vercel` | Opt in to public collection; layout also requires Vercel Production |

Use a dedicated token with the least available access. Vercel team tokens may grant broader access than this adapter's read operations; the application cannot reduce the token's provider privileges. Use short expiry and rotate it through server environment management. Never use `NEXT_PUBLIC_` for the token. Do not reuse the deployment-protection bypass secret.

Before enabling collection, confirm the account plan, the stated costs, and the privacy notice. Enable Web Analytics on the project using the [official quickstart](https://vercel.com/docs/analytics/quickstart), then set the collection flag in the approved deployment scope. The official `@vercel/analytics/next` component tracks client navigation. It is mounted once, behind a server-evaluated flag, with no custom sales events.

Privacy policy in code: explicit public route allowlist; exclude download, recovery, admin, APIs and unknown future routes; respect Do Not Track and Global Privacy Control; never send custom events. URLs with query strings or fragments are skipped altogether. This also avoids leaking their identifiers in HTTP Referer headers. Identifying/private document referrers suppress collection; external referrers are accepted only at their clean origin root. This conservative policy loses some campaign/return traffic deliberately. Validate actual intake requests on the hosted deployment before switching collection on for customers. The provider's [redaction guide](https://vercel.com/docs/analytics/redacting-sensitive-data) documents `beforeSend`.

## Meaning of numbers

- Counts are recorded Web Analytics activity, not every request or all-time distinct people. Missing/blocked scripts, privacy opt-outs and skipped URLs reduce coverage.
- Vercel's anonymous visitor hash rotates daily; a person returning on another day can count again. See [visitor identification](https://vercel.com/docs/analytics/privacy-policy).
- The selected count range uses inclusive API timestamps. Sales ranges use an exclusive end, so pass `sales.to - 1 millisecond` to the traffic report.
- Daily, weekly and monthly trends use provider calendar buckets in UTC; the API may expand boundary buckets. Missing rows stay absent, not fabricated zeroes. Top pages retain an `Others` group.
- Only compare Live orders with Production traffic for the same range. A paid-orders/recorded-visitors ratio is an observed sales ratio, not individual customer attribution. Do not mix Sandbox payments, incomplete historical revenue, or unknown visitor coverage into a claimed precise conversion rate.
- Revenue remains ledger-derived. Client events never unlock products or mark an order paid.

## Cost estimate

| Service | Free/testing allowance | Commercial/growth cost |
| --- | --- | --- |
| Vercel hosting | Hobby is for personal, non-commercial work | Pro starts at $20/month, with $20 usage credit; overage, seats and taxes can add cost |
| Vercel Web Analytics | Hobby: 50,000 events/month and one month reporting history | Pro: $3 per 100,000 events, prorated; 12 months history. Optional Plus adds $10/month and is not needed here |
| Neon PostgreSQL | Free: 100 CU-hours/month and 1 GB storage per project, with scale to zero | Launch: $0.106/CU-hour and $0.35/GB-month; no base monthly minimum. Backup/history/other usage can add cost |
| Resend transactional email | Free: 3,000/month, at most 100/day, 3 verified sender domains | Pro: $20/month for 50,000 emails, then $0.90/1,000 extra |
| Sender domain | Must own a DNS-manageable domain; a `vercel.app` hostname cannot authenticate a Resend sender | Registration/renewal quote depends on chosen domain; none was purchased |
| Analytics drains | Not required | If chosen later: Pro/Enterprise and $0.50/GB, plus destination costs |

Sources: [Vercel hosting](https://vercel.com/pricing), [Hobby restrictions](https://vercel.com/docs/plans/hobby), [Web Analytics pricing](https://vercel.com/docs/analytics/limits-and-pricing), [Neon pricing](https://neon.com/pricing), [Resend pricing](https://resend.com/pricing), [drain pricing](https://vercel.com/docs/drains).

Planning example, not an invoice: one Pro developer, 100,000 monthly analytics events, Neon and Resend within Free quotas gives approximately **$20–23/month**, depending on how usage credits apply, plus a domain and tax/other usage. With Neon Launch at 140 CU-hours and 1 GB storage, database compute/storage is about **$15.19/month**, before backups/history; the same example becomes roughly **$35.19–38.19/month**. Existing account plans and Marketplace billing may differ; verify the actual dashboard quote before making a paid change. Stripe transaction fees remain separate and unchanged.

## Other options considered

Vercel [analytics drains](https://vercel.com/docs/drains/reference/analytics) support raw event forwarding, but add a paid ingestion surface, signature verification, deduplication, retention and storage. Use them only if raw events become a real requirement. A home-grown page-view endpoint would duplicate collection and create bot filtering/privacy work. Neither is needed for this store dashboard.
