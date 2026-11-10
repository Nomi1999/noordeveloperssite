/**
 * Walkthroughs: a series of 360° views through a finished house.
 *
 * A walkthrough is content, one JSON file per design (src/designs/walkthroughs/<slug>.json). The renderer reads
 * the same file to place its cameras, and the site reads it to build the tour, so a room cannot be rendered but
 * missing from the tour, or the other way round. Marker directions and map positions are never authored: they are
 * computed here from the design's doors, stairs and plan, so moving a door moves its marker.
 *
 * Units are feet, as in the rest of src/designs. A viewpoint's `facing` is a world angle in degrees measured
 * counter-clockwise from +x (the street runs along +x, the plot goes into +y).
 *
 * Panorama orientation convention (shared with the renderer, see render/README.md): the centre of every panorama
 * looks along +y, world angle 90°. The viewer's yaw θ turns clockwise from the centre, so θ = 90° − world angle.
 */
import { z } from "zod";
import { alongWall, asRegion, distToSegment, pointInRegion, wallFrames } from "./geometry.ts";
import type { Design, Level, Opening, Pt, Room, Stair } from "./model.ts";
import { planPoint } from "./plan.ts";

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase letters, digits and dashes");

/** `via` for two rooms that meet with no wall between them (a lounge and its kitchenette) */
export const OPEN = "open";

export const Link = z.object({
  to: Id,
  /**
   * The door, opening or stair the visitor goes through, or "open" where two rooms on one storey meet with no wall.
   * Absent: both views are in one room.
   */
  via: Id.optional(),
});

/** A room the tour leaves out on purpose, with the reason; every other room must have a viewpoint */
export const Excluded = z.object({
  level: Id,
  room: Id,
  reason: z.string().min(1),
});

export const Viewpoint = z.object({
  id: Id,
  /** The room it shows, or null for a space the design has no room for (the car porch) */
  room: Id.nullable(),
  /** Shown instead of the room's name, for a second view in the same room or a space without a room */
  label: z.string().min(1).optional(),
  level: Id,
  /** Eye position on the plan, feet */
  at: z.tuple([z.number(), z.number()]),
  /** World angle (degrees, counter-clockwise from +x) the view opens on */
  facing: z.number(),
  /** What the view shows, for people who cannot see it */
  description: z.string().min(1),
  links: z.array(Link).default([]),
});

export const Walkthrough = z.object({
  design: Id,
  /** Levels the tour covers, bottom to top */
  levels: z.array(Id).min(1),
  /** The viewpoint the tour opens on */
  start: Id,
  viewpoints: z.array(Viewpoint).min(1),
  /** Rooms with no viewpoint, by the maintainer's choice (e.g. a room only reachable from outside) */
  excluded: z.array(Excluded).default([]),
});

export type Link = z.output<typeof Link>;
export type Viewpoint = z.output<typeof Viewpoint>;
export type Walkthrough = z.output<typeof Walkthrough>;

/** How close a door must be to a room's outline for the room to count as having it */
const ON_OUTLINE = 0.6;

/**
 * Every walkthrough, as authored: each JSON file in ./walkthroughs gives its design a tour, with no code change.
 * (import.meta.glob is resolved by Vite, which builds the site and runs the tests.)
 */
const files = import.meta.glob<{ default: unknown }>("./walkthroughs/*.json", { eager: true });
export const walkthroughSources: unknown[] = Object.keys(files)
  .sort()
  .map((path) => files[path].default);

// ---- directions ----

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Normalised to (-180, 180] */
export function normaliseAngle(a: number): number {
  const r = ((((a + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
}

/** The world angle of the direction from one point to another, degrees counter-clockwise from +x */
export const worldAngle = (from: Pt, to: Pt): number => deg(Math.atan2(to[1] - from[1], to[0] - from[0]));

/** The viewer's yaw for a world angle: panorama centres face world 90°, and yaw turns clockwise */
export const viewerYaw = (world: number): number => normaliseAngle(90 - world);

// ---- locating doors and stairs ----

const levelOf = (design: Design, id: string): Level | undefined => design.levels.find((l) => l.id === id);

function openingMid(level: Level, opening: Opening): Pt | undefined {
  const frame = wallFrames(level).get(opening.wall);
  return frame ? alongWall(frame, opening.offset + opening.width / 2) : undefined;
}

const stairCentre = (s: Stair): Pt => [s.x + s.w / 2, s.y + s.d / 2];

/** The shortest open stretch that counts as a way through: about a narrow doorway */
export const OPEN_MIN = 2;
/** How far apart two outline edges (or an edge and a wall's face) may be and still count as the same line */
const SAME_LINE = 0.45;

/**
 * Where two rooms on one storey meet with no wall: the longest stretch of their shared outline that no wall covers,
 * with its middle point. Undefined when they share none of at least OPEN_MIN feet.
 */
export function openStretch(level: Level, a: Room, b: Room): { mid: Pt; length: number } | undefined {
  let best: { mid: Pt; length: number } | undefined;
  const edges = (r: Room) => r.outline.map((p, i) => [p, r.outline[(i + 1) % r.outline.length]] as const);
  for (const [p, q] of edges(a)) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 1e-6) continue;
    const u: Pt = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
    const off = (c: Pt) => Math.abs((c[0] - p[0]) * u[1] - (c[1] - p[1]) * u[0]);
    const along = (c: Pt) => (c[0] - p[0]) * u[0] + (c[1] - p[1]) * u[1];
    for (const [r, s] of edges(b)) {
      if (off(r) > SAME_LINE || off(s) > SAME_LINE) continue;
      const lo = Math.max(0, Math.min(along(r), along(s)));
      const hi = Math.min(len, Math.max(along(r), along(s)));
      if (hi - lo < OPEN_MIN) continue;
      // take away every stretch a wall stands on, door or not: a doorway is a door link, not an open boundary
      let free: [number, number][] = [[lo, hi]];
      for (const w of level.walls) {
        const reach = w.thickness / 2 + 0.05;
        if (off(w.a) > reach || off(w.b) > reach) continue;
        const w0 = Math.min(along(w.a), along(w.b));
        const w1 = Math.max(along(w.a), along(w.b));
        free = free.flatMap(([f0, f1]): [number, number][] =>
          w1 <= f0 || w0 >= f1 ? [[f0, f1]] : [...(w0 > f0 ? [[f0, w0] as [number, number]] : []), ...(w1 < f1 ? [[w1, f1] as [number, number]] : [])],
        );
      }
      for (const [f0, f1] of free) {
        if (f1 - f0 < OPEN_MIN || (best && best.length >= f1 - f0)) continue;
        const m = (f0 + f1) / 2;
        best = { mid: [p[0] + u[0] * m, p[1] + u[1] * m], length: f1 - f0 };
      }
    }
  }
  return best;
}

const roomOf = (level: Level | undefined, vp: Viewpoint): Room | undefined =>
  vp.room === null ? undefined : level?.rooms.find((r) => r.id === vp.room);

/** Where a link passes through, on the plan: the middle of its door, open stretch or stair */
export function linkPoint(design: Design, from: Viewpoint, link: Link, to: Viewpoint): Pt | undefined {
  if (!link.via) return to.at;
  const level = levelOf(design, from.level);
  if (link.via === OPEN) {
    const a = roomOf(level, from);
    const b = roomOf(level, to);
    return level && a && b ? openStretch(level, a, b)?.mid : undefined;
  }
  const opening = level?.openings.find((o) => o.id === link.via);
  if (level && opening) return openingMid(level, opening);
  const stair = level?.stairs.find((s) => s.id === link.via);
  return stair ? stairCentre(stair) : undefined;
}

/** The viewer yaw of the marker for a link, as seen from a viewpoint */
export function markerYaw(design: Design, from: Viewpoint, link: Link, to: Viewpoint): number {
  const p = linkPoint(design, from, link, to);
  return viewerYaw(worldAngle(from.at, p ?? to.at));
}

/** Eye height of a panorama, in feet (1.55 m) */
const EYE_FT = 1.55 / 0.3048;

// ---- the tour as the page and the encoder use it ----

export interface TourLink {
  to: string;
  label: string;
  /** Viewer yaw of the marker, and the yaw to open the next view on so the visitor keeps going the same way */
  yaw: number;
  /** Marker height: the spot on the floor where the link is, seen from eye height */
  pitch: number;
  /** How far away that spot is, in feet: the marker is drawn smaller the further it is */
  distance: number;
  /** -1 down a level, 0 same level, 1 up a level */
  climb: -1 | 0 | 1;
  via?: string;
  /** Changes level */
  stair: boolean;
}

export interface TourView {
  id: string;
  label: string;
  level: string;
  levelName: string;
  /** The room the view is in, so views in the same room can be told apart from a way into the next one */
  room: string | null;
  /** Viewer yaw the view opens on */
  yaw: number;
  /** On the plan's viewBox, in feet */
  point: Pt;
  description: string;
  links: TourLink[];
}

export interface Tour {
  slug: string;
  start: string;
  levels: { id: string; name: string }[];
  views: TourView[];
}

export function roomName(design: Design, vp: Viewpoint): string {
  if (vp.label) return vp.label;
  const room = levelOf(design, vp.level)?.rooms.find((r) => r.id === vp.room);
  return room?.name ?? vp.id;
}

export function buildTour(design: Design, wt: Walkthrough): Tour {
  const by = new Map(wt.viewpoints.map((v) => [v.id, v]));
  return {
    slug: design.slug,
    start: wt.start,
    levels: wt.levels.map((id) => ({ id, name: levelOf(design, id)?.name ?? id })),
    views: wt.viewpoints.map((vp) => ({
      id: vp.id,
      label: roomName(design, vp),
      level: vp.level,
      levelName: levelOf(design, vp.level)?.name ?? vp.level,
      room: vp.room ?? null,
      yaw: viewerYaw(vp.facing),
      point: planPoint(design, vp.at),
      description: vp.description,
      links: vp.links.map((l) => {
        const to = by.get(l.to)!;
        const point = linkPoint(design, vp, l, to) ?? to.at;
        const distance = Math.max(1, Math.hypot(point[0] - vp.at[0], point[1] - vp.at[1]));
        const rank = (id: string) => wt.levels.indexOf(id);
        return {
          to: l.to,
          label: roomName(design, to),
          yaw: markerYaw(design, vp, l, to),
          // The floor spot as seen from eye height, kept within what a wide view shows
          pitch: Math.round(Math.max(-62, Math.min(-8, -deg(Math.atan2(EYE_FT, distance)))) * 10) / 10,
          distance: Math.round(distance * 10) / 10,
          climb: Math.sign(rank(to.level) - rank(vp.level)) as -1 | 0 | 1,
          ...(l.via ? { via: l.via } : {}),
          stair: to.level !== vp.level,
        };
      }),
    })),
  };
}

// ---- checks ----

/** Everything wrong with a walkthrough, as sentences; empty when it is sound */
export function walkthroughProblems(design: Design, wt: Walkthrough): string[] {
  const out: string[] = [];
  const say = (m: string) => out.push(`${design.slug} walkthrough: ${m}`);
  if (wt.design !== design.slug) say(`is for "${wt.design}", not "${design.slug}"`);

  for (const id of wt.levels) if (!levelOf(design, id)) say(`level "${id}" does not exist`);
  const by = new Map<string, Viewpoint>();
  for (const vp of wt.viewpoints) {
    if (by.has(vp.id)) say(`two viewpoints are called "${vp.id}"`);
    by.set(vp.id, vp);
  }
  if (!by.has(wt.start)) say(`starts on "${wt.start}", which is not a viewpoint`);

  // each viewpoint sits in its room
  for (const vp of wt.viewpoints) {
    const level = levelOf(design, vp.level);
    if (!level || !wt.levels.includes(vp.level)) {
      say(`viewpoint "${vp.id}" is on level "${vp.level}", which the tour does not cover`);
      continue;
    }
    if (vp.room === null) {
      if (!vp.label) say(`viewpoint "${vp.id}" has no room, so it needs a label`);
      continue;
    }
    const room = level.rooms.find((r) => r.id === vp.room);
    if (!room) say(`viewpoint "${vp.id}" is in room "${vp.room}", which is not on the ${level.name.toLowerCase()}`);
    else if (!pointInRegion(vp.at, asRegion(room.outline))) say(`viewpoint "${vp.id}" is outside its room "${room.id}"`);
  }

  // every room has a viewpoint, except those left out on purpose
  const left = (level: string, room: string) => wt.excluded.some((x) => x.level === level && x.room === room);
  for (const x of wt.excluded) {
    if (!levelOf(design, x.level)?.rooms.some((r) => r.id === x.room)) say(`excludes room "${x.room}", which is not on level "${x.level}"`);
    else if (wt.viewpoints.some((v) => v.level === x.level && v.room === x.room)) say(`excludes room "${x.room}" but has a viewpoint in it`);
  }
  for (const id of wt.levels) {
    for (const room of levelOf(design, id)?.rooms ?? []) {
      if (left(id, room.id)) continue;
      if (!wt.viewpoints.some((v) => v.level === id && v.room === room.id)) say(`room "${room.id}" has no viewpoint`);
    }
  }

  // links
  for (const vp of wt.viewpoints) {
    for (const link of vp.links) {
      const to = by.get(link.to);
      const name = `link ${vp.id} → ${link.to}`;
      if (!to) {
        say(`${name}: no such viewpoint`);
        continue;
      }
      if (to.id === vp.id) say(`${name}: a viewpoint cannot link to itself`);
      if (!to.links.some((l) => l.to === vp.id && l.via === link.via)) say(`${name}: ${to.id} has no link back through the same ${link.via ?? "room"}`);
      if (!link.via) {
        if (vp.room === null || vp.room !== to.room || vp.level !== to.level) say(`${name}: without a door, both views must be in the same room`);
        continue;
      }
      const upper = levelOf(design, vp.level);
      if (link.via === OPEN) {
        const a = roomOf(upper, vp);
        const b = roomOf(upper, to);
        if (vp.level !== to.level || !upper || !a || !b) say(`${name}: an open link joins two rooms on one level`);
        else if (a.id === b.id) say(`${name}: both views are in "${a.id}", so the link needs no "via"`);
        else if (!openStretch(upper, a, b)) say(`${name}: "${a.id}" and "${b.id}" do not meet without a wall`);
        continue;
      }
      const stair = upper?.stairs.find((s) => s.id === link.via);
      const lower = levelOf(design, to.level);
      const stairBetween = (a: Level | undefined, b: Level | undefined) => a?.stairs.find((s) => s.id === link.via && s.to === b?.id);
      if (stair || lower?.stairs.some((s) => s.id === link.via)) {
        if (!stairBetween(upper, lower) && !stairBetween(lower, upper)) say(`${name}: stair "${link.via}" does not join ${vp.level} and ${to.level}`);
        continue;
      }
      if (vp.level !== to.level) {
        say(`${name}: views on different levels can only be joined by a stair`);
        continue;
      }
      const opening = upper?.openings.find((o) => o.id === link.via);
      const mid = upper && opening ? openingMid(upper, opening) : undefined;
      if (!opening || !mid) {
        say(`${name}: "${link.via}" is not a door or stair on the ${upper?.name.toLowerCase()}`);
        continue;
      }
      for (const v of [vp, to]) {
        if (v.room === null) continue;
        const room = upper?.rooms.find((r) => r.id === v.room);
        const ring = room?.outline ?? [];
        const near = ring.some((p, i) => distToSegment(mid, p, ring[(i + 1) % ring.length]) <= ON_OUTLINE);
        if (!near) say(`${name}: "${link.via}" is not on the outline of "${v.room}"`);
      }
    }
  }

  // every viewpoint can be reached from the start
  const seen = new Set<string>();
  const queue = [wt.start];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id) || !by.has(id)) continue;
    seen.add(id);
    for (const l of by.get(id)!.links) queue.push(l.to);
  }
  for (const vp of wt.viewpoints) if (!seen.has(vp.id)) say(`viewpoint "${vp.id}" cannot be reached from "${wt.start}"`);

  return out;
}

export function parseWalkthrough(source: unknown): Walkthrough {
  return Walkthrough.parse(source);
}

/** Walkthroughs by design slug, parsed. Importing the validated registry (see walkthroughs.ts) checks them. */
export const parsedWalkthroughs = new Map(walkthroughSources.map((s) => parseWalkthrough(s)).map((w) => [w.design, w]));
