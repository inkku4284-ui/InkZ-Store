/** Original label artwork. It does not depict gameplay, source, or a shipped feature. */
export function ProductArtwork({ compact = false, decorative = false }: { compact?: boolean; decorative?: boolean }) {
  return <figure aria-hidden={decorative || undefined} className={`product-artwork ${compact ? "compact" : ""}`}><div className="artwork-register mono"><span>CF—001</span><span>INKZ® / SOFTWARE</span></div><div className="artwork-object" aria-hidden="true"><div className="artwork-spine">INKZ</div><div className="artwork-face"><span className="mono">COMBAT SYSTEM</span><strong>CF</strong><div className="artwork-rule"/><span className="mono">ROBLOX STUDIO / LUAU</span></div></div><figcaption className="mono">Label artwork · Not a product demonstration</figcaption></figure>;
}
