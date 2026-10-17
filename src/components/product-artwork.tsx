/** Original typographic label artwork. Never gameplay or a shipped feature. */
export function ProductArtwork({ compact = false }: { compact?: boolean }) {
  return <figure className={`product-artwork ${compact ? "compact" : ""}`}>
    <div className="artwork-register mono"><span>INKZ®</span><span>Software / 001</span></div>
    <div className="artwork-object" aria-hidden="true"><div className="artwork-cross">+</div><span className="artwork-code">CF<span>—001</span></span><div className="artwork-rule"/><strong>COMBAT<br/>FRAMEWORK</strong><div className="artwork-platform mono"><span>Roblox Studio</span><span>Luau</span><span>In development</span></div></div>
    <figcaption>Label artwork · Not a product demonstration</figcaption>
  </figure>;
}
