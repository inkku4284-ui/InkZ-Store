# Owner launch checklist

The development website can run independently of these tasks. **Stripe submission and live sales remain blocked** until the real business, product, support, and legal facts are verified. This is an operational checklist, not legal advice or a guarantee of processor acceptance.

## Business and authority

- [x] Record the owner-confirmed business country: Thailand. Business type: Independent Software Label / Digital Software Products.
- [ ] Verify the responsible legal operator with the owner and parent/guardian, applicable jurisdiction, and any legally required business address/registration/tax information. Do not substitute the brand name for the operator. Publish only necessary, accurate business information.
- [ ] Verify Stripe’s requirements for the actual country, account type, age, business, and representative. The owner is under 18: confirm authorized adult involvement and legal authority directly with the applicable provider requirements; do not misstate age or identity.
- [ ] Confirm processor approval and live-payment eligibility. A live website alone is insufficient.
- [x] Support channel: Discord friend request to inkz_xko (published on /contact).

## Product and policies

- [x] Review the actual Combat Framework source and distribution package (v1.0: R6, installer + setup checker, assets audited: sounds/textures public, animations re-uploaded by buyers).
- [x] Installation tested by running the packaged installer in Studio; guide published at /docs and inside the package (README_EN / README_TH).
- [x] Price: 349 THB one-time (Thai market first). Version 1.0. Tax handling: owner to confirm.
- [ ] Finalize source access, modification, commercial use, team/project limits, redistribution, third-party asset rights, updates, and support terms. The brand statement grants no legal rights.
- [x] Secure download after Stripe-verified payment (encrypted package, session check on every download). Delivery terms published. Finalize a fair refund/withdrawal policy consistent with applicable consumer law, including a reachable refund process and digital-content consent requirements where applicable.
- [ ] Review all policy pages against the actual business and deployed services; update the policy date and remove pending notices only when resolved.

## Deployment, data, and payments

- [ ] Set the real HTTPS deployment origin; verify canonical, sitemap, robots, and social-image URLs on the public deployment.
- [ ] Verify hosting logs, data categories, processing purpose and basis, retention, processors/recipients, transfer locations, and privacy request handling.
- [ ] Implement a separate server-side payment and fulfillment project with verified webhooks, durable orders, secure private delivery, expiring links, and license records. See README architecture notes.
- [ ] Test successful, failed, delayed, duplicated, refunded, and disputed payments and unauthorized/expired download attempts before enabling sales.
- [ ] Complete desktop/mobile, keyboard, screen-reader, and real-device release review. Automated accessibility checks do not replace manual testing.
- [ ] Enable purchasing only when the product, business authority, payment approval, pricing, license, refund policy, support, and delivery workflow are ready.

Current facts: INKZ is an independent software label based in Thailand. Combat Framework v1.0 (Roblox Studio, Luau, R6) sells for 349 THB one-time with instant download after Stripe-verified payment; support is on Discord (inkz_xko). Live payments stay off until the items above are done.

## Test mode

Set `INKZ_SALES=test` with a Stripe test key on Preview only (see README "Store"). Test mode is refused on Production.
