import Link from "next/link";
import type { ReactNode } from "react";
import { Status } from "./ui";
import { ReadingNavigation } from "./reading-navigation";
export function DocumentLayout({ links, children, variant = "policy" }: { links: readonly (readonly [string,string])[]; children: ReactNode; variant?: "policy" | "guide" }) {
  return <div className={`document-layout shell ${variant}`}><aside className="document-nav">{variant === "guide" && <div className="docs-product"><span className="mono">Documentation / 001</span><strong>Combat Framework</strong><Status/></div>}<p className="mono">{variant === "guide" ? "Starter guide" : "On this page"}</p><ReadingNavigation links={links} label={variant === "guide" ? "Documentation sections" : "On this page"} numbered/>{variant === "guide" && <Link href="/products/combat-framework" className="text-link">← Product record</Link>}</aside><div className="document-body">{children}</div>{variant === "guide" && <aside className="document-toc"><p className="mono">On this page</p><ReadingNavigation links={links} label="On this page"/></aside>}</div>;
}
export function ArticleSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="article-section" id={id}><h2>{title}</h2>{children}</section>;
}
