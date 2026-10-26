// Shared geometry helpers for the logo build (1000-unit grid).
export const f = (n) => +n.toFixed(2);

export function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
}

// de Casteljau split at t -> [left, right] control polygons
export function split(p0, p1, p2, p3, t) {
  const l = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = l(p0, p1), b = l(p1, p2), c = l(p2, p3);
  const d = l(a, b), e = l(b, c), m = l(d, e);
  return [[p0, a, d, m], [m, e, c, p3]];
}

export function flatten(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(bez(p0, p1, p2, p3, i / n));
  return out;
}

export const mirrorPt = ([x, y], cx = 500) => [2 * cx - x, y];
