/** Original INKZ identity study. Geometry is unrelated to product architecture. */
export type Point = readonly [number, number];
export type Plate = { points: readonly Point[]; hole?: Point };

export const plates: readonly Plate[] = [
  { points: [[-1.35, 1.86], [-0.12, 1.86], [0.23, 1.28], [-1, 1.28]], hole: [-0.87, 1.57] },
  { points: [[0.1, 1.86], [1.3, 1.86], [0.95, 1.28], [0.45, 1.28]] },
  { points: [[0.49, 1.1], [1.05, 1.1], [-0.52, -1.1], [-1.08, -1.1]] },
  { points: [[-1.3, -1.28], [-0.4, -1.28], [-0.05, -1.86], [-0.95, -1.86]] },
  { points: [[-0.18, -1.28], [1.3, -1.28], [0.95, -1.86], [0.17, -1.86]], hole: [0.79, -1.55] },
];

export const core: readonly Point[] = [
  [-1.27, 1.77], [1.24, 1.77], [1.24, 1.3], [-0.59, -1.3],
  [1.22, -1.3], [0.93, -1.77], [-1.2, -1.77], [-1.2, -1.31],
  [0.6, 1.3], [-1.27, 1.3],
];
