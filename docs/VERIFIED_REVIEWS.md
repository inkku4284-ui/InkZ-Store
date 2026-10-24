# Purchase-linked reviews

Reviews are opt-in and disabled by default. Set `INKZ_REVIEWS=test` only on an isolated Sandbox deployment whose secure-delivery and ledger configuration already validate. A `live` flag cannot bypass secure delivery's Production cutover guard. No provider resources, secrets, paid plans, or Production configuration are created by this feature.

## Customer flow

1. Pay through the existing Checkout in the same browser, or recover the purchase with the existing email proof.
2. Open the verified download page and submit a 1–5 star rating, public nickname, and 20–2000 character plain-text review. No full customer account is needed.
3. The API requires a same-origin URL-encoded POST and the host-only buyer cookie. A Checkout Session URL alone cannot authorize a review. Request bytes are capped at 32 KiB, including requests without Content-Length. Unexpected or repeated fields, nonempty honeypots, invalid ratings, email addresses, markup, URLs, recognizable payment references and API-key patterns are rejected.
4. An unexpired hashed browser grant is checked before any Stripe lookup, then checked again inside the ledger's per-order transaction lock. A current Stripe snapshot must yield an active entitlement for this product. Pending, refunded, disputed, expired, wrong-mode, and unrelated purchases cannot submit.
5. A unique order-item constraint permits one review per purchase. Edits update that row and always return it to pending moderation. Three submissions per order and ten per browser per 24 hours are permitted; the HTTP boundary also limits an IP to 20 and all requests to 300 per hour. All limiter keys are SHA-256 digests stored in the shared database; counters survive function restarts.

These are abuse limits, not a claim that all spam is preventable. A legitimately paid buyer can still write an unhelpful review; moderation remains necessary.

## Moderation

`createReviews(...).ownerList(status)` returns bounded, private moderation candidates. The caller must authenticate the configured store owner before invoking it. No public moderation endpoint exists. Root owner integration uses `/admin/reviews` and its authenticated API.

`moderate(id, "approved" | "rejected", revision)` publishes or rejects only the exact review revision that the owner saw. An edit racing with an owner approval cannot publish unseen text. A mismatched revision returns false and requires the moderator to reload.

Approved public output selects only the review UUID, rating, chosen public nickname, text, creation date and verified-purchase boolean. It never selects customer email, order UUID, Checkout Session, payment, charge, receipt, browser hash, or delivery credentials. React renders text without raw HTML. Public averages/counts use actual approved records with active persisted entitlements; an unavailable database is an unavailable state, never an invented zero or sample statistic.

Refund/dispute webhooks and every secure-delivery/review reconciliation update the persisted entitlement. Once the ledger records revocation or suspension, the review and its rating are excluded from the public query. Public listing does not make a Stripe request for every review; a refund whose webhook has not arrived and which has not yet reconciled can remain visible until that reconciliation. Submission/edit authorization always uses a fresh Stripe read.

## Storage and privacy

Migration `0004_verified_reviews.sql` adds one table referencing the existing purchased item. It does not copy receipt or payment information. Public nicknames and free text are personal data chosen for publication. Customers are instructed not to include contact or payment details; automated checks cannot identify every possible personal detail, so moderation must check this too.

Reviews are retained for the product's supported lifetime or until the customer requests removal. A verified removal request must be handled by the owner: reject the review to remove it from public display immediately, then delete the matching `commerce_reviews` row through an authorized database operation when erasure is requested. Existing order-retention obligations are independent of review publication. Deleting an order item cascades to its review, but order records must never be deleted merely to remove a review. There is no customer self-service delete endpoint in this slice. Backups follow the database operator's retention policy; do not promise immediate backup erasure.

## Integration API

- `reviewsConfig()` validates the opt-in mode against secure delivery; `reviewsService(config)` uses the existing lazy database and read-only Stripe snapshot adapter.
- `GET /api/reviews?product=combat-framework&page=1`: ten approved reviews per page, actual total/average and `hasMore`; maximum page 100. Returns no-store JSON.
- `POST /api/reviews`: exact fields `session_id`, `rating`, `display_name`, `body`, `website` (empty). Returns 202 pending moderation, 400 invalid form, 403 unverified purchase, 429 rate limit, or 503 unavailable. Errors reveal no provider details.
- `<ProductReviews product="combat-framework" />` loads public reviews, rating totals, honest unavailable/empty states and pagination.
- `<ReviewForm sessionId={id} />` belongs only on the verified paid download view. The API independently authorizes every submission even if the UI is copied.

The current catalog contains one sellable product. Product slug is allowlisted to `COMBAT_SALE.slug`; introducing another product requires extending catalog-aware sale/snapshot validation rather than trusting an arbitrary submitted slug.

## Verification

Server tests in `tests/server/reviews*.test.ts` exercise actual migrated PostgreSQL tables in embedded PGlite and the existing Stripe SDK's isolated test transport. Tests cover paid browser authorization, copied URLs, wrong/expired grants, pending payment, atomic duplicate submissions, moderation and edits, stale approval, refunds, outage rollback, validation, exact public fields, bounded forms and origin checks. No real payment is submitted.

`tests/reviews.spec.ts` uses explicitly marked response fixtures to test real desktop/mobile React rendering, escaped text, actual displayed aggregate values, unavailable data and pagination. Fixture ratings are not production data. Hosted Sandbox checkout-to-review-to-moderation verification remains a separate activation check; passing isolated tests does not claim it has occurred or that Production reviews are enabled.
