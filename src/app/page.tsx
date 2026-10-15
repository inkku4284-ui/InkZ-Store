import Link from "next/link";
import { Arrow, Crosshair } from "@/components/icons";
import { SectionLabel, Status, TextLink } from "@/components/ui";
import { SystemDiagram } from "@/components/system-diagram";
import { Faq } from "@/components/faq";
import { pageMetadata } from "@/lib/metadata";
import { HeroArtifact } from "@/components/identity/hero-artifact";
import { HomeMotion } from "@/components/identity/home-motion";
import "./home-motion.css";

export const metadata = pageMetadata("Independent Software Label", "Built to be modified. Independent Roblox frameworks for developers who want control over their systems. Explore the INKZ label.", "/");

export default function Home() {
  return <>
    <HomeMotion/>
    <section className="hero shell" aria-labelledby="hero-heading">
      <div className="hero-top"><SectionLabel number="001">Independent software</SectionLabel><span className="mono hero-location">Roblox Studio / Luau</span></div>
      <h1 id="hero-heading" className="hero-title" aria-label="BUILD WHAT MATTERS."><span className="hero-line"><span>BUILD WHAT</span></span><span className="hero-line"><span>MATTERS.<span className="hero-period" aria-hidden="true"><Arrow diagonal/></span></span></span></h1>
      <HeroArtifact/>
      <div className="hero-bottom"><span className="hero-brand-note mono">Original systems.<br/>Independent by design.</span><div className="hero-copy"><p>An independent Roblox software label.<br/>Original systems. Built to be modified.</p><div className="hero-actions"><Link href="/products" className="button button-bone">Explore Catalog<Arrow diagonal/></Link><Link href="/docs" className="plain-link">Documentation<Arrow/></Link></div></div></div>
      <div className="hero-baseline mono"><span>Built to be modified.</span><a href="#selected">Explore the system <span aria-hidden="true">↓</span></a></div>
    </section>

    <section className="selected light-section shell" id="selected" aria-labelledby="selected-heading">
      <div className="section-top"><SectionLabel number="002">Selected system</SectionLabel><span className="mono">Collection / 01</span></div>
      <div className="selected-heading" data-reveal="0"><h2 id="selected-heading">A foundation.<br/><span>Your direction.</span></h2><p>Software should be a starting point.<br/>The rest belongs to the builder.</p></div>
      <Link href="/products/combat-framework" className="selected-product" data-reveal="1" aria-label="Explore Combat Framework product details">
        <div className="selected-product-info"><span className="mono">INKZ—CF / 001</span><h3>Combat<br/>Framework<span className="product-dot">®</span></h3><p>A combat system for Roblox.<br/>Currently in pre-launch.</p><div className="product-tags mono"><span>Roblox Studio</span><span>Luau</span></div><div className="selected-product-bottom"><Status/><span className="circle-arrow"><Arrow diagonal/></span></div></div>
        <div className="selected-diagram"><SystemDiagram/></div>
      </Link>
      <div className="selected-foot mono"><span>01 product. No shortcuts.</span><TextLink href="/products">View the catalog</TextLink></div>
    </section>

    <section className="approach shell" aria-labelledby="approach-heading"><div className="approach-intro"><SectionLabel number="003">The approach</SectionLabel><h2 id="approach-heading">Your project.<br/>Your rules.</h2><p>Readable systems. Deliberate decisions.<br/>A label built around developer control.</p><Crosshair/></div><div className="approach-rows">{[
      ["01", "Inspect", "Understand what you’re building on. Clear documentation and source transparency are the standard we’re working toward."],
      ["02", "Integrate", "Make an informed fit. Review dependencies, compatibility, and limitations before bringing a system into your project."],
      ["03", "Extend", "Take it in your own direction. Editable source is our design philosophy; release documentation and license terms will define what’s included."],
    ].map(([number, title, copy], index) => <div className="approach-row" data-reveal={index} key={number}><span className="mono">{number}</span><div><h3>{title}</h3><p>{copy}</p></div><Arrow diagonal/></div>)}</div></section>

    <section className="engineering shell" aria-labelledby="engineering-heading"><SectionLabel number="004">Engineering notes</SectionLabel><div className="engineering-content"><div><span className="mono red-label">Read before you build.</span><h2 id="engineering-heading">Know what’s<br/>under the hood.</h2><p>Documentation is part of the product. Start with what’s known, what’s still being verified, and what to check before integration.</p><TextLink href="/docs">Open documentation</TextLink></div><nav className="notes-index" aria-label="Engineering documentation">{[["01", "Installation", "The integration starting point", "installation"], ["02", "Architecture", "A conceptual system overview", "architecture"], ["03", "Compatibility", "Requirements & known unknowns", "compatibility"], ["04", "Limitations", "Clear boundaries before release", "limitations"]].map(([number,title,copy,id]) => <Link href={`/docs#${id}`} key={id}><span className="mono">{number}</span><span><strong>{title}</strong><small>{copy}</small></span><Arrow diagonal/></Link>)}</nav></div></section>

    <section className="faq-section light-section shell" aria-labelledby="faq-heading"><div><SectionLabel number="005">Before you build</SectionLabel><h2 id="faq-heading">Good questions.<br/>Straight answers.</h2><p>Everything is in pre-launch.<br/>Here’s where things stand.</p><TextLink href="/contact">Contact & support</TextLink></div><Faq/></section>
  </>;
}
