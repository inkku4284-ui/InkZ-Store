import Link from "next/link";
import { navigation } from "@/lib/site";
import { Arrow } from "./icons";

export function Footer() {
  return <footer className="site-footer shell"><div className="footer-top"><div className="footer-label"><Link href="/" className="wordmark" aria-label="INKZ home">INKZ<span>®</span></Link><p>INKZ IS LABEL.</p><span className="mono">Independent software / Thailand</span></div><div className="footer-directory"><nav aria-label="Footer navigation"><span className="mono">Explore</span>{navigation.map(({href,label}) => <Link key={href} href={href}>{label}<Arrow diagonal/></Link>)}</nav><nav aria-label="Legal navigation"><span className="mono">Information</span><Link href="/terms">Terms & licensing</Link><Link href="/refund-policy">Refund policy</Link><Link href="/privacy">Privacy</Link></nav><div className="footer-release"><span className="mono">Release status</span><p>Still in development.<br/> Purchasing unavailable.</p><Link className="text-link" href="/products">View the product record<Arrow diagonal/></Link></div></div></div><div className="footer-bottom mono"><span>© {new Date().getFullYear()} INKZ. All rights reserved.</span><span>Independent. Not affiliated with Roblox Corporation.</span><span>Software with intent. ↗</span></div></footer>;
}
