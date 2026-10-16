import Link from "next/link";
import type { Product } from "@/lib/products";
import { ProductArtwork } from "./product-artwork";
import { Status } from "./ui";
import { Arrow } from "./icons";

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><Link href={`/products/${product.slug}`} className="product-card-image" aria-label={`Explore ${product.name} product details`}><ProductArtwork compact/><span className="artwork-open" aria-hidden="true"><Arrow diagonal/></span></Link><div className="product-card-body"><div className="product-card-meta mono"><span>{product.category}</span><span>/{product.id}</span></div><h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2><p>{product.description}</p><div className="product-card-footer"><Status>{product.availability}</Status><span className="mono">{product.platform} / {product.language}</span></div></div></article>;
}
