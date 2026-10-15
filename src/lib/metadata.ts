import type { Metadata } from "next";
import { siteUrl } from "./site";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: `${title} — INKZ®` },
    description,
    alternates: siteUrl ? { canonical: path } : undefined,
    openGraph: { title: `${title} — INKZ®`, description, ...(siteUrl ? { url: path } : {}) },
  };
}
