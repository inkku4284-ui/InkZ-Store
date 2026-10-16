import { core, plates, type Point } from "./insignia-shape";

function project([x, y]: Point, z: number): Point {
  return [240 + x * 63 - z * 28, 238 - y * 62 + x * 8 - z * 18];
}
function polygon(points: readonly Point[], z: number) {
  return points.map(point => project(point, z).join(",")).join(" ");
}

/** An intentional SVG counterpart keeps the identity visible without WebGL or motion. */
export function ArtifactPoster() {
  return <svg className="artifact-poster" viewBox="0 0 480 480" fill="none" aria-hidden="true">
    <defs><linearGradient id="form-chrome" x1="85" y1="60" x2="360" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#e7e9dc"/><stop offset=".28" stopColor="#7b8774"/><stop offset=".48" stopColor="#c5cebb"/><stop offset=".62" stopColor="#58654e"/><stop offset="1" stopColor="#dce1d4"/></linearGradient></defs>
    <g transform="rotate(-11 240 240)">
      <ellipse cx="240" cy="240" rx="157" ry="164" stroke="#323d2a" strokeWidth="3"/>
      <ellipse cx="240" cy="240" rx="145" ry="154" stroke="url(#form-chrome)" strokeWidth="10" strokeDasharray="770 170" transform="rotate(-20 240 240)"/>
      <ellipse cx="240" cy="240" rx="136" ry="145" stroke="#c6e66f" strokeWidth="1.5" strokeDasharray="100 800" transform="rotate(-37 240 240)"/>
      <path d="M348 337a145 154 0 0 1-42 35" stroke="#d1ef72" strokeWidth="10"/>
      {[[-.7,-.7],[.7,-.7],[.7,.7],[-.7,.7]].map(([x,y],index) => <g key={index}><circle cx={240+x*145} cy={240+y*154} r="7" fill="#aeb9a1" stroke="#45513b" strokeWidth="2"/><path d={`M${236+x*145} ${240+y*154}h8`} stroke="#26311d" strokeWidth="2"/></g>)}
      <polygon points={polygon(core, -0.62)} fill="#283023" stroke="#5b6652" strokeWidth=".7"/>
      <polygon points={polygon(core, -0.24)} fill="#c9e879" stroke="#d1ef72" strokeWidth=".7"/>
      {plates.map(({points, hole}, index) => <g key={index}>
        {points.map((point, edge) => <polygon key={edge} points={[project(point, .24), project(points[(edge + 1) % points.length], .24), project(points[(edge + 1) % points.length], -.15), project(point, -.15)].map(p => p.join(",")).join(" ")} fill={["#69755d", "#333e2b", "#859178", "#49553d"][edge % 4]}/>)}
        <polygon points={polygon(points, .28)} fill="url(#form-chrome)" stroke="#d3dac9" strokeWidth=".7"/>
        {hole && <circle cx={project(hole, .24)[0]} cy={project(hole, .24)[1]} r="3.3" fill="#252e20" stroke="#d5dec8" strokeWidth=".8"/>}
      </g>)}
    </g>
  </svg>;
}
