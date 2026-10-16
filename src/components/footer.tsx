import Link from "next/link";
import { navigation } from "@/lib/site";
import { Arrow, Starburst } from "./icons";

export function Footer() {
  return <footer className="site-footer shell">
    <div className="footer-eyebrow mono"><span>THE NEXT THING YOU BUILD</span><span>STARTS WITH A GOOD FOUNDATION ↙</span></div>
    <div className="footer-top"><Link href="/products" className="footer-cta">Make it<br/><span>your own.</span><Arrow diagonal /></Link><div className="footer-aside"><span className="mono">Independent systems.<br/>Independent builders.</span><p>Original Roblox software.<br/>From Thailand, with intent.</p><span className="footer-prelaunch mono"><span aria-hidden="true"/> Pre-launch. Still becoming.</span></div></div>
    <div className="footer-links"><nav aria-label="Footer navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}<Arrow diagonal/></Link>)}</nav><nav aria-label="Legal navigation"><Link href="/terms">Terms & licensing</Link><Link href="/refund-policy">Refund policy</Link><Link href="/privacy">Privacy</Link></nav></div>
    <Link href="/" className="footer-signature" aria-label="INKZ home">INKZ<span>®</span><Starburst className="footer-signature-symbol"/></Link>
    <div className="footer-bottom mono"><span>© {new Date().getFullYear()} INKZ. All rights reserved.</span><span>Independent. Not affiliated with Roblox Corporation.</span><span className="footer-coordinate">BUILT TO BE MODIFIED ↗</span></div>
  </footer>;
}
