/**
 * Geometry shared by validation, floor plans and the render export, so each
 * question (where a wall is solid, how big a room is) is answered once.
 *
 * A Region is a list of rings: outer rings counter-clockwise, holes clockwise.
 */
import ClipperLib from "clipper-lib";
import type { Design, Level, Opening, PlotEdgeName, Poly, Pt, Room, SideName, Slab, Stair, Wall } from "./model.ts";

export type Region = Poly[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  d: number;
}

/** Below this, lengths are equal (feet; about 1/100 inch) */
export const EPS = 1e-3;
/** Below this, areas are noise from rounding (square feet) */
export const AREA_EPS = 0.05;

// ---- Polygons ----

export function signedArea(poly: Poly): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** Area of a region: holes count negative */
export function regionArea(region: Region): number {
  return region.reduce((sum, ring) => sum + signedArea(ring), 0);
}

export function bounds(rings: Poly[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, d: maxY - minY };
}

export function rectPoly(x: number, y: number, w: number, d: number): Poly {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + d],
    [x, y + d],
  ];
}

/** Drops repeated points, including an explicit closing point equal to the first */
export function cleanRing(poly: Poly): Poly {
  const out: Poly = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > EPS) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= EPS) {
    out.pop();
  }
  return out;
}

/** Turns a hand-drawn polygon into a one-ring region, counter-clockwise */
export function asRegion(poly: Poly): Region {
  const ring = cleanRing(poly);
  return [signedArea(ring) < 0 ? [...ring].reverse() : ring];
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const cross = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    return true;
  }
  // Collinear overlap or touching counts too, since the edges are not adjacent
  const on = (p: Pt, q: Pt, r: Pt) => distToSegment(r, p, q) <= EPS;
  return on(c, d, a) || on(c, d, b) || on(a, b, c) || on(a, b, d);
}

/**
 * Why a polygon cannot be a closed outline, or null if it can: it needs three
 * distinct corners, a real area, and edges that do not cross each other.
 */
export function outlineProblem(poly: Poly): string | null {
  const ring = cleanRing(poly);
  if (ring.length < 3) return `has ${ring.length} distinct point(s); a closed outline needs at least 3`;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) {
        return `crosses itself (edges ${i + 1} and ${j + 1})`;
      }
    }
  }
  if (Math.abs(signedArea(ring)) < AREA_EPS) return "encloses no area";
  return null;
}

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Even-odd point test across all rings, so holes are outside */
export function pointInRegion(p: Pt, region: Region): boolean {
  let inside = false;
  for (const ring of region) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// ---- Boolean operations (Clipper works in integers: 1 unit = 1/1000 ft) ----

const SCALE = 1000;

function toPaths(region: Region) {
  return region.map((ring) => ring.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) })));
}

function fromPaths(paths: { X: number; Y: number }[][]): Region {
  return paths.filter((path) => path.length >= 3).map((path) => path.map((p): Pt => [p.X / SCALE, p.Y / SCALE]));
}

function clip(type: number, subject: Region, clipRegion: Region): Region {
  const c = new ClipperLib.Clipper();
  c.AddPaths(toPaths(subject), ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(toPaths(clipRegion), ClipperLib.PolyType.ptClip, true);
  const out = new ClipperLib.Paths();
  c.Execute(type, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return fromPaths(out);
}

export const union = (...regions: Region[]): Region => clip(ClipperLib.ClipType.ctUnion, regions.flat(), []);
export const difference = (a: Region, b: Region): Region => clip(ClipperLib.ClipType.ctDifference, a, b);
export const intersection = (a: Region, b: Region): Region => clip(ClipperLib.ClipType.ctIntersection, a, b);

/** Grows (positive) or shrinks (negative) a region with mitred corners */
export function offset(region: Region, delta: number): Region {
  const co = new ClipperLib.ClipperOffset(4, 0.25 * SCALE);
  co.AddPaths(toPaths(region), ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out = new ClipperLib.Paths();
  co.Execute(out, delta * SCALE);
  return fromPaths(out);
}

/** A straight piece of a polyline band: its centreline and thickness */
export interface Piece {
  from: Pt;
  to: Pt;
  thickness: number;
}

/**
 * Splits a polyline band, such as a parapet or railing, into straight pieces.
 * Ends that meet another piece run on by half the thickness, as walls do, so
 * corners are filled.
 */
export function pathPieces(path: Poly, closed: boolean, thickness: number): Piece[] {
  const ends = closed ? [...path, path[0]] : path;
  const count = ends.length - 1;
  return ends.slice(1).map((b, i) => {
    const a = ends[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const extA = closed || i > 0 ? thickness / 2 : 0;
    const extB = closed || i < count - 1 ? thickness / 2 : 0;
    return {
      from: [a[0] - u[0] * extA, a[1] - u[1] * extA],
      to: [b[0] + u[0] * extB, b[1] + u[1] * extB],
      thickness,
    };
  });
}

/** The band a piece covers in plan */
export function pieceStrip({ from: a, to: b, thickness }: Piece): Poly {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [(-(b[1] - a[1]) / len) * (thickness / 2), ((b[0] - a[0]) / len) * (thickness / 2)];
  return asRegion([
    [a[0] + n[0], a[1] + n[1]],
    [b[0] + n[0], b[1] + n[1]],
    [b[0] - n[0], b[1] - n[1]],
    [a[0] - n[0], a[1] - n[1]],
  ])[0];
}

/** A band of the given thickness centred on a polyline, such as a parapet or railing */
export const pathStrip = (path: Poly, closed: boolean, thickness: number): Region =>
  union(pathPieces(path, closed, thickness).map(pieceStrip));

/** Area of `a` that lies outside `b` */
export const areaOutside = (a: Region, b: Region): number => regionArea(difference(a, b));

// ---- Walls ----

export interface WallFrame {
  wall: Wall;
  length: number;
  /** Unit vector from a to b */
  u: Pt;
  /** Unit normal to the left of a→b */
  n: Pt;
  /** How far each end runs past its centreline endpoint to meet the walls it joins */
  extA: number;
  extB: number;
}

function joinExtension(p: Pt, self: Wall, walls: Wall[]): number {
  let ext = 0;
  for (const other of walls) {
    if (other === self) continue;
    if (distToSegment(p, other.a, other.b) <= EPS) ext = Math.max(ext, other.thickness / 2);
  }
  return ext;
}

export function wallFrame(wall: Wall, walls: Wall[]): WallFrame {
  const dx = wall.b[0] - wall.a[0];
  const dy = wall.b[1] - wall.a[1];
  const length = Math.hypot(dx, dy);
  const u: Pt = [dx / length, dy / length];
  return {
    wall,
    length,
    u,
    n: [-u[1], u[0]],
    extA: joinExtension(wall.a, wall, walls),
    extB: joinExtension(wall.b, wall, walls),
  };
}

export function wallFrames(level: Level): Map<string, WallFrame> {
  return new Map(level.walls.map((wall) => [wall.id, wallFrame(wall, level.walls)]));
}

/** A point at distance `s` along the centreline from `a`, moved `t` to the left */
export function alongWall(f: WallFrame, s: number, t = 0): Pt {
  return [f.wall.a[0] + f.u[0] * s + f.n[0] * t, f.wall.a[1] + f.u[1] * s + f.n[1] * t];
}

/** The full-thickness strip of a wall between distances s0 and s1 from `a` */
export function wallStrip(f: WallFrame, s0: number, s1: number): Poly {
  const h = f.wall.thickness / 2;
  const ring: Poly = [alongWall(f, s0, -h), alongWall(f, s1, -h), alongWall(f, s1, h), alongWall(f, s0, h)];
  return signedArea(ring) < 0 ? ring.reverse() : ring;
}

/** The whole wall including the joins at its ends */
export const wallPoly = (f: WallFrame): Poly => wallStrip(f, -f.extA, f.length + f.extB);

/** Union of every wall on a level, ignoring openings */
export function wallsRegion(level: Level, frames = wallFrames(level)): Region {
  return union([...frames.values()].map(wallPoly));
}

/** What a plan shows cut at sill height: walls with door and window gaps */
export function cutWallsRegion(level: Level, frames = wallFrames(level)): Region {
  const gaps = level.openings.flatMap((o) => {
    const f = frames.get(o.wall);
    return f ? [wallStrip(f, o.offset, o.offset + o.width)] : [];
  });
  return difference(wallsRegion(level, frames), union(gaps));
}

/** Clear height from a level's floor to the underside of the slab above */
export function clearHeight(design: Design, levelIndex: number): number {
  const level = design.levels[levelIndex];
  const above = design.levels[levelIndex + 1];
  return level.height - (above ? above.slab.thickness : 0);
}

export interface WallSegment {
  wall: string;
  part: "solid" | "sill" | "lintel";
  /** The opening a sill or lintel belongs to */
  opening?: string;
  /** Centreline start and end */
  from: Pt;
  to: Pt;
  thickness: number;
  /** Absolute elevations */
  bottom: number;
  top: number;
  material: Wall["material"];
}

/**
 * Splits a wall into boxes around its openings: solid pieces between openings,
 * plus a sill piece below each window and a lintel piece above every opening.
 */
export function splitWall(f: WallFrame, openings: Opening[], base: number, height: number): WallSegment[] {
  const { wall } = f;
  const piece = (part: WallSegment["part"], s0: number, s1: number, z0: number, z1: number, opening?: string) =>
    ({
      wall: wall.id,
      part,
      ...(opening ? { opening } : {}),
      from: alongWall(f, s0),
      to: alongWall(f, s1),
      thickness: wall.thickness,
      bottom: base + z0,
      top: base + z1,
      material: wall.material,
    }) satisfies WallSegment;

  const out: WallSegment[] = [];
  let s = -f.extA;
  for (const o of [...openings].sort((p, q) => p.offset - q.offset)) {
    if (o.offset - s > EPS) out.push(piece("solid", s, o.offset, 0, height));
    const end = o.offset + o.width;
    if (o.sill > EPS) out.push(piece("sill", o.offset, end, 0, o.sill, o.id));
    const head = o.sill + o.height;
    if (height - head > EPS) out.push(piece("lintel", o.offset, end, head, height, o.id));
    s = end;
  }
  if (f.length + f.extB - s > EPS) out.push(piece("solid", s, f.length + f.extB, 0, height));
  return out;
}

/** Wall height: its own, or the clear height up to the slab above */
export const wallHeight = (wall: Wall, design: Design, levelIndex: number): number =>
  wall.height ?? clearHeight(design, levelIndex);

// ---- Site ----

/** The plot as a closed polygon: its outline, or the rectangle its width and depth give */
export const plotPolygon = (design: Design): Poly => design.plot.outline ?? rectPoly(0, 0, design.plot.width, design.plot.depth);

export const plotArea = (design: Design): number => Math.abs(signedArea(plotPolygon(design)));

const OUTLINE_EDGES: PlotEdgeName[] = ["front", "corner", "right", "rear", "left"];

/** The centreline of the boundary wall along each edge of a plot outline, mitred where edges meet */
export function plotEdges(design: Design): { edge: PlotEdgeName; a: Pt; b: Pt }[] {
  const ring = design.plot.outline!;
  const mid = design.site.boundary.thickness / 2;
  const n = ring.length;
  const inward = (i: number): Pt => {
    const [p, q] = [ring[i], ring[(i + 1) % n]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [-(q[1] - p[1]) / len, (q[0] - p[0]) / len];
  };
  // Where the inset lines of the edges before and after a corner cross
  const corner = (i: number): Pt => {
    const [n0, n1] = [inward((i + n - 1) % n), inward(i)];
    const denom = 1 + n0[0] * n1[0] + n0[1] * n1[1];
    return [ring[i][0] + (mid * (n0[0] + n1[0])) / denom, ring[i][1] + (mid * (n0[1] + n1[1])) / denom];
  };
  return ring.map((_, i) => ({ edge: OUTLINE_EDGES[i], a: corner(i), b: corner((i + 1) % n) }));
}

/** A point on the centreline of the boundary wall along one plot side, `v` feet along it */
export function boundaryPoint(design: Design, side: SideName, v: number): Pt {
  const { width: W, depth: D } = design.plot;
  const mid = design.site.boundary.thickness / 2;
  if (design.plot.outline) {
    const { a, b } = plotEdges(design).find((e) => e.edge === side)!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [a[0] + ((b[0] - a[0]) / len) * v, a[1] + ((b[1] - a[1]) / len) * v];
  }
  return side === "front" ? [v, mid] : side === "rear" ? [v, D - mid] : side === "left" ? [mid, v] : [W - mid, v];
}

/**
 * Boundary wall pieces along the plot sides, broken at gates. Side walls stop
 * at the front and rear walls, so no two pieces overlap.
 */
export function boundaryPieces(design: Design): (Piece & { side: PlotEdgeName })[] {
  const { sides, thickness, gates } = design.site.boundary;
  const out: (Piece & { side: PlotEdgeName })[] = [];
  if (design.plot.outline) {
    for (const { edge, a, b } of plotEdges(design)) {
      if (edge === "corner" ? !(sides.includes("front") && sides.includes("right")) : !sides.includes(edge)) continue;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u: Pt = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
      const at = (v: number): Pt => [a[0] + u[0] * v, a[1] + u[1] * v];
      const spans = gates
        .filter((g) => g.side === edge)
        .sort((p, q) => p.offset - q.offset)
        .map((g) => [g.offset, g.offset + g.width]);
      // Ends run on by half the thickness so the corners are filled
      let start = -thickness / 2;
      for (const [p, q] of [...spans, [length + thickness / 2, length + thickness / 2]]) {
        if (p - start > EPS) out.push({ side: edge, from: at(start), to: at(p), thickness });
        start = q;
      }
    }
    return out;
  }
  for (const side of sides) {
    const horizontal = side === "front" || side === "rear";
    const length = horizontal ? design.plot.width : design.plot.depth;
    const lo = !horizontal && sides.includes("front") ? thickness : 0;
    const hi = !horizontal && sides.includes("rear") ? length - thickness : length;
    const spans = gates
      .filter((g) => g.side === side)
      .sort((a, b) => a.offset - b.offset)
      .map((g) => [g.offset, g.offset + g.width]);
    let start = lo;
    for (const [a, b] of [...spans, [hi, hi]]) {
      const stop = Math.min(a, hi);
      if (stop - start > EPS) {
        out.push({ side, from: boundaryPoint(design, side, start), to: boundaryPoint(design, side, stop), thickness });
      }
      start = Math.max(start, b);
    }
  }
  return out;
}

// ---- Rooms ----

export interface RoomGeometry {
  room: Room;
  /** The room inside its walls */
  clear: Region;
  area: number;
  bounds: Bounds;
  /** Where the label goes: the point furthest from the room's edges */
  labelAt: Pt;
}

export function roomGeometry(room: Room, walls: Region): RoomGeometry {
  const drawn = asRegion(room.outline);
  let clear = difference(drawn, walls);
  if (regionArea(clear) < AREA_EPS) clear = drawn;
  return { room, clear, area: regionArea(clear), bounds: bounds(clear), labelAt: poleOfInaccessibility(clear) };
}

export function levelRooms(level: Level, walls = wallsRegion(level)): RoomGeometry[] {
  return level.rooms.map((room) => roomGeometry(room, walls));
}

// ---- Slabs and areas ----

/** Everything a slab covers, ignoring voids: its outline and any islands */
export const slabOutline = (slab: Slab): Region => union(asRegion(slab.outline), ...slab.islands.map(asRegion));

/** A slab with its voids cut out; `kinds` limits which voids are cut */
export function slabRegion(slab: Slab, kinds?: Slab["voids"][number]["kind"][]): Region {
  const voids = slab.voids.filter((v) => !kinds || kinds.includes(v.kind)).map((v) => asRegion(v.outline));
  return difference(slabOutline(slab), union(...voids));
}

/**
 * Covered area of a level: its floor (less double-height and open voids) that
 * lies under any slab higher up. Terraces open to the sky are left out.
 */
export function coveredRegion(design: Design, levelIndex: number): Region {
  const floor = slabRegion(design.levels[levelIndex].slab, ["double-height", "open"]);
  const above = union(...design.levels.slice(levelIndex + 1).map((l) => slabRegion(l.slab, ["open"])));
  return intersection(floor, above);
}

export const coveredArea = (design: Design, levelIndex: number): number =>
  regionArea(coveredRegion(design, levelIndex));

// ---- Columns ----

export interface Column {
  /** Grid reference such as "B3" */
  ref: string;
  x: number;
  y: number;
  w: number;
  d: number;
}

export const gridLetter = (i: number): string => String.fromCharCode(65 + i);

/**
 * Columns stand at grid intersections that are on this level's floor and
 * under the next slab up, so they carry it; the grid's `omit` list removes some.
 */
export function levelColumns(design: Design, levelIndex: number): Column[] {
  const above = design.levels[levelIndex + 1];
  if (!above) return [];
  const floor = slabRegion(design.levels[levelIndex].slab);
  const carried = slabOutline(above.slab);
  const [w, d] = design.grid.column;
  const out: Column[] = [];
  design.grid.x.forEach((x, i) => {
    design.grid.y.forEach((y, j) => {
      const ref = `${gridLetter(i)}${j + 1}`;
      if (design.grid.omit.includes(ref)) return;
      if (pointInRegion([x, y], floor) && pointInRegion([x, y], carried)) out.push({ ref, x, y, w, d });
    });
  });
  return out;
}

// ---- Stairs ----

const SIDE_DIR: Record<SideName, Pt> = { rear: [0, 1], front: [0, -1], right: [1, 0], left: [-1, 0] };

export interface StairStep {
  /** Axis-aligned tread or landing, as x, y, w, d */
  rect: [number, number, number, number];
  /** Top of the tread, relative to the stair's floor */
  top: number;
}

export interface StairLayout {
  risers: number;
  riser: number;
  tread: number;
  /** Treads, in order of climbing, ending with any mid landing */
  steps: StairStep[];
  /** The edge lines of every riser, for drawing */
  nosings: [Pt, Pt][];
  /** The walking line from the bottom step to the top, for the direction arrow */
  path: Pt[];
  /** Dog-leg only: the handrail line between the two flights */
  rail?: [Pt, Pt];
  /** What it covers in plan, when that is not its rectangle */
  outline?: Poly;
  /** Spiral only: its wedge-shaped treads, in order of climbing */
  wedges?: { outline: Poly; top: number }[];
}

/** Target riser height: 7 inches */
const RISER_TARGET = 7 / 12;
/** The shallowest tread a stair is laid out with: 10 inches */
const TREAD_MIN = 10 / 12;
/** A spiral stair turns this far per tread */
const SPIRAL_STEP = Math.PI / 6;

/**
 * Lays out the treads of a stair climbing `rise` feet. A dog-leg has two
 * equal flights side by side with a landing at the far end; it arrives back
 * at the end it started from.
 */
export function stairLayout(stair: Stair, rise: number): StairLayout {
  const u = SIDE_DIR[stair.up];
  const right: Pt = [u[1], -u[0]];
  const along = Math.abs(u[0]) > 0 ? stair.w : stair.d;
  const across = Math.abs(u[0]) > 0 ? stair.d : stair.w;
  // Start corner: the near edge (against the direction of travel), on the left
  const cx = stair.x + stair.w / 2;
  const cy = stair.y + stair.d / 2;
  const origin: Pt = [cx - (u[0] * along) / 2 - (right[0] * across) / 2, cy - (u[1] * along) / 2 - (right[1] * across) / 2];
  // Point at distance s along travel and r to the right of the start corner
  const at = (s: number, r: number): Pt => [origin[0] + u[0] * s + right[0] * r, origin[1] + u[1] * s + right[1] * r];
  const box = (s0: number, s1: number, r0: number, r1: number): StairStep["rect"] => {
    const [x0, y0] = at(s0, r0);
    const [x1, y1] = at(s1, r1);
    return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
  };

  if (stair.type === "spiral") return spiralLayout(stair, rise);
  if (stair.type === "l-shaped") {
    // Two flights around a corner landing. An outdoor stair like this may be steeper than the
    // target riser, so the plan's run sets the number of treads and the rise is shared among them.
    const flight = stair.flight ?? 2.25;
    const run1 = along - flight;
    const run2 = across - flight;
    const treads = Math.floor((run1 + run2) / TREAD_MIN + 1e-9);
    const n1 = Math.round((treads * run1) / (run1 + run2));
    const n2 = treads - n1;
    const risers = treads + 2;
    const riser = rise / risers;
    const [t1, t2] = [run1 / n1, run2 / n2];
    // The first flight keeps to its side; the second runs along the far edge, back across the stair
    const toRight = stair.firstFlight === "left";
    const [a0, a1] = toRight ? [0, flight] : [across - flight, across];
    const across2 = (v: number) => (toRight ? flight + v : across - flight - v);
    const steps: StairStep[] = [];
    const nosings: [Pt, Pt][] = [];
    for (let i = 0; i < n1; i++) {
      steps.push({ rect: box(i * t1, (i + 1) * t1, a0, a1), top: (i + 1) * riser });
      nosings.push([at(i * t1, a0), at(i * t1, a1)]);
    }
    nosings.push([at(run1, a0), at(run1, a1)]);
    steps.push({ rect: box(run1, along, a0, a1), top: (n1 + 1) * riser });
    for (let i = 0; i < n2; i++) {
      const [r0, r1] = [across2(i * t2), across2((i + 1) * t2)];
      steps.push({ rect: box(run1, along, Math.min(r0, r1), Math.max(r0, r1)), top: (n1 + i + 2) * riser });
      nosings.push([at(run1, r0), at(along, r0)]);
    }
    nosings.push([at(run1, across2(run2)), at(along, across2(run2))]);
    const m = (a0 + a1) / 2;
    const turn = run1 + flight / 2;
    const inner1 = toRight ? a1 : a0;
    const outer1 = toRight ? a0 : a1;
    const far = across2(run2);
    return {
      risers,
      riser,
      tread: Math.min(t1, t2),
      steps,
      nosings,
      path: [at(0, m), at(turn, m), at(turn, far)],
      outline: [at(0, inner1), at(run1, inner1), at(run1, far), at(along, far), at(along, outer1), at(0, outer1)],
    };
  }

  const risers = Math.ceil(rise / RISER_TARGET - 1e-9);
  const riser = rise / risers;
  const steps: StairStep[] = [];
  const nosings: [Pt, Pt][] = [];

  if (stair.type === "straight") {
    const tread = along / (risers - 1);
    for (let i = 0; i < risers - 1; i++) {
      steps.push({ rect: box(i * tread, (i + 1) * tread, 0, across), top: (i + 1) * riser });
    }
    for (let i = 0; i < risers; i++) nosings.push([at(i * tread, 0), at(i * tread, across)]);
    return { risers, riser, tread, steps, nosings, path: [at(0, across / 2), at(along - tread / 2, across / 2)] };
  }

  const gap = 0.25;
  const flight = (across - gap) / 2;
  const landing = flight;
  const r1 = Math.ceil(risers / 2);
  const r2 = risers - r1;
  const tread = (along - landing) / Math.max(r1 - 1, r2 - 1);
  // First flight takes the right or left half, looking along `up`
  const [f1a, f1b] = stair.firstFlight === "right" ? [across - flight, across] : [0, flight];
  const [f2a, f2b] = stair.firstFlight === "right" ? [0, flight] : [across - flight, across];
  const run = along - landing;

  if (stair.extraRun > 0) {
    // The first flight starts before the outline, so the flights differ in length and landing sits higher up
    const extra = stair.extraRun;
    const even = (2 * run + extra) / (risers - 2);
    const n2 = Math.max(1, Math.round(run / even));
    const n1 = risers - 2 - n2;
    const [t1, t2] = [(run + extra) / n1, run / n2];
    for (let i = 0; i < n1; i++) {
      steps.push({ rect: box(i * t1 - extra, (i + 1) * t1 - extra, f1a, f1b), top: (i + 1) * riser });
      nosings.push([at(i * t1 - extra, f1a), at(i * t1 - extra, f1b)]);
    }
    nosings.push([at(run, f1a), at(run, f1b)]);
    steps.push({ rect: box(run, along, 0, across), top: (n1 + 1) * riser });
    for (let i = 0; i < n2; i++) {
      steps.push({ rect: box(run - (i + 1) * t2, run - i * t2, f2a, f2b), top: (n1 + i + 2) * riser });
      nosings.push([at(run - i * t2, f2a), at(run - i * t2, f2b)]);
    }
    nosings.push([at(0, f2a), at(0, f2b)]);
    const [m1, m2] = [(f1a + f1b) / 2, (f2a + f2b) / 2];
    const turn = run + landing / 2;
    return {
      risers,
      riser,
      tread: Math.min(t1, t2),
      steps,
      nosings,
      path: [at(-extra, m1), at(turn, m1), at(turn, m2), at(0, m2)],
      rail: [at(0, across / 2), at(run, across / 2)],
      outline: [at(-extra, f1a), at(0, f1a), at(0, 0), at(along, 0), at(along, across), at(0, across), at(0, f1b), at(-extra, f1b)],
    };
  }

  for (let i = 0; i < r1 - 1; i++) {
    steps.push({ rect: box(run - (r1 - 1 - i) * tread, run - (r1 - 2 - i) * tread, f1a, f1b), top: (i + 1) * riser });
  }
  for (let i = 0; i < r1; i++) {
    const s = run - (r1 - 1 - i) * tread;
    nosings.push([at(s, f1a), at(s, f1b)]);
  }
  steps.push({ rect: box(run, along, 0, across), top: r1 * riser });
  for (let i = 0; i < r2 - 1; i++) {
    steps.push({ rect: box(run - (i + 1) * tread, run - i * tread, f2a, f2b), top: (r1 + i + 1) * riser });
  }
  for (let i = 0; i < r2; i++) {
    const s = run - i * tread;
    nosings.push([at(s, f2a), at(s, f2b)]);
  }
  const m1 = (f1a + f1b) / 2;
  const m2 = (f2a + f2b) / 2;
  const turn = run + landing / 2;
  return {
    risers,
    riser,
    tread,
    steps,
    nosings,
    path: [at(run - (r1 - 1) * tread, m1), at(turn, m1), at(turn, m2), at(run - (r2 - 1) * tread, m2)],
    rail: [at(0, across / 2), at(run, across / 2)],
  };
}

/** A spiral around the centre of its outline, climbing counter-clockwise from the `up` side */
function spiralLayout(stair: Stair, rise: number): StairLayout {
  const c: Pt = [stair.x + stair.w / 2, stair.y + stair.d / 2];
  const r = Math.min(stair.w, stair.d) / 2;
  const hub = 0.25;
  const start = Math.atan2(SIDE_DIR[stair.up][1], SIDE_DIR[stair.up][0]);
  const risers = Math.ceil(rise / RISER_TARGET - 1e-9);
  const riser = rise / risers;
  const at = (radius: number, angle: number): Pt => [c[0] + radius * Math.cos(angle), c[1] + radius * Math.sin(angle)];
  const wedges = Array.from({ length: risers - 1 }, (_, i) => {
    const [a0, a1] = [start + i * SPIRAL_STEP, start + (i + 1) * SPIRAL_STEP];
    return { outline: [at(hub, a0), at(r, a0), at(r, (a0 + a1) / 2), at(r, a1), at(hub, a1)], top: (i + 1) * riser };
  });
  // One full turn is enough to draw: the plan shows the top of the stair over the rest
  const turn = Math.round((2 * Math.PI) / SPIRAL_STEP);
  const nosings = Array.from({ length: turn }, (_, i): [Pt, Pt] => [at(hub, start + i * SPIRAL_STEP), at(r, start + i * SPIRAL_STEP)]);
  const walk = r * 0.65;
  const path = Array.from({ length: turn - 1 }, (_, i) => at(walk, start + (i + 0.5) * SPIRAL_STEP));
  return { risers, riser, tread: SPIRAL_STEP * walk, steps: [], nosings, path, wedges };
}

// ---- Labels ----

/** Signed distance from a point to a region's edges: positive inside */
function regionDistance(p: Pt, region: Region): number {
  let min = Infinity;
  for (const ring of region) {
    for (let i = 0; i < ring.length; i++) min = Math.min(min, distToSegment(p, ring[i], ring[(i + 1) % ring.length]));
  }
  return pointInRegion(p, region) ? min : -min;
}

/**
 * The pole of inaccessibility (the "polylabel" method): the point inside a
 * region furthest from its edges. Unlike the centroid it stays inside L-shapes.
 */
export function poleOfInaccessibility(region: Region, precision = 0.1): Pt {
  const b = bounds(region);
  const size = Math.min(b.w, b.d);
  if (!(size > 0)) return [b.minX, b.minY];

  interface Cell {
    x: number;
    y: number;
    h: number;
    dist: number;
    max: number;
  }
  const cell = (x: number, y: number, h: number): Cell => {
    const dist = regionDistance([x, y], region);
    return { x, y, h, dist, max: dist + h * Math.SQRT2 };
  };

  const queue: Cell[] = [];
  const h0 = size / 2;
  for (let x = b.minX; x < b.maxX; x += size) {
    for (let y = b.minY; y < b.maxY; y += size) queue.push(cell(x + h0, y + h0, h0));
  }
  let best = cell(b.minX + b.w / 2, b.minY + b.d / 2, 0);
  while (queue.length) {
    queue.sort((p, q) => p.max - q.max);
    const c = queue.pop()!;
    if (c.dist > best.dist) best = c;
    if (c.max - best.dist <= precision) continue;
    const h = c.h / 2;
    queue.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
  }
  return [best.x, best.y];
}
