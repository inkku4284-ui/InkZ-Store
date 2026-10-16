"use client";

import { useEffect, useRef, useState } from "react";
import { ArtifactPoster } from "./artifact-poster";
import { useReducedMotion } from "./use-reduced-motion";
import type { ArtifactController } from "./artifact-scene";

export function HeroArtifact() {
  const figure = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ArtifactController | null>(null);
  const pausedRef = useRef(false);
  const inspectedRef = useRef(false);
  const [inspected, setInspected] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    pausedRef.current = paused;
    controller.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    inspectedRef.current = inspected;
    controller.current?.setInspected(inspected);
  }, [inspected]);

  useEffect(() => {
    const element = figure.current;
    const target = host.current;
    if (!element || !target || reduced) return;
    // The SVG and all editorial content are already rendered before this import.
    let cancelled = false;
    const network = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (network.connection?.saveData) return;
    let timer = 0;
    let started = false;
    let observer: IntersectionObserver | undefined;
    const load = () => {
      if (started || cancelled) return;
      started = true;
      observer?.disconnect();
      timer = window.setTimeout(() => {
      void import("./artifact-scene").then(({mountArtifact}) => {
        if (cancelled) return;
        try {
          controller.current = mountArtifact(target, {
            ready: () => { element.dataset.renderer = "webgl"; },
            unavailable: () => { element.dataset.renderer = "static"; element.dataset.motion = "still"; },
            motion: value => { element.dataset.motion = value; },
          });
          controller.current.setPaused(pausedRef.current);
          controller.current.setInspected(inspectedRef.current);
        } catch {
          element.dataset.renderer = "static";
          element.dataset.motion = "still";
          target.replaceChildren();
        }
      }).catch(() => { /* The same designed poster remains if the chunk cannot load. */ });
      }, 180);
    };
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) load(); }, {rootMargin:"100px"});
      observer.observe(target);
    } else load();
    return () => {
      observer?.disconnect();
      cancelled = true;
      window.clearTimeout(timer);
      controller.current?.dispose();
      controller.current = null;
      element.dataset.renderer = "static";
      element.dataset.motion = "still";
    };
  }, [reduced]);

  return <figure ref={figure} className="hero-artifact" data-renderer="static" data-motion="still" aria-labelledby="artifact-caption">
    <div className="artifact-register mono" aria-hidden="true"><span>INKZ® / FORM—02</span><span>Interactive identity</span></div>
    <div className="artifact-stage" aria-hidden="true"><ArtifactPoster/><div ref={host} className="artifact-webgl"/></div>
    <div className="artifact-bottom"><figcaption id="artifact-caption" className="mono"><span>Independent by design.</span><span>Original form. Open possibilities.</span></figcaption>{!reduced && <div className="artifact-interactions"><button className="artifact-control artifact-inspect mono" type="button" aria-pressed={inspected} onClick={() => setInspected(!inspected)}><span aria-hidden="true">{inspected ? "−" : "+"}</span>{inspected ? "Reset form" : "Inspect form"}</button><button className="artifact-control mono" type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">{paused ? <path d="m3 1 7 5-7 5Z" fill="currentColor"/> : <path d="M3 1v10M9 1v10" stroke="currentColor" strokeWidth="2"/>}</svg><span>{paused ? "Resume motion" : "Pause motion"}</span></button></div>}</div>
  </figure>;
}
