export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  platform: string;
  language: string;
  availability: "Not launched";
  price: null;
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
  description: "A combat framework planned for Roblox developers. Technical specifications, source review, and release details are still being finalized.",
};

export const products: readonly Product[] = [combat];
