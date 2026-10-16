"use client";

import { useEffect } from "react";
import { useReducedMotion } from "./use-reduced-motion";

export function HomeMotion() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || typeof IntersectionObserver === "undefined") return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        const order = Math.min(2, Number(element.dataset.reveal || 0));
        const animation = element.animate([
          { opacity: 0.6, transform: "translateY(28px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 760, delay: order * 85, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
        observer.unobserve(element);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [reduced]);
  return null;
}
