"use client";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { ProductCard } from "./product-card";

export function CatalogExplorer({ products }: { products: readonly Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const categories = ["All products", ...new Set(products.map(product => product.category))];
  const results = products.filter(product => (category === "All products" || product.category === category) && `${product.name} ${product.category} ${product.platform} ${product.language}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className="catalog-tools"><div className="catalog-filters" role="group" aria-label="Product category">{categories.map(item => <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="catalog-search"><span className="mono">Search products</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, platform, or language"/></label></div><div className="catalog-result-count mono" role="status">{results.length} {results.length === 1 ? "product" : "products"} / {category === "All products" ? "Complete collection" : category}</div>{results.length ? <div className="catalog-grid">{results.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="empty-state"><span className="mono">No matching products</span><h2>Nothing in this selection.</h2><p>Try a different search or return to the full collection.</p><button className="button button-outline" type="button" onClick={() => { setQuery(""); setCategory("All products"); }}>Clear selection</button></div>}</>;
}
