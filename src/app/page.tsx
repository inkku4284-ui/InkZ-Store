import Link from "next/link";
import { Arrow, Starburst } from "@/components/icons";
import { SectionLabel, Status, TextLink } from "@/components/ui";
import { SystemDiagram } from "@/components/system-diagram";
import { Faq } from "@/components/faq";
import { pageMetadata } from "@/lib/metadata";
import { HeroArtifact } from "@/components/identity/hero-artifact";
import { HomeMotion } from "@/components/identity/home-motion";
import "./home-motion.css";

export const metadata = pageMetadata("Independent Software Label", "Original Roblox systems. Independent by design. Explore INKZ, a software label built around the people who build.", "/");

export default function Home() {
  return <>
    <HomeMotion/>
    <section className="hero shell" aria-labelledby="hero-heading">
      <div className="hero-top"><SectionLabel number="01—INDEX">Independent software label</SectionLabel><span className="mono hero-location">Thailand · Built for everywhere</span></div>
      <div className="hero-editorial">
        <p className="hero-kicker mono"><span aria-hidden="true"/> For the ones who build.</p>
        <h1 id="hero-heading" className="hero-title" aria-label="BUILD WHAT MATTERS."><span className="hero-line"><span>BUILD WHAT</span></span><span className="hero-line hero-outline"><span>MATTERS.</span></span></h1>
        <div className="hero-copy"><p>An independent Roblox software label.<br/>Original systems. Built to be modified.</p><div className="hero-actions"><Link href="/products" className="button button-bone">Explore Catalog<Arrow diagonal/></Link><Link href="/docs" className="plain-link">Read the docs<Arrow/></Link></div></div>
        <div className="hero-editor-note mono"><span>Software with a point of view.</span><span>Roblox Studio / Luau</span></div>
      </div>
      <HeroArtifact/>
      <div className="hero-baseline mono"><span><span className="index-cross" aria-hidden="true">+</span> Original systems. Independent thinking.</span><a href="#selected">Scroll to discover <span aria-hidden="true">↓</span></a></div>
    </section>

    <div className="label-strip shell" aria-hidden="true"><span>Independent by design</span><span><Starburst/></span><span>Built to be modified</span><span><Starburst/></span><span>Made for the builder</span><span><Starburst/></span></div>

    <section className="selected shell" id="selected" aria-labelledby="selected-heading">
      <div className="section-top"><SectionLabel number="02—SYSTEMS">The first of many possibilities</SectionLabel><span className="mono">Selected work / 001</span></div>
      <div className="selected-heading" data-reveal="0"><h2 id="selected-heading">Less friction.<br/><span>More possibility.</span></h2><p>A framework is the beginning.<br/>What you do with it is the interesting part.</p></div>
      <Link href="/products/combat-framework" className="selected-product light-section" data-reveal="0" aria-label="Explore Combat Framework product details">
        <div className="selected-product-info"><span className="mono product-index">001 / COMBAT SYSTEM</span><div className="selected-product-title"><h3>Combat<br/>Framework<span className="product-dot">®</span></h3><p>A foundation for your next interaction.<br/>Roblox Studio. Luau. In development.</p></div><div className="selected-product-bottom"><Status/><span className="product-open mono">Explore the system <span className="circle-arrow"><Arrow diagonal/></span></span></div></div>
        <div className="selected-diagram"><div className="product-visual-stamp mono"><span>INKZ ENGINEERING</span><span>CONCEPT STUDY / 01</span></div><SystemDiagram/><div className="product-visual-foot mono"><span>Intent → Rules → State</span><span>Source verification pending</span></div></div>
      </Link>
      <div className="selected-foot mono"><span>Carefully considered. Still in development.</span><TextLink href="/products">The full collection</TextLink></div>
    </section>

    <section className="manifesto shell" aria-labelledby="manifesto-heading"><SectionLabel number="03—PHILOSOPHY">A different kind of dependency</SectionLabel><div className="manifesto-body" data-reveal="0"><Starburst className="manifesto-symbol"/><h2 id="manifesto-heading">The best tools<br/>leave room for<br/><em>your ideas.</em></h2><p>You bring the direction. We’re working toward systems you can understand, evaluate, and make part of something your own.</p></div></section>

    <section className="approach shell" aria-labelledby="approach-heading"><div className="approach-intro"><SectionLabel number="04—PROCESS">Built around the builder</SectionLabel><h2 id="approach-heading">Your project.<br/>Your rules.</h2><p>No mystery boxes. No shortcuts in the details.<br/>Just a considered way to build.</p><Link href="/docs" className="plain-link">Start with the documentation <Arrow diagonal/></Link></div><div className="approach-rows">{[
      ["01", "Look closer.", "Inspect", "Know what you’re building on. Source transparency and clear documentation are the standard we’re working toward."],
      ["02", "Make it fit.", "Integrate", "Review the dependencies, compatibility, and limitations. Choose a system because it makes sense for your project."],
      ["03", "Go your way.", "Extend", "Editable source is our design philosophy. The final release and license will define what you can change and use."],
    ].map(([number, title, label, copy], index) => <div className="approach-row" data-reveal={index} key={number}><span className="mono">/{number}</span><div><span className="process-label mono">{label}</span><h3>{title}</h3><p>{copy}</p></div><Arrow diagonal/></div>)}</div></section>

    <section className="engineering shell" aria-labelledby="engineering-heading"><div className="engineering-heading"><SectionLabel number="05—FIELD NOTES">Read before you build</SectionLabel><span className="mono">Knowledge is part of the product.</span></div><div className="engineering-content"><div><h2 id="engineering-heading">Open the hood.<br/><span>Understand more.</span></h2><p>A good starting point tells you what’s known, what’s being verified, and where the boundaries are.</p><TextLink href="/docs">Open documentation</TextLink></div><nav className="notes-index" aria-label="Engineering documentation">{[["01", "Installation", "Prepare your environment", "installation"], ["02", "Architecture", "Explore the conceptual model", "architecture"], ["03", "Compatibility", "Check the knowns and unknowns", "compatibility"], ["04", "Limitations", "Understand the boundaries", "limitations"]].map(([number,title,copy,id]) => <Link href={`/docs#${id}`} key={id}><span className="mono">{number}</span><span><strong>{title}</strong><small>{copy}</small></span><Arrow diagonal/></Link>)}</nav></div></section>

    <section className="faq-section shell" aria-labelledby="faq-heading"><div><SectionLabel number="06—ANSWERS">Before you build</SectionLabel><h2 id="faq-heading">No fine print.<br/><span>Just the facts.</span></h2><p>Pre-launch. In progress. Out in the open.<br/>Here’s where things stand.</p><TextLink href="/contact">Contact & support</TextLink></div><Faq/></section>
  </>;
}
