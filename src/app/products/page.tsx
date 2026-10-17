import { PageIntro, TextLink } from "@/components/ui";
import { CatalogExplorer } from "@/components/catalog-explorer";
import { products } from "@/lib/products";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("Products", "Explore the INKZ software collection. Combat Framework for Roblox Studio and Luau is in development; purchasing is not available.", "/products");
export default function Catalog() {
  return <><PageIntro index="INDEX / 001" eyebrow="Products / In development" title="The software collection."><p>One focused product in development. Explore its current record, confirmed targets, and release requirements.</p></PageIntro><section className="catalog shell" aria-label="Product catalog"><CatalogExplorer products={products}/><div className="catalog-foot"><span className="mono">Release information</span><p>Prices and release dates are not confirmed. Nothing in this collection is currently available to purchase.</p><TextLink href="/docs">Review the starter documentation</TextLink></div></section></>;
}
