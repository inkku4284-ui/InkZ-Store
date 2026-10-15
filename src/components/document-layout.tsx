import type { ReactNode } from "react";

export function DocumentLayout({ links, children }: { links: readonly (readonly [string, string])[]; children: ReactNode }) {
  return <div className="document-layout shell"><aside className="document-nav"><p className="mono">On this page</p><nav aria-label="On this page">{links.map(([id,title],index) => <a href={`#${id}`} key={id}>{String(index + 1).padStart(2,"0")} — {title}</a>)}</nav></aside><div className="document-body">{children}</div></div>;
}

export function ArticleSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="article-section" id={id}><h2>{title}</h2>{children}</section>;
}
