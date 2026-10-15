import { core, plates, type Point } from "./insignia-shape";

function project([x, y]: Point, z: number): Point {
  return [210 + x * 70 - z * 36, 220 - y * 68 + x * 5 - z * 23];
}
function polygon(points: readonly Point[], z: number) {
  return points.map(point => project(point, z).join(",")).join(" ");
}

/** A locally rendered SVG shares the WebGL sculpture's actual plate outlines. */
export function ArtifactPoster() {
  return <svg className="artifact-poster" viewBox="0 0 420 440" fill="none" aria-hidden="true">
    <g transform="rotate(7 210 220)">
      <polygon points={polygon(core, -0.52)} fill="#303234" stroke="#5b5c58" strokeWidth="0.7"/>
      <polygon points={polygon(core, -0.18)} fill="#9f3b35" stroke="#c76d61" strokeWidth="0.7"/>
      {plates.map(({points, hole}, index) => <g key={index}>
        {points.map((point, edge) => <polygon key={edge} points={[project(point, 0.24), project(points[(edge + 1) % points.length], 0.24), project(points[(edge + 1) % points.length], -0.15), project(point, -0.15)].map(p => p.join(",")).join(" ")} fill={["#666863", "#414442", "#777871", "#474a47"][edge % 4]}/>)}
        <polygon points={polygon(points, 0.28)} fill={index === 2 ? "#8a8c88" : "#6d6f6b"} stroke="#a8aaa5" strokeWidth="0.7"/>
        {hole && <circle cx={project(hole, 0.24)[0]} cy={project(hole, 0.24)[1]} r="3.7" fill="#252725" stroke="#d5d3c8" strokeWidth="0.8"/>}
      </g>)}
    </g>
  </svg>;
}
