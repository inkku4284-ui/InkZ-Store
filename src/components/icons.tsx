export function Arrow({ diagonal = false, className = "" }: { diagonal?: boolean; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export function Crosshair({ className = "" }: { className?: string }) {
  return <svg className={className} width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M13 0v26M0 13h26" stroke="currentColor" strokeWidth="1"/><circle cx="13" cy="13" r="6" stroke="currentColor"/></svg>;
}
