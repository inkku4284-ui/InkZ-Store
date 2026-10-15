# Owner launch checklist

The development website can run independently of these tasks. **Stripe submission and live sales remain blocked** until the real business, product, support, and legal facts are verified. This is an operational checklist, not legal advice or a guarantee of processor acceptance.

## Business and authority

- [x] Record the owner-confirmed business country: Thailand. Business type: Independent Software Label / Digital Software Products.
- [ ] Verify the responsible legal operator with the owner and parent/guardian, applicable jurisdiction, and any legally required business address/registration/tax information. Do not substitute the brand name for the operator. Publish only necessary, accurate business information.
- [ ] Verify Stripe’s requirements for the actual country, account type, age, business, and representative. The owner is under 18: confirm authorized adult involvement and legal authority directly with the applicable provider requirements; do not misstate age or identity.
- [ ] Confirm processor approval and live-payment eligibility. A live website alone is insufficient.
- [ ] Publish and test a real support email in `src/lib/site.ts`; define scope, hours, and realistic response expectations. No email is currently supplied.

## Product and policies

- [ ] Review the actual Combat Framework source and distribution package. Verify features, versions, dependencies, rig/input support, security boundaries, limitations, and architecture.
- [ ] Test real installation and integration instructions in a clean Roblox Studio test place. Replace preparation-only guidance with verified release documentation.
- [ ] Finalize the planned USD price, tax handling, release/version, and exact included materials. No price is confirmed.
- [ ] Finalize source access, modification, commercial use, team/project limits, redistribution, third-party asset rights, updates, and support terms. The brand statement grants no legal rights.
- [ ] Implement the planned secure digital download after verified payment, and finalize delivery timing and terms. Finalize a fair refund/withdrawal policy consistent with applicable consumer law, including a reachable refund process and digital-content consent requirements where applicable.
- [ ] Review all policy pages against the actual business and deployed services; update the policy date and remove pending notices only when resolved.

## Deployment, data, and payments

- [ ] Set the real HTTPS deployment origin; verify canonical, sitemap, robots, and social-image URLs on the public deployment.
- [ ] Verify hosting logs, data categories, processing purpose and basis, retention, processors/recipients, transfer locations, and privacy request handling.
- [ ] Implement a separate server-side payment and fulfillment project with verified webhooks, durable orders, secure private delivery, expiring links, and license records. See README architecture notes.
- [ ] Test successful, failed, delayed, duplicated, refunded, and disputed payments and unauthorized/expired download attempts before enabling sales.
- [ ] Complete desktop/mobile, keyboard, screen-reader, and real-device release review. Automated accessibility checks do not replace manual testing.
- [ ] Enable purchasing only when the product, business authority, payment approval, pricing, license, refund policy, support, and delivery workflow are ready.

Current facts: INKZ is a pre-launch independent software label based in Thailand. Combat Framework targets Roblox Studio and Luau. Pricing is planned in USD; the amount is pending. Secure digital download after verified payment is planned and not implemented. No license rights, refund terms, release date, support email, legal operator, governing jurisdiction, delivery guarantee, or support commitment is confirmed. No live deployment has been verified by local development checks.

## Separate Phase III Sandbox

The optional, explicitly gated Stripe Sandbox flow simulates payments only. It does not resolve any live-launch prerequisite above. See [STRIPE_SANDBOX.md](./STRIPE_SANDBOX.md) for exact Price verification, manual Dashboard steps, and volatile storage limits. No digital delivery is implemented.
