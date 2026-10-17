"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/lib/site";


export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    const desktop = window.matchMedia("(min-width: 768px)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("keydown", escape); desktop.addEventListener("change", resize);
    return () => { document.removeEventListener("keydown", escape); desktop.removeEventListener("change", resize); };
  }, [open]);
  return <header className="site-header shell"><Link href="/" className="wordmark" aria-label="INKZ home" onClick={() => setOpen(false)}>INKZ<span>®</span></Link><span className="header-label mono">Independent software label</span><button ref={button} className="menu-toggle mono" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? "Close −" : "Menu +"}</button><nav id="main-nav" aria-label="Main navigation" className={`main-nav ${open ? "is-open" : ""}`}>{navigation.map(({href,label}) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}<span className="nav-release mono"><span aria-hidden="true"/>Pre-launch</span></nav></header>;
}
