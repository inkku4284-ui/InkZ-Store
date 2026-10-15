export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  platform: string;
  language: string;
  availability: "Not launched";
  price: null;
  plannedCurrency: string;
  plannedDelivery: string;
  description: string;
};

export const combat: Product = {
  id: "001",
  slug: "combat-framework",
  name: "Combat Framework",
  category: "Combat System",
  platform: "Roblox Studio",
  language: "Luau",
  availability: "Not launched",
  price: null,
  plannedCurrency: "USD",
  plannedDelivery: "Secure digital download after verified payment is planned, but not implemented. Delivery timing and final terms remain pending.",
  description: "A combat framework planned for Roblox developers. Technical specifications, source review, and release details are still being finalized.",
};

export const products: readonly Product[] = [combat];
