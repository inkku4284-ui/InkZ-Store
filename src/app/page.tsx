import Link from "next/link";
import { Arrow } from "@/components/icons";
import { Faq } from "@/components/faq";
import { HeroArtifact } from "@/components/identity/hero-artifact";
import { HomeMotion } from "@/components/identity/home-motion";
import { ProductArtwork } from "@/components/product-artwork";
import { SectionLabel, Status, TextLink } from "@/components/ui";
import { combat } from "@/lib/products";
import { pageMetadata } from "@/lib/metadata";
import "./home-motion.css";

export const metadata = pageMetadata("Independent Software Label", "INKZ IS LABEL. Original Roblox software in development. Explore Combat Framework, release status, and documentation.", "/");
export default function Home() {
  return <><HomeMotion/>
    <section className="hero shell" aria-labelledby="hero-heading">
      <div className="hero-editorial"><SectionLabel number="INKZ®">Independent software label</SectionLabel>
        <h1 id="hero-heading" className="hero-title" aria-label="TOOLS FOR THE ONES WHO BUILD."><span className="hero-line"><span>TOOLS FOR</span></span><span className="hero-line"><span>THE ONES</span></span><span className="hero-line"><span>WHO BUILD.</span></span></h1>
        <div className="hero-copy"><p>Original software for Roblox creators.<br/>Designed with intent. Built on our terms.</p><Link href="/products" className="button button-red">Browse products<Arrow diagonal/></Link></div>
        <p className="hero-note"><span className="release-dot" aria-hidden="true"/>Combat Framework · 349 THB · launching soon.</p>
      </div><HeroArtifact/>
    </section>
    <div className="label-register shell mono"><span>INKZ IS LABEL.</span><span>Independent software / Thailand</span><span>Roblox Studio — Luau</span></div>
    <section className="home-product paper-section shell" id="selected" aria-labelledby="selected-heading">
      <div className="section-top"><SectionLabel number="01">The first release</SectionLabel><TextLink href="/products">Explore the collection</TextLink></div>
      <div className="featured-product" data-reveal="0"><div className="featured-record"><Status/><h2 id="selected-heading">Combat<br/>Framework</h2><p>{combat.description}</p><dl className="compact-facts"><div><dt>Made for</dt><dd>{combat.platform}</dd></div><div><dt>Written in</dt><dd>{combat.language}</dd></div></dl><div className="featured-actions"><Link className="button button-dark" href="/products/combat-framework">Explore the framework<Arrow diagonal/></Link><TextLink href="/docs">Read the install guide</TextLink></div></div><Link href="/products/combat-framework" className="featured-art"><span className="sr-only">Explore Combat Framework product details — </span><ProductArtwork/></Link></div>
      <div className="product-footnote"><span className="mono">CF—001 / Combat system</span><p>R6 fist combat for Roblox. 349 THB, one-time, instant download.</p></div>
    </section>
    <section className="evaluation shell" aria-labelledby="evaluation-heading"><div className="evaluation-intro"><SectionLabel number="02">The label</SectionLabel><h2 id="evaluation-heading">Small label.<br/>Clear intent.</h2><p>INKZ is an independent software label in Thailand, working on tools for Roblox creators.</p><p>Start with the product. Understand its boundaries. Know what you are building with.</p></div><div className="evaluation-links">{[["01","Explore the product","Confirmed targets. An honest release record.","/products/combat-framework"],["02","Read the documentation","Prepare your project. Understand the current limits.","/docs"],["03","Know the terms","Licensing, delivery and the path to release.","/terms"]].map(([index,title,copy,href]) => <Link href={href} key={index} data-reveal="0"><span className="mono">{index}</span><div><h3>{title}</h3><p>{copy}</p></div><Arrow diagonal/></Link>)}</div></section>
    <section className="faq-section paper-section shell" aria-labelledby="faq-heading"><div><SectionLabel number="03">Good to know</SectionLabel><h2 id="faq-heading">Before<br/>you build.</h2><p>The essentials, while we prepare for release.</p><TextLink href="/contact">Contact & support</TextLink></div><Faq/></section>
  </>;
}
