/** Public business facts only. Null means unconfirmed, never invent a substitute. */
export const business = {
  name: "INKZ®",
  type: "Independent Software Label / Digital Software Products",
  businessCountry: "Thailand",
  description: "Independent Roblox frameworks for developers who want control over their systems.",
  supportEmail: null as string | null,
  legalOperator: null as string | null,
  businessJurisdiction: null as string | null,
  publicBusinessAddress: null as string | null,
  supportResponseTime: null as string | null,
  licenseTerms: null as string | null,
  refundTerms: null as string | null,
  deliveryTerms: null as string | null,
  paymentsEnabled: false as const,
};

function publicOrigin(): string | undefined {
  const input = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  if (!input) return undefined;
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public HTTPS origin, without credentials, a path, query, or fragment.");
  }
  return url.origin;
}

export const siteUrl = publicOrigin();
export const navigation = [
  { href: "/products", label: "Products" },
  { href: "/docs", label: "Docs" },
  { href: "/contact", label: "Contact" },
];

export const launchRequirements = [
  "Confirm the legal operator with the owner and parent/guardian, the applicable legal jurisdiction, and legally required public business details. The confirmed business country is Thailand.",
  "Provide and verify a working public support email and define support scope and response expectations.",
  "Supply and review the actual product source, architecture, supported features, installation steps, compatibility, and technical limitations.",
  "Finalize the planned USD pricing, applicable taxes, license rights, secure download delivery terms, update policy, and a refund process that respects applicable consumer law.",
  "Verify Stripe’s applicable age, country, account, and representative requirements, including authorized adult involvement; complete onboarding and confirm live-payment eligibility.",
  "Implement and test server-side Checkout Sessions, signed webhooks, order records, and secure, expiring fulfillment before enabling purchases.",
  "Set the real production URL, verify the deployment and support channel, and review hosting data processing and all published policies.",
];
