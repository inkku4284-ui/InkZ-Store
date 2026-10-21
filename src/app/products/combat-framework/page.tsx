import Link from "next/link";
import { SectionLabel, TextLink } from "@/components/ui";
import { ProductArtwork } from "@/components/product-artwork";
import { ProductMedia } from "@/components/product-media";
import { ConceptDiagram } from "@/components/concept-diagram";
import { PurchasePanel } from "@/components/buy-button";
import { combat, features, included, requirements } from "@/lib/products";
import { business } from "@/lib/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Combat Framework", "Server-authoritative R6 combat framework for Roblox: M1 strings, parry trades, air combos, ragdoll, full UI and two AI NPCs. 349 THB, instant download.", "/products/combat-framework");
const sections = [["overview","Overview"],["features","Features"],["specifications","Requirements"],["architecture","Architecture"],["license","License & support"]] as const;

export default function CombatFramework() {
  return <><nav className="breadcrumbs shell" aria-label="Breadcrumb"><Link href="/products">← All products</Link><span aria-hidden="true">/</span><span>Combat Framework</span></nav>
  <div className="product-hero shell"><div className="product-summary"><SectionLabel number="CF—001">{combat.category}</SectionLabel><h1>COMBAT<br/>FRAMEWORK</h1>
    <p>{combat.description}</p>
    <dl className="compact-facts"><div><dt>Platform</dt><dd>{combat.platform}</dd></div><div><dt>Language</dt><dd>{combat.language}</dd></div><div><dt>Version</dt><dd>{combat.version}</dd></div></dl>
    <PurchasePanel price={combat.price} availability={combat.availability} delivery={combat.delivery}/>
    <TextLink href="/docs">Read the install guide</TextLink></div>
    <div className="product-presentation"><ProductArtwork/><ProductMedia media={combat.media}/></div></div>
  <nav className="product-record-nav shell mono" aria-label="Product sections">{sections.map(([id,label],index) => <a key={id} href={`#${id}`}><span aria-hidden="true">0{index+1}</span>{label}</a>)}</nav>
  <div className="product-layout shell"><div className="product-main">
    <section className="article-section" id="overview"><p className="mono">01 / Product overview</p><h2>Deep fist combat. Drop it in.</h2><p>Combat Framework is a complete fighting system for R6 Roblox games, built around readable timing: strings you can parry out of, criticals you can read, parries you can trade. Everything is decided on the server, and every number is in a commented Config.</p><p>It installs with one line in the Command Bar, checks your place for you, and plays in Studio straight away. Before your game goes live you upload the included animations under your own account (Roblox requires it); the guide walks you through it.</p></section>
    <section className="article-section" id="features"><p className="mono">02 / Features</p><h2>What you get.</h2><dl className="spec-table">{features.map(([title, copy]) => <div key={title}><dt>{title}</dt><dd>{copy}</dd></div>)}</dl><h3 className="mt-6">In the package</h3><ul>{included.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section className="article-section" id="specifications"><p className="mono">03 / Requirements</p><h2>Will it fit?</h2><dl className="spec-table">{requirements.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="article-section" id="architecture"><p className="mono">04 / Architecture</p><h2>How a hit resolves.</h2><p>Your client plays your own move the moment you press; the server checks it, runs the hitbox between the animation&apos;s HitStart and HitStop events, decides block, parry, trade or hit, and broadcasts the result so every client animates it.</p><div className="concept-section"><ConceptDiagram/></div><p>Server scripts can drive any R6 model through the same API (that is how Vesper fights) and listen to every result for kill feeds, combo counters or quests. See the <Link href="/docs#api">scripting API</Link>.</p></section>
    <section className="article-section" id="license"><p className="mono">05 / License & support</p><h2>Yours to build with.</h2><p>{business.licenseTerms}</p><p>Support: add <strong>{business.supportDiscord}</strong> on Discord. Read the full <Link href="/terms#license">license</Link> and the <Link href="/refund-policy">refund policy</Link>.</p></section>
  </div>
  <aside className="purchase-panel" aria-labelledby="purchase-heading"><SectionLabel number="ORDER">How buying works</SectionLabel><h2 id="purchase-heading">Pay. Download. Install.</h2><ol><li>Pay {combat.price} on Stripe (card or PromptPay).</li><li>Download the .rbxm on your order page right away.</li><li>Follow the <Link href="/docs#install">install guide</Link>: one line in the Command Bar.</li></ol><TextLink href="/docs">Install guide</TextLink><TextLink href="/contact">Support</TextLink></aside></div></>;
}
