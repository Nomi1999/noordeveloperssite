/**
 * Authoring helpers that keep design files short: grid references, walls with
 * standard thicknesses, openings with standard heights, and level stacking.
 */
import { offset as offsetRegion, asRegion, gridLetter } from "./geometry.ts";
import type { z } from "zod";
import type { DesignInput, FacadeElement, Fixture, LevelInput, Opening, Poly, Pt, Room, SideName, Wall } from "./model.ts";

/** 9-inch exterior brick wall */
export const EXT = 0.75;
/** 4.5-inch interior partition */
export const INT = 0.375;
/** Floor-to-floor height of a storey */
export const STOREY = 11;
export const SLAB = 0.5;
/** Ground floor level above the road */
export const PLINTH = 2;
/** Doors and window heads line up at 8 feet */
export const DOOR_HEIGHT = 8;
export const WINDOW_SILL = 3;
export const WINDOW_HEIGHT = 5;

export type WallInput = z.input<typeof Wall>;
export type OpeningInput = z.input<typeof Opening>;
export type RoomInput = z.input<typeof Room>;
export type FixtureInput = z.input<typeof Fixture>;
export type FacadeInput = z.input<typeof FacadeElement>;

export const defineDesign = (design: DesignInput): DesignInput => design;

/**
 * A structural grid: x lines lettered A, B, C ..., y lines numbered 1, 2, 3 ...
 * `g("B", 3)` is the intersection of line B and line 3, optionally nudged.
 */
export function makeGrid(x: number[], y: number[]) {
  const X = (letter: string): number => {
    const v = x[letter.charCodeAt(0) - 65];
    if (v === undefined) throw new Error(`No grid line ${letter}; lines are A-${gridLetter(x.length - 1)}`);
    return v;
  };
  const Y = (n: number): number => {
    const v = y[n - 1];
    if (v === undefined) throw new Error(`No grid line ${n}; lines are 1-${y.length}`);
    return v;
  };
  const g = (letter: string, n: number, dx = 0, dy = 0): Pt => [X(letter) + dx, Y(n) + dy];
  return { x, y, X, Y, g };
}

type WallOptions = Partial<Omit<WallInput, "id" | "a" | "b">>;

export function wall(id: string, a: Pt, b: Pt, options: WallOptions = {}): WallInput {
  const kind = options.kind ?? "interior";
  return { id, a, b, kind, thickness: kind === "exterior" ? EXT : INT, ...options };
}

export const ext = (id: string, a: Pt, b: Pt, options: WallOptions = {}) => wall(id, a, b, { kind: "exterior", ...options });
export const int = (id: string, a: Pt, b: Pt, options: WallOptions = {}) => wall(id, a, b, { kind: "interior", ...options });

/** Walls through a list of points, named `<prefix>-1`, `<prefix>-2` ...; closed joins the last point to the first */
export function chain(prefix: string, points: Pt[], options: WallOptions & { closed?: boolean } = {}): WallInput[] {
  const { closed = false, ...rest } = options;
  const ends = closed ? [...points, points[0]] : points;
  return ends.slice(1).map((b, i) => wall(`${prefix}-${i + 1}`, ends[i], b, rest));
}

type OpeningOptions = Partial<Omit<OpeningInput, "id" | "wall" | "offset">>;

export function door(id: string, host: string, offset: number, options: OpeningOptions = {}): OpeningInput {
  return { id, wall: host, type: "door", offset, width: 3, height: DOOR_HEIGHT, ...options };
}

export function win(id: string, host: string, offset: number, width: number, options: OpeningOptions = {}): OpeningInput {
  return { id, wall: host, type: "window", offset, width, height: WINDOW_HEIGHT, sill: WINDOW_SILL, ...options };
}

/** A doorless gap such as an arch between lounge and dining */
export function gap(id: string, host: string, offset: number, width: number, options: OpeningOptions = {}): OpeningInput {
  return { id, wall: host, type: "opening", offset, width, height: DOOR_HEIGHT, ...options };
}

/** A rectangle from two opposite corners */
export function rect(a: Pt, b: Pt): Poly {
  const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

export function room(
  id: string,
  name: string,
  type: RoomInput["type"],
  outline: Poly,
  options: Partial<Omit<RoomInput, "id" | "name" | "type" | "outline">> = {},
): RoomInput {
  return { id, name, type, outline, ...options };
}

export function fixture(id: string, type: FixtureInput["type"], at: Pt, size: Pt, back: SideName): FixtureInput {
  return { id, type, x: at[0], y: at[1], w: size[0], d: size[1], back };
}

/** Grows a polygon by `d` feet with square corners, e.g. from wall centrelines to their outer faces */
export function outset(poly: Poly, d: number): Poly {
  const out = offsetRegion(asRegion(poly), d);
  if (out.length !== 1) throw new Error(`outset by ${d} gave ${out.length} rings`);
  return out[0].map(([x, y]): Pt => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
}

/** Gives each level its elevation: the first sits at `base`, each next one on top of the last */
export function stack(base: number, levels: Omit<LevelInput, "elevation">[]): LevelInput[] {
  let elevation = base;
  return levels.map((level) => {
    const placed = { ...level, elevation };
    elevation += level.height;
    return placed;
  });
}

/** `count` equal facade boxes spaced evenly from `from` to `to` (their centres) */
export function repeat(
  prefix: string,
  count: number,
  from: Pt,
  to: Pt,
  box: Omit<Extract<FacadeInput, { type: "box" }>, "id" | "type" | "x" | "y">,
): FacadeInput[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const cx = from[0] + (to[0] - from[0]) * t;
    const cy = from[1] + (to[1] - from[1]) * t;
    return { id: `${prefix}-${i + 1}`, type: "box", x: cx - box.w / 2, y: cy - box.d / 2, ...box };
  });
}

/**
 * A stretch of building surface for the finish helpers below. `from` to `to` runs left to right
 * as seen from outside, so outward is to the right of that direction in plan. `z` and `h` are
 * relative to `level`, like every facade element.
 */
export interface Face {
  level: string;
  from: Pt;
  to: Pt;
  z: number;
  h: number;
}

/** A rectangle on a face to leave clear, such as a window: `s0` to `s1` along it, `z0` to `z1` measured like the face's `z` */
export interface Hole {
  s0: number;
  s1: number;
  z0: number;
  z1: number;
}

type Panel = Extract<FacadeInput, { type: "panel" }>;

export function faceLength(face: Face): number {
  return Math.hypot(face.to[0] - face.from[0], face.to[1] - face.from[1]);
}

/** The point `s` along a face and `out` off its surface */
export function facePoint(face: Face, s: number, out = 0): Pt {
  const L = faceLength(face);
  const ux = (face.to[0] - face.from[0]) / L;
  const uy = (face.to[1] - face.from[1]) / L;
  return [face.from[0] + ux * s + uy * out, face.from[1] + uy * s - ux * out];
}

/** A finish standing on a face, `depth` thick from `out` off the surface. Finishes stay off the floor plans */
function band(id: string, role: string, material: Panel["material"], face: Face, s0: number, s1: number, z: number, h: number, out: number, depth: number): Panel {
  const mid = out + depth / 2;
  return { id, type: "panel", level: face.level, role, material, path: [facePoint(face, s0, mid), facePoint(face, s1, mid)], thickness: depth, z, h, plan: false };
}

/** The parts of the range a to b that the given spans leave uncovered */
function uncovered(a: number, b: number, spans: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let at = a;
  for (const [s0, s1] of [...spans].sort((p, q) => p[0] - q[0])) {
    if (s0 > at) out.push([at, Math.min(s0, b)]);
    at = Math.max(at, s1);
    if (at >= b) return out;
  }
  if (at < b) out.push([at, b]);
  return out;
}

/** A finish over a whole face, in as few rectangles as its holes allow */
export function cladding(prefix: string, face: Face, material: Panel["material"], options: { holes?: Hole[]; out?: number; depth?: number } = {}): Panel[] {
  const { holes = [], out = 0, depth = 0.08 } = options;
  const L = faceLength(face);
  const top = face.z + face.h;
  const cuts = [...new Set([0, L, ...holes.flatMap((h) => [h.s0, h.s1])])].filter((s) => s >= 0 && s <= L).sort((a, b) => a - b);
  const panels: Panel[] = [];
  cuts.slice(1).forEach((s1, i) => {
    const s0 = cuts[i];
    const across = holes.filter((h) => h.s0 < s1 && h.s1 > s0);
    for (const [z0, z1] of uncovered(face.z, top, across.map((h) => [h.z0, h.z1]))) {
      panels.push(band(`${prefix}-${panels.length + 1}`, "cladding", material, face, s0, s1, z0, z1 - z0, out, depth));
    }
  });
  return panels;
}

/** Thin dark joints between tiles, `width` by `height`, measured from the face's left end and base; none cross a hole */
export function tileJoints(prefix: string, face: Face, options: { width: number; height: number; holes?: Hole[]; out?: number }): Panel[] {
  const { width, height, holes = [], out = 0.08 } = options;
  const JOINT = 0.04;
  const L = faceLength(face);
  const top = face.z + face.h;
  const panels: Panel[] = [];
  const joint = (s0: number, s1: number, z: number, h: number) =>
    panels.push(band(`${prefix}-${panels.length + 1}`, "reveal", "plaster-charcoal", face, s0, s1, z, h, out, 0.015));
  for (let s = width; s < L - 0.01; s += width) {
    const across = holes.filter((h) => h.s0 < s && h.s1 > s).map((h): [number, number] => [h.z0, h.z1]);
    for (const [z0, z1] of uncovered(face.z, top, across)) joint(s - JOINT / 2, s + JOINT / 2, z0, z1 - z0);
  }
  for (let z = face.z + height; z < top - 0.01; z += height) {
    const across = holes.filter((h) => h.z0 < z && h.z1 > z).map((h): [number, number] => [h.s0, h.s1]);
    for (const [s0, s1] of uncovered(0, L, across)) joint(s0, s1, z - JOINT / 2, JOINT);
  }
  return panels;
}

/** Vertical slats centred along a face, on a dark backing board */
export function slatRun(prefix: string, face: Face, options: { width?: number; gap?: number; depth?: number; out?: number; backing?: Panel["material"] } = {}): Panel[] {
  const { width = 0.25, gap = 0.17, depth = 0.15, out = 0, backing = "plaster-charcoal" } = options;
  const L = faceLength(face);
  const count = Math.floor((L + gap) / (width + gap));
  const start = (L - (count * width + (count - 1) * gap)) / 2;
  const slats = Array.from({ length: count }, (_, i) => {
    const s = start + i * (width + gap);
    return band(`${prefix}-${i + 1}`, "slat", "wood-slat", face, s, s + width, face.z, face.h, out + 0.05, depth);
  });
  return [band(`${prefix}-backing`, "cladding", backing, face, 0, L, face.z, face.h, out, 0.05), ...slats];
}

/** LED lines running up a face at the given distances along it */
export function ledLines(prefix: string, face: Face, at: number[], out = 0.08): Panel[] {
  return at.map((s, i) => band(`${prefix}-${i + 1}`, "led", "led-strip", face, s - 0.03, s + 0.03, face.z, face.h, out, 0.03));
}

/** Wall lights, each a dark box the renderer gives an up and a down spot; `at` is [along the face, height of its centre] */
export function sconces(prefix: string, face: Face, at: [number, number][], out = 0.08): Panel[] {
  const SIZE = 0.7;
  return at.map(([s, z], i) => band(`${prefix}-${i + 1}`, "sconce", "metal-dark", face, s - SIZE / 2, s + SIZE / 2, z - SIZE / 2, SIZE, out, 0.3));
}

/** Hidden downlights that scallop a wall, at height `z` (their top) and `out` off its surface */
export function washLights(prefix: string, face: Face, at: number[], z: number, out = 0.3): Panel[] {
  return at.map((s, i) => band(`${prefix}-${i + 1}`, "wash", "metal-dark", face, s - 0.1, s + 0.1, z - 0.05, 0.05, out, 0.1));
}

/** The grey stone tile, with its joints */
export const stoneTile = (id: string, f: Face, width: number, height: number, holes: Hole[] = []) => [
  ...cladding(id, f, "stone-tile-grey", { holes }),
  ...tileJoints(`${id}-joint`, f, { width, height, holes }),
];

/** The bright dots of a soffit's downlights, spaced as the renderer spaces the lights themselves: one per 2.2 m */
export const downlightDots = (soffit: FacadeInput): FacadeInput[] => {
  if (soffit.type !== "box") return [];
  const count = (length: number) => Math.max(1, Math.round((length * 0.3048) / 2.2));
  const [nx, ny] = [count(soffit.w), count(soffit.d)];
  return Array.from({ length: nx * ny }, (_, k) => {
    const [i, j] = [k % nx, Math.floor(k / nx)];
    const [x, y] = [soffit.x + ((i + 0.5) * soffit.w) / nx, soffit.y + ((j + 0.5) * soffit.d) / ny];
    return { id: `${soffit.id}-dot-${k + 1}`, type: "box", level: "ground", role: "led", material: "led-strip", x: x - 0.12, y: y - 0.12, w: 0.24, d: 0.24, z: soffit.z - 0.02, h: 0.02, plan: false };
  });
};

export const withDots = (soffit: FacadeInput) => [soffit, ...downlightDots(soffit)];

/** A horizontal LED line */
export const ledEdge = (id: string, f: Face): FacadeInput => ({ ...cladding(id, f, "led-strip", { depth: 0.03 })[0], id, role: "led" });

/** Finish helpers for the ground level whose heights are given above the road, for a design with this plinth */
export function finishKit(plinth: number) {
  const above = (height: number) => height - plinth;
  const face = (from: Pt, to: Pt, z0: number, z1: number): Face => ({ level: "ground", from, to, z: above(z0), h: z1 - z0 });
  const hole = (s0: number, s1: number, z0: number, z1: number): Hole => ({ s0, s1, z0: above(z0), z1: above(z1) });
  const box = (id: string, role: string, material: FacadeInput["material"], a: Pt, b: Pt, z0: number, z1: number): FacadeInput => ({
    id,
    type: "box",
    level: "ground",
    role,
    material,
    x: a[0],
    y: a[1],
    w: b[0] - a[0],
    d: b[1] - a[1],
    z: above(z0),
    h: z1 - z0,
    plan: false,
  });
  return { above, face, hole, box };
}

/** Height of a panelled boundary's white base */
export const BOUNDARY_BASE = 1.1;
/** Height of a panelled boundary's top */
export const BOUNDARY_TOP = 7;
/** How far the stone stands inside the plot line, so the white base shows at its foot */
const BOUNDARY_INSET = 0.22;
/** How far the slats sit behind the hood above them */
const SLAT_INSET = 0.45;
const BOUNDARY_PANEL = 0.3;

/**
 * A boundary whose finish changes every few feet: panels standing on a low white base.
 * `edges` are the plot's edges in outline order, so each runs left to right as seen from the street.
 * Name each panel `boundary-<edge>-...`, so a shot can hide that edge.
 */
export function boundaryKit<E extends string>(plinth: number, edges: Record<E, [Pt, Pt]>) {
  const { above, face } = finishKit(plinth);
  const run = (edge: E, s0: number, s1: number, z0: number, z1: number, inset = BOUNDARY_INSET): Face => {
    const line: Face = { level: "ground", from: edges[edge][0], to: edges[edge][1], z: 0, h: 1 };
    return face(facePoint(line, s0, -inset), facePoint(line, s1, -inset), z0, z1);
  };
  const inWall = { out: -BOUNDARY_PANEL, depth: BOUNDARY_PANEL };

  /** Stone tile wall on one edge: `holes` are measured from the start of this stretch */
  const stoneWall = (id: string, edge: E, s0: number, s1: number, holes: Hole[] = []) => {
    const f = run(edge, s0, s1, BOUNDARY_BASE, BOUNDARY_TOP);
    return [...cladding(id, f, "stone-tile-grey", { ...inWall, holes }), ...tileJoints(`${id}-joint`, f, { width: 5.5, height: 2.95, holes, out: 0 })];
  };
  /** A run of slats set back under a dark hood with hidden lights */
  const hoodedSlats = (id: string, edge: E, s0: number, s1: number) => {
    const slats = run(edge, s0, s1, BOUNDARY_BASE, 5.4, SLAT_INSET);
    const count = Math.round((s1 - s0) / 1.8);
    const lights = Array.from({ length: count }, (_, i) => ((i + 0.5) * (s1 - s0)) / count);
    return [
      ...slatRun(id, slats, { out: -0.05 }),
      ...cladding(`${id}-hood`, run(edge, s0, s1, 5.4, BOUNDARY_TOP, 0.02), "plaster-charcoal", { out: -SLAT_INSET, depth: SLAT_INSET }),
      ...washLights(`${id}-wash`, slats, lights, above(5.35)),
    ];
  };
  const timberDoor = (id: string, f: Face) => slatRun(id, f, { width: 0.14, gap: 0.05, depth: 0.05, out: -0.1 });
  // The 90 only sets the direction of the line the lights are measured along
  const wallLights = (id: string, edge: E, at: number[]) =>
    sconces(id, run(edge, 0, 90, BOUNDARY_BASE, BOUNDARY_TOP), at.map((s): [number, number] => [s, above(4.6)]), -0.1);

  return { run, inWall, stoneWall, hoodedSlats, timberDoor, wallLights };
}
