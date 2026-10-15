import { PageIntro, Status, TextLink } from "@/components/ui";
import { SystemDiagram } from "@/components/system-diagram";
import { products } from "@/lib/products";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Catalog", "An indexed collection of original Roblox systems. Explore Combat Framework and its current pre-launch status.", "/products");

export default function Catalog() {
  return <><PageIntro index="001" eyebrow="The collection" title="Systems, with intent."><p>Independent frameworks for independent builders. A focused catalog, built one release at a time.</p></PageIntro><section className="catalog light-section shell" aria-label="Product catalog"><div className="catalog-heading mono"><span>Index / Original software</span><span>{String(products.length).padStart(2,"0")} product in development</span></div>{products.map(product => <article className="catalog-release" key={product.id}><span className="mono">/{product.id}</span><div><h2>{product.name}</h2><Status>{product.availability}</Status><p>{product.description}</p><div className="product-tags mono"><span>{product.platform}</span><span>{product.language}</span><span>{product.category}</span></div><TextLink href={`/products/${product.slug}`}>Explore the system</TextLink></div><SystemDiagram compact/></article>)}<div className="catalog-foot"><p>Pricing and release date have not been confirmed.</p><p>Purchasing is currently unavailable.</p></div></section></>;
}
