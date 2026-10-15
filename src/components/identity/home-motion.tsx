"use client";

import { useEffect } from "react";
import { useReducedMotion } from "./use-reduced-motion";

export function HomeMotion() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        const order = Number(element.dataset.reveal || 0);
        animations.push(element.animate([
          { opacity: 0, transform: "translateY(24px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 700, delay: order * 75, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
        observer.unobserve(element);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [reduced]);
  return null;
}
