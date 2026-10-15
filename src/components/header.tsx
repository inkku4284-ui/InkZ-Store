"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/lib/site";
import { Arrow } from "./icons";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    const media = window.matchMedia("(min-width: 768px)");
    const onDesktop = () => { if (media.matches) setOpen(false); };
    document.addEventListener("keydown", onEscape);
    media.addEventListener("change", onDesktop);
    return () => { document.removeEventListener("keydown", onEscape); media.removeEventListener("change", onDesktop); };
  }, [open]);

  return <header className="site-header shell">
    <Link href="/" className="wordmark" aria-label="INKZ home" onClick={() => setOpen(false)}>INKZ<span>®</span></Link>
    <span className="header-label mono">Independent software label</span>
    <button ref={button} type="button" className="menu-toggle mono" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? "Close −" : "Menu +"}</button>
    <nav id="main-nav" aria-label="Main navigation" className={`main-nav ${open ? "is-open" : ""}`}>
      {navigation.map(({href, label}) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} onClick={() => setOpen(false)}>{label}<Arrow diagonal /></Link>)}
    </nav>
  </header>;
}
