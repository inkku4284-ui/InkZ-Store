import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "./icons";

export function TextLink({ href, children, light = false }: { href: string; children: ReactNode; light?: boolean }) {
  return <Link href={href} className={`text-link ${light ? "text-link-light" : ""}`}>{children}<Arrow diagonal/></Link>;
}
export function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className="section-label mono"><span>{number}</span><span>{children}</span></div>;
}
export function Status({ children = "Not launched" }: { children?: ReactNode }) {
  return <span className="status mono"><span aria-hidden="true"/>{children}</span>;
}
export function PageIntro({ index, eyebrow, title, children }: { index: string; eyebrow: string; title: string; children: ReactNode }) {
  return <header className="page-intro shell"><div className="page-intro-top"><SectionLabel number={index}>{eyebrow}</SectionLabel><span className="edition mono">Independent software / Pre-launch</span></div><div className="page-intro-heading"><h1>{title}</h1><div className="page-intro-copy">{children}</div></div></header>;
}
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="notice"><div className="notice-marker mono"><span aria-hidden="true">!</span>Pre-launch notice</div><div><h2>{title}</h2><div>{children}</div></div></aside>;
}
export function PolicySummary({ items }: { items: readonly (readonly [string, string])[] }) {
  return <dl className="policy-summary shell">{items.map(([title, value]) => <div key={title}><dt className="mono">{title}</dt><dd>{value}</dd></div>)}</dl>;
}
export function StatePanel({ code, title, children, actions }: { code: string; title: string; children: ReactNode; actions: ReactNode }) {
  return <section className="state-panel"><div className="state-code mono"><span aria-hidden="true">↗</span>{code}</div><div className="state-body"><h2>{title}</h2><div className="state-copy">{children}</div><div className="state-actions">{actions}</div></div></section>;
}
