import Link from "next/link";
import { SectionLabel } from "@/components/ui";
import { Arrow } from "@/components/icons";
export default function NotFound() {
  return <section className="not-found shell"><SectionLabel number="404">Outside the collection</SectionLabel><h1>No system here.</h1><p>This address does not match a published page. Browse the current product record or return to the documentation.</p><div className="not-found-actions"><Link className="button button-outline" href="/products">Browse products<Arrow diagonal/></Link><Link className="text-link" href="/docs">Open documentation<Arrow diagonal/></Link></div></section>;
}
