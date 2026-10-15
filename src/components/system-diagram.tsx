export function SystemDiagram({ compact = false }: { compact?: boolean }) {
  return <figure className={`system-figure ${compact ? "compact" : ""}`}>
    <div className="diagram-top mono"><span>CF—001 / SYSTEM STUDY</span><span>CONCEPT ONLY</span></div>
    <svg viewBox="0 0 820 370" role="img" aria-labelledby={compact ? "diagram-title-compact diagram-desc-compact" : "diagram-title diagram-desc"}>
      <title id={compact ? "diagram-title-compact" : "diagram-title"}>A conceptual combat interaction</title>
      <desc id={compact ? "diagram-desc-compact" : "diagram-desc"}>Intent passes through rules to state, with feedback returning to intent. This is an illustrative design study, not verified Combat Framework architecture.</desc>
      <defs><pattern id={compact ? "dots-compact" : "dots"} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".16"/></pattern></defs>
      <rect width="820" height="370" fill={`url(#${compact ? "dots-compact" : "dots"})`} />
      <g stroke="currentColor" fill="none" strokeWidth="1"><path d="M36 36h20m-10-10v20M764 36h20m-10-10v20M36 334h20m-10-10v20M764 334h20m-10-10v20" opacity=".4"/><path d="M226 176h78m212 0h78"/><path d="m296 171 8 5-8 5m290-10 8 5-8 5"/><path d="M698 226v66H122v-66" strokeDasharray="4 5" opacity=".5"/><path d="m117 234 5-8 5 8" opacity=".5"/></g>
      <g fill="var(--diagram-panel)"><rect x="40" y="126" width="186" height="100" stroke="currentColor"/><rect x="304" y="106" width="212" height="140" stroke="var(--oxide)" strokeWidth="1.5"/><rect x="594" y="126" width="186" height="100" stroke="currentColor"/></g>
      <g fill="currentColor" fontFamily="var(--font-mono), monospace"><text x="56" y="148" fontSize="10" opacity=".6">01 / INPUT</text><text x="56" y="194" fontSize="25">Intent</text><text x="322" y="130" fontSize="10" fill="var(--oxide)">02 / EVALUATION</text><text x="322" y="187" fontSize="33">Rules</text><text x="322" y="227" fontSize="10" opacity=".6">DEFINE THE INTERACTION</text><text x="610" y="148" fontSize="10" opacity=".6">03 / RESULT</text><text x="610" y="194" fontSize="25">State</text><text x="410" y="282" fontSize="10" textAnchor="middle" opacity=".65">FEEDBACK</text></g>
    </svg>
    <figcaption className="mono">Illustrative flow. Product architecture pending verification.</figcaption>
  </figure>;
}
