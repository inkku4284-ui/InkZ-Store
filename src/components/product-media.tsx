"use client";

import { useEffect, useRef } from "react";
import type { ProductMediaAsset } from "@/lib/products";

/**
 * The product showcase: real footage, muted and looping like a moving poster (sound and controls on demand).
 * It only starts by itself when the visitor hasn't asked for reduced motion.
 */
export function ProductMedia({ media }: { media: ProductMediaAsset | null }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = true; // React doesn't render the muted attribute on the server: set it before playing
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.play().catch(() => {});
    }
  }, []);
  if (!media) return <div className="product-media media-pending"><span className="mono">Demonstration</span><p><strong>No footage yet.</strong>A product video will appear here.</p></div>;
  return <figure className="product-media product-showcase">
    <div className="artwork-register mono"><span>INKZ®</span><span>Showcase / 001</span></div>
    <video ref={video} controls loop muted playsInline preload="metadata" poster={media.poster} aria-label={media.caption}>
      <source src={media.src} type="video/mp4"/>
      <track kind="captions" src={media.captionsSrc} srcLang="en" label="English" default/>
      <a href={media.src}>Open the showcase video</a>
    </video>
    <figcaption>{media.caption}</figcaption>
  </figure>;
}
