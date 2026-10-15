import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "./icons";

export function TextLink({ href, children, light = false }: { href: string; children: ReactNode; light?: boolean }) {
  return <Link href={href} className={`text-link ${light ? "text-link-light" : ""}`}>{children}<Arrow diagonal /></Link>;
}

export function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className="section-label mono"><span>{number}</span><span>{children}</span></div>;
}

export function Status({ children = "Not launched" }: { children?: ReactNode }) {
  return <span className="status mono"><span aria-hidden="true"/>{children}</span>;
}

export function PageIntro({ index, eyebrow, title, children }: { index: string; eyebrow: string; title: string; children: ReactNode }) {
  return <div className="page-intro shell"><SectionLabel number={index}>{eyebrow}</SectionLabel><h1>{title}</h1><div className="page-intro-copy">{children}</div></div>;
}

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="notice"><span className="mono notice-label">Pre-launch notice</span><h2>{title}</h2><div>{children}</div></aside>;
}
