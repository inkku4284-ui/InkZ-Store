"use client";
import { useEffect, useState } from "react";
export function ReadingNavigation({ links, label, numbered = false }: { links: readonly (readonly [string,string])[]; label: string; numbered?: boolean }) {
  const [active, setActive] = useState(links[0]?.[0]);
  useEffect(() => {
    const sections = links.map(([id]) => document.getElementById(id)).filter((element): element is HTMLElement => !!element);
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(() => {
      const current = sections.find(element => { const rect = element.getBoundingClientRect(); return rect.top <= innerHeight * .35 && rect.bottom > 0; });
      if (current) setActive(current.id);
    }, { rootMargin: "-10% 0px -55% 0px", threshold: 0 });
    sections.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [links]);
  return <nav aria-label={label} className="reading-navigation">{links.map(([id,title],index) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={() => setActive(id)}>{numbered ? `${String(index+1).padStart(2,"0")} / ` : ""}{title}</a>)}</nav>;
}
