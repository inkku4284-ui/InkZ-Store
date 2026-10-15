import Link from "next/link";
import { navigation } from "@/lib/site";
import { Arrow } from "./icons";

export function Footer() {
  return <footer className="site-footer shell">
    <div className="footer-top"><div><Link href="/" className="wordmark" aria-label="INKZ home">INKZ<span>®</span></Link><p>Independent systems.<br/>Independent builders.</p></div><Link href="/products" className="footer-cta">Built to be<br/><span>modified.</span><Arrow diagonal /></Link></div>
    <div className="footer-links"><nav aria-label="Footer navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><nav aria-label="Legal navigation"><Link href="/terms">Terms & licensing</Link><Link href="/refund-policy">Refund policy</Link><Link href="/privacy">Privacy</Link></nav></div>
    <div className="footer-bottom mono"><span>© {new Date().getFullYear()} INKZ. All rights reserved.</span><span>Independent. Not affiliated with Roblox Corporation.</span><span className="footer-coordinate">END OF INDEX ↗</span></div>
  </footer>;
}
