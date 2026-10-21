/** Public business facts only. Null means unconfirmed, never invent a substitute. */
export const business = {
  name: "INKZ®",
  type: "Independent Software Label / Digital Software Products",
  businessCountry: "Thailand",
  description: "Independent Roblox frameworks for developers who want control over their systems.",
  /** Support: buyers add the owner on Discord. */
  supportDiscord: "inkz_xko",
  supportEmail: null as string | null,
  legalOperator: null as string | null,
  businessJurisdiction: null as string | null,
  publicBusinessAddress: null as string | null,
  supportResponseTime: "Usually within 24–48 hours" as string | null,
  licenseTerms: "One purchase gives one buyer (a person, or one team working on its own games) a lifetime license to use and modify Combat Framework in any number of Roblox experiences they make, including paid and monetized ones. You may not resell, share, re-upload, give away or redistribute the framework, its source, animations or assets, on their own or inside another kit, model, asset pack or template. Players of your games need no license." as string | null,
  refundTerms: "The download is delivered instantly, so purchases are final once the file is available, except: if you were charged twice, never received a working download, or the framework does not work as described and we cannot fix it within 7 days of your report, you get a full refund. Contact support on Discord with your Stripe receipt. This does not limit any rights you have under the law that applies to you." as string | null,
  deliveryTerms: "Right after payment you land on your order page with the download. That page (its address) is your download link: bookmark it. Lost it? Message support with your Stripe receipt." as string | null,
  /** Flip to true when live sales open (INKZ_SALES=live with live Stripe keys). */
  launched: false,
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
  "Activate the Stripe account for live payments, meeting Stripe's own requirements for the account holder (age, identity, country and business details) — with an authorized adult if those requirements call for one.",
  "Create the live Product and 349 THB Price in Stripe (live mode), enable PromptPay and cards, and set the live keys and Price in Vercel Production only.",
  "Confirm the published license, refund and delivery terms, and add any business details the law or Stripe requires.",
  "Run one real purchase end to end (pay, download, install) before announcing the launch.",
];
