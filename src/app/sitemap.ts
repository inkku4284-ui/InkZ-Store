import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return ["/","/products","/products/combat-framework","/docs","/contact","/terms","/refund-policy","/privacy"].map(path => ({url:`${siteUrl}${path === "/" ? "" : path}`}));
}
