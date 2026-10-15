import Link from "next/link";
import { SectionLabel } from "@/components/ui";
import { Arrow } from "@/components/icons";

export default function NotFound() {
  return <section className="not-found shell"><SectionLabel number="404">Outside the index</SectionLabel><h1>No system here.</h1><p>This page doesn’t exist. Return to the catalog to see what’s currently in development.</p><Link className="button button-bone" href="/products">Explore Catalog<Arrow diagonal/></Link></section>;
}
