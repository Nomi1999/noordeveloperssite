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
