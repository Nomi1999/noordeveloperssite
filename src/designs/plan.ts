/**
 * Floor plan drawings as SVG markup, built from the design data at build time.
 *
 * The viewBox is in feet (1 unit = 1 ft) with the street at the bottom. Line
 * weights are CSS pixels (non-scaling strokes); colors and fonts come from
 * classes styled in src/styles/floor-plan.css, which maps them to tokens.
 */
import type { DesignFacts } from "./facts.ts";
import {
  asRegion,
  boundaryPieces,
  boundaryPoint,
  bounds,
  cutWallsRegion,
  difference,
  levelColumns,
  levelRooms,
  pathStrip,
  pieceStrip,
  plotPolygon,
  pointInRegion,
  poleOfInaccessibility,
  rectPoly,
  regionArea,
  slabOutline,
  stairLayout,
  union,
  wallFrames,
  wallPoly,
  wallsRegion,
  gridLetter,
  alongWall,
  type Region,
  type RoomGeometry,
  type WallFrame,
} from "./geometry.ts";
import type { Design, Fixture, Level, Opening, Poly, Pt, Stair } from "./model.ts";
import { dims, feetInches, plotDimensions, sqft } from "./units.ts";

export type PlanTheme = "dark" | "light";

/** Drawing scale at the smallest size a plan is shown, so 1.1 ft text is 11 CSS px */
export const MIN_PX_PER_FOOT = 10;
/** Label text height in feet */
const TEXT = 1.1;
/** Advance width of a monospace character, in em */
const CHAR = 0.6;
const TRACKING = 0.06;

const MARGIN = { left: 12, top: 12, right: 3, bottom: 17 };

export interface PlanOptions {
  theme: PlanTheme;
  /** Prefix for ids inside the SVG, unique on the page */
  id: string;
  /** Extra markup inside the root element, e.g. an embedded stylesheet */
  head?: string;
  /** Width and height attributes, in CSS px; omitted plans fill their container */
  pxPerFoot?: number;
}

export interface Plan {
  svg: string;
  /** Accessible name: design and level */
  title: string;
  /** viewBox size in feet */
  width: number;
  height: number;
  /** Every room with its clear size, for the room schedule */
  schedule: { name: string; size: string; area: string }[];
}

/** Levels that get a plan: those with walls or rooms */
export const planLevels = (design: Design): Level[] => design.levels.filter((l) => l.walls.length || l.rooms.length || l.parapets.length);

export const planTitle = (design: Design, level: Level) => `${design.name}, ${level.name.toLowerCase()} plan`;

// ---- SVG writing ----

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function attrs(a: Record<string, string | number | undefined>): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${typeof v === "number" ? n(v) : esc(v!)}"`)
    .join("");
}

/** Text width in feet for a monospace string */
const textWidth = (text: string, size = TEXT, tracking = 0) => text.length * size * (CHAR + tracking);

class Sheet {
  out: string[] = [];
  depth: number;
  constructor(depth: number) {
    this.depth = depth;
  }

  /** Plot coordinates (y into the plot) to SVG coordinates (y down, street at the bottom) */
  X = (x: number) => x + MARGIN.left;
  Y = (y: number) => this.depth - y + MARGIN.top;
  P = ([x, y]: Pt) => `${n(this.X(x))} ${n(this.Y(y))}`;

  path(d: string, cls: string, extra: Record<string, string | number | undefined> = {}) {
    if (d) this.out.push(`<path${attrs({ class: cls, d, ...extra })}/>`);
  }
  ring = (ring: Poly, close = true) => `M${ring.map(this.P).join("L")}${close ? "Z" : ""}`;
  region = (region: Region) => region.map((r) => this.ring(r)).join("");
  line(a: Pt, b: Pt, cls: string) {
    this.path(`M${this.P(a)}L${this.P(b)}`, cls);
  }
  polyline(points: Pt[], cls: string) {
    this.path(this.ring(points, false), cls);
  }
  rect(x: number, y: number, w: number, d: number, cls: string) {
    this.out.push(`<rect${attrs({ class: cls, x: this.X(x), y: this.Y(y + d), width: w, height: d })}/>`);
  }
  circle(c: Pt, r: number, cls: string) {
    this.out.push(`<circle${attrs({ class: cls, cx: this.X(c[0]), cy: this.Y(c[1]), r })}/>`);
  }
  ellipse(c: Pt, rx: number, ry: number, cls: string) {
    this.out.push(`<ellipse${attrs({ class: cls, cx: this.X(c[0]), cy: this.Y(c[1]), rx, ry })}/>`);
  }
  /** Text at plot coordinates; `rotate` turns it to read bottom to top */
  text(at: Pt, text: string, cls: string, options: { anchor?: string; size?: number; rotate?: boolean } = {}) {
    const x = this.X(at[0]);
    const y = this.Y(at[1]);
    this.out.push(
      `<text${attrs({
        class: cls,
        x,
        y,
        "font-size": options.size ?? TEXT,
        "text-anchor": options.anchor ?? "middle",
        transform: options.rotate ? `rotate(-90 ${n(x)} ${n(y)})` : undefined,
      })}>${esc(text)}</text>`,
    );
  }
  raw(markup: string) {
    this.out.push(markup);
  }
}

// ---- Labels ----

/** The extent of a region along a horizontal line through `p` */
function spanAt(region: Region, p: Pt): [number, number] {
  let left = -Infinity;
  let right = Infinity;
  for (const ring of region) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      if (y1 > p[1] === y2 > p[1]) continue;
      const x = x1 + ((p[1] - y1) * (x2 - x1)) / (y2 - y1);
      if (x <= p[0]) left = Math.max(left, x);
      else right = Math.min(right, x);
    }
  }
  return [left, right];
}

/** Splits words into lines no wider than `width` feet */
function wrap(text: string, width: number, size: number, tracking: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && textWidth(`${last} ${word}`, size, tracking) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

interface LabelLayout {
  at: Pt;
  lines: { t: string; cls: string }[];
  fits: boolean;
}

const LEAD = TEXT * 1.3;

/** Lines of a label laid out at the most open point of a region, and whether they fit there */
function layoutLabel(region: Region, name: string, sub: string[]): LabelLayout {
  const p = poleOfInaccessibility(region);
  const [left, right] = spanAt(region, p);
  const room = Math.max(right - left - 0.6, 3);
  const lines = wrap(name.toUpperCase(), room, TEXT, TRACKING).map((t) => ({ t, cls: "fp-label" }));
  for (const line of sub) {
    const parts = textWidth(line) <= room ? [line] : line.split(/(?= × )/).map((t) => t.trim());
    for (const t of parts) lines.push({ t, cls: "fp-label-sub" });
  }
  const widest = Math.max(...lines.map(({ t, cls }) => textWidth(t, TEXT, cls === "fp-label" ? TRACKING : 0)));
  const x = Math.min(Math.max(p[0], left + widest / 2 + 0.3), right - widest / 2 - 0.3);
  const [down, up] = spanAt(region.map((ring) => ring.map(([a, b]): Pt => [b, a])), [p[1], p[0]]);
  const height = lines.length * LEAD;
  const fits = widest + 0.6 <= right - left && height <= up - down;
  return { at: [x, p[1]], lines, fits };
}

/**
 * A room name and its size. It goes at the most open point clear of fixtures
 * and stairs; if it does not fit there, at the most open point of the whole room.
 */
function label(s: Sheet, preferred: Region, whole: Region, name: string, sub: string[]) {
  let layout = layoutLabel(regionArea(preferred) > 1 ? preferred : whole, name, sub);
  if (!layout.fits && preferred !== whole) {
    const other = layoutLabel(whole, name, sub);
    if (other.fits || other.lines.length <= layout.lines.length) layout = other;
  }
  const top = layout.at[1] + ((layout.lines.length - 1) * LEAD) / 2;
  layout.lines.forEach(({ t, cls }, i) => s.text([layout.at[0], top - i * LEAD - TEXT * 0.35], t, cls));
}

// ---- Symbols ----

type Frame = { at: (a: number, b: number) => Pt; L: number; T: number };

/** Local frame of a fixture: `a` runs along its back, `b` from the back towards the front */
function fixtureFrame(f: Fixture): Frame {
  const { x, y, w, d } = f;
  switch (f.back) {
    case "left":
      return { L: d, T: w, at: (a, b) => [x + b, y + a] };
    case "right":
      return { L: d, T: w, at: (a, b) => [x + w - b, y + a] };
    case "front":
      return { L: w, T: d, at: (a, b) => [x + a, y + b] };
    case "rear":
      return { L: w, T: d, at: (a, b) => [x + a, y + d - b] };
  }
}

function drawFixture(s: Sheet, f: Fixture) {
  const F = fixtureFrame(f);
  const box = (a0: number, b0: number, a1: number, b1: number, cls = "fp-fix") =>
    s.path(s.ring([F.at(a0, b0), F.at(a1, b0), F.at(a1, b1), F.at(a0, b1)]), cls);
  const centre = (a: number, b: number) => F.at(a, b);
  const ell = (a: number, b: number, ra: number, rb: number) => {
    const c = centre(a, b);
    const horizontal = f.back === "front" || f.back === "rear";
    s.ellipse(c, horizontal ? ra : rb, horizontal ? rb : ra, "fp-fix");
  };
  const { L, T } = F;
  switch (f.type) {
    case "counter":
      box(0, 0, L, T);
      s.line(F.at(0, T - 0.15), F.at(L, T - 0.15), "fp-fix-thin");
      break;
    case "sink":
      box(0, 0, L, T);
      box(0.25, 0.25, L - 0.25, T - 0.25);
      s.circle(centre(L / 2, T / 2), 0.12, "fp-fix");
      break;
    case "hob":
      box(0, 0, L, T);
      for (const [a, b] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) s.circle(centre(L * a, T * b), Math.min(L, T) * 0.14, "fp-fix");
      break;
    case "wc":
      box(L / 2 - 0.8, 0, L / 2 + 0.8, 0.55);
      ell(L / 2, 0.55 + (T - 0.55) / 2, 0.65, (T - 0.55) / 2);
      break;
    case "basin":
    case "vanity":
      box(0, 0, L, T);
      ell(L / 2, T / 2 + 0.05, Math.min(L * 0.32, 0.8), T * 0.3);
      break;
    case "shower":
      box(0, 0, L, T);
      s.line(F.at(0, 0), F.at(L, T), "fp-fix-thin");
      s.line(F.at(L, 0), F.at(0, T), "fp-fix-thin");
      s.circle(centre(L / 2, T / 2), 0.15, "fp-fix");
      break;
    case "bathtub":
      box(0, 0, L, T);
      box(0.25, 0.25, L - 0.25, T - 0.25);
      break;
    case "urinal":
      box(0, 0, L, T * 0.4);
      ell(L / 2, T * 0.4, L * 0.4, T * 0.5);
      break;
    case "wardrobe":
      box(0, 0, L, T);
      s.line(F.at(0.2, T / 2), F.at(L - 0.2, T / 2), "fp-fix-dash");
      break;
  }
}

/** An SVG arc of a door swing from `from` to `to` around `c` (screen-space sweep) */
function swing(s: Sheet, c: Pt, from: Pt, to: Pt, r: number, cls: string) {
  const sx = s.X(from[0]) - s.X(c[0]);
  const sy = s.Y(from[1]) - s.Y(c[1]);
  const ex = s.X(to[0]) - s.X(c[0]);
  const ey = s.Y(to[1]) - s.Y(c[1]);
  const sweep = sx * ey - sy * ex > 0 ? 1 : 0;
  s.path(`M${s.P(from)}A${n(r)} ${n(r)} 0 0 ${sweep} ${s.P(to)}`, cls);
}

function drawOpening(s: Sheet, f: WallFrame, o: Opening) {
  const h = f.wall.thickness / 2;
  const s0 = o.offset;
  const s1 = o.offset + o.width;
  const at = (sv: number, t: number) => alongWall(f, sv, t);
  const jambs = () => {
    s.line(at(s0, -h), at(s0, h), "fp-open");
    s.line(at(s1, -h), at(s1, h), "fp-open");
  };
  const side = o.opensTo === "left" ? 1 : -1;
  const leaf = (hingeS: number, closedS: number, width: number) => {
    const hinge = at(hingeS, side * h);
    const tip: Pt = [hinge[0] + f.n[0] * side * width, hinge[1] + f.n[1] * side * width];
    s.line(hinge, tip, "fp-leaf");
    swing(s, hinge, tip, at(closedS, side * h), width, "fp-swing");
  };

  switch (o.type) {
    case "window":
      jambs();
      for (const t of [-h, 0, h]) s.line(at(s0, t), at(s1, t), t === 0 ? "fp-glass" : "fp-open");
      break;
    case "door":
      jambs();
      if (o.hinge === "start") leaf(s0, s1, o.width);
      else leaf(s1, s0, o.width);
      break;
    case "double-door":
      jambs();
      leaf(s0, (s0 + s1) / 2, o.width / 2);
      leaf(s1, (s0 + s1) / 2, o.width / 2);
      break;
    case "sliding-door": {
      jambs();
      const panel = o.width * 0.55;
      s.line(at(s0, h / 3), at(s0 + panel, h / 3), "fp-leaf");
      s.line(at(s1 - panel, -h / 3), at(s1, -h / 3), "fp-leaf");
      break;
    }
    case "opening":
      s.line(at(s0, -h), at(s1, -h), "fp-head");
      s.line(at(s0, h), at(s1, h), "fp-head");
      break;
  }
}

function drawStair(s: Sheet, stair: Stair, rise: number, direction: "UP" | "DN", labelInside = false) {
  const layout = stairLayout(stair, rise);
  if (stair.type === "spiral") s.circle([stair.x + stair.w / 2, stair.y + stair.d / 2], Math.min(stair.w, stair.d) / 2, "fp-fix");
  else if (layout.outline) s.path(s.ring(layout.outline), "fp-fix");
  else s.rect(stair.x, stair.y, stair.w, stair.d, "fp-fix");
  for (const [a, b] of layout.nosings) s.line(a, b, "fp-fix-thin");
  if (layout.rail) s.line(layout.rail[0], layout.rail[1], "fp-fix-thin");
  const path = direction === "UP" ? layout.path : [...layout.path].reverse();
  s.polyline(path, "fp-walk");
  // Arrowhead at the end of the walking line
  const tip = path[path.length - 1];
  const prev = path[path.length - 2];
  const len = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]);
  const u: Pt = [(tip[0] - prev[0]) / len, (tip[1] - prev[1]) / len];
  const back: Pt = [tip[0] - u[0] * 0.9, tip[1] - u[1] * 0.9];
  s.path(s.ring([tip, [back[0] - u[1] * 0.4, back[1] + u[0] * 0.4], [back[0] + u[1] * 0.4, back[1] - u[0] * 0.4]]), "fp-arrow");
  const start = path[0];
  const first = path[1];
  const v: Pt = [first[0] - start[0], first[1] - start[1]];
  const vl = Math.hypot(v[0], v[1]);
  const offset = labelInside ? -1.2 : 1.2;
  s.text([start[0] - (v[0] / vl) * offset, start[1] - (v[1] / vl) * offset - TEXT * 0.35], direction, "fp-label-sub");
}

/** A dimension line between two points along one axis, with ticks and its length */
function dimension(s: Sheet, axis: "x" | "y", from: number, to: number, at: number) {
  const a: Pt = axis === "x" ? [from, at] : [at, from];
  const b: Pt = axis === "x" ? [to, at] : [at, to];
  s.line(a, b, "fp-dimline");
  for (const p of [a, b]) {
    const t = 0.45;
    s.line([p[0] - t, p[1] - t], [p[0] + t, p[1] + t], "fp-tick");
  }
  // Never shrunk: labels stay at TEXT so they read at 11px at the minimum width
  const text = feetInches(Math.abs(to - from));
  const mid = (from + to) / 2;
  if (axis === "x") s.text([mid, at + 0.45], text, "fp-dim");
  else s.text([at - 0.45, mid], text, "fp-dim", { rotate: true });
}

// ---- The plan ----

export function renderPlan(design: Design, level: Level, facts: DesignFacts, options: PlanOptions): Plan {
  const li = design.levels.indexOf(level);
  const { width: W, depth: D } = design.plot;
  // A narrow plot's plan has less room around its text, so a few labels sit differently
  const narrow = W < 40;
  const s = new Sheet(D);
  const id = options.id;
  const frames = wallFrames(level);
  const walls = wallsRegion(level, frames);
  const above = design.levels[li + 1];
  const below = design.levels[li - 1];
  const title = planTitle(design, level);
  const vbW = MARGIN.left + W + MARGIN.right;
  const vbH = MARGIN.top + D + MARGIN.bottom;

  s.rect(-MARGIN.left, -MARGIN.bottom, vbW, vbH, "fp-bg");

  // Plot line and boundary walls
  s.path(s.ring(plotPolygon(design)), "fp-plot");
  if (li === 0) {
    s.path(s.region(union(boundaryPieces(design).map(pieceStrip))), "fp-boundary");
    for (const g of design.site.boundary.gates) {
      s.line(boundaryPoint(design, g.side, g.offset), boundaryPoint(design, g.side, g.offset + g.width), "fp-gate");
    }
  }

  // Site works on the ground floor
  if (li === 0) {
    for (const p of design.site.paving) s.path(s.ring(p.outline), "fp-pave");
    for (const p of design.site.driveways) s.path(s.ring(p.outline), "fp-pave");
    for (const l of design.site.lawns) s.path(s.ring(l.outline), "fp-lawn", { fill: `url(#${id}-lawn)` });
    for (const p of design.site.porches) s.path(s.ring(p.outline), "fp-porch");
    for (const t of design.site.planting.filter((t) => !t.level)) {
      s.circle(t.at, t.size / 2, "fp-plant");
      if (t.kind === "tree" || t.kind === "palm") s.circle(t.at, 0.25, "fp-plant");
      if (t.kind === "palm") {
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          s.line(t.at, [t.at[0] + (Math.cos(a) * t.size) / 2, t.at[1] + (Math.sin(a) * t.size) / 2], "fp-plant");
        }
      }
    }
  }

  for (const t of design.site.planting.filter((t) => t.level === level.id)) s.circle(t.at, t.size / 2, "fp-plant");

  // This level's slab edge (terraces, cantilevers) and the slab above where it overhangs
  if (li > 0) s.path(s.region(slabOutline(level.slab)), "fp-slab");
  if (above) s.path(s.region(difference(slabOutline(above.slab), slabOutline(level.slab))), "fp-above");
  for (const el of design.facade) {
    if (el.level !== level.id || el.type !== "box" || el.z <= 4 || !el.plan) continue;
    s.rect(el.x, el.y, el.w, el.d, "fp-above");
  }

  // Double-height and open voids
  for (const v of level.slab.voids.filter((v) => v.kind === "double-height" || v.kind === "open")) {
    const b = bounds([v.outline]);
    s.path(s.ring(v.outline), "fp-void");
    s.line([b.minX, b.minY], [b.maxX, b.maxY], "fp-void");
    s.line([b.minX, b.maxY], [b.maxX, b.minY], "fp-void");
  }

  // Parapets and tanks
  for (const p of level.parapets) s.path(s.region(pathStrip(p.path, p.closed, p.thickness)), "fp-parapet");
  for (const t of level.tanks) {
    s.rect(t.x, t.y, t.w, t.d, "fp-fix");
    s.line([t.x, t.y], [t.x + t.w, t.y + t.d], "fp-fix-thin");
    s.line([t.x, t.y + t.d], [t.x + t.w, t.y], "fp-fix-thin");
  }

  // Fixtures and stairs
  for (const f of level.fixtures) drawFixture(s, f);
  for (const st of level.stairs) {
    const to = design.levels.find((l) => l.id === st.to)!;
    drawStair(s, st, to.elevation - level.elevation, "UP");
  }
  // An outdoor stair from further down passes this level on its way to one above
  for (const lower of design.levels.slice(0, li)) {
    for (const st of lower.stairs.filter((st) => st.outdoor)) {
      const to = design.levels.find((l) => l.id === st.to)!;
      if (to.elevation > level.elevation) drawStair(s, st, to.elevation - lower.elevation, "UP");
      else if (to === level && lower !== below) drawStair(s, st, to.elevation - lower.elevation, "DN");
    }
  }
  if (below) {
    for (const st of below.stairs.filter((st) => st.to === level.id)) {
      const continues = level.stairs.some((o) => o.x === st.x && o.y === st.y && o.w === st.w && o.d === st.d);
      // On a narrow plan the stair room's wall stands right at the top of the stair
      if (!continues) drawStair(s, st, level.elevation - below.elevation, "DN", narrow);
    }
  }

  // Railings and facade elements cut by the plan (about 4 ft above the floor)
  for (const el of design.facade) {
    if (el.level !== level.id || !el.plan) continue;
    if (el.type === "railing" && el.z <= 4 && el.z + el.h > 2) s.polyline(el.path, "fp-rail");
    if (el.type === "panel" && el.z <= 4 && el.z + el.h > 4) s.polyline(el.path, "fp-cut");
    if (el.type === "box" && el.z <= 4 && el.z + el.h > 4) s.rect(el.x, el.y, el.w, el.d, "fp-cut");
  }

  // Walls, columns and openings
  const columns = levelColumns(design, li);
  const cut = cutWallsRegion(level, frames);
  s.path(s.region(cut), "fp-wall", { "fill-rule": "evenodd" });
  for (const c of columns) s.rect(c.x - c.w / 2, c.y - c.d / 2, c.w, c.d, "fp-wall");
  for (const o of level.openings) {
    const f = frames.get(o.wall);
    if (f) drawOpening(s, f, o);
  }

  // Lifts
  const rooms = levelRooms(level, walls);
  for (const geo of rooms.filter((g) => g.room.type === "lift")) {
    const b = geo.bounds;
    s.line([b.minX + 0.3, b.minY + 0.3], [b.maxX - 0.3, b.maxY - 0.3], "fp-fix-thin");
    s.line([b.minX + 0.3, b.maxY - 0.3], [b.maxX - 0.3, b.minY + 0.3], "fp-fix-thin");
  }

  // Labels: rooms, porches, lawns, voids, tanks
  const obstacles = union(
    ...level.fixtures.map((f) => asRegion(rectPoly(f.x, f.y, f.w, f.d))),
    ...level.stairs.map((st) => asRegion(rectPoly(st.x, st.y, st.w, st.d))),
    ...level.tanks.map((t) => asRegion(rectPoly(t.x, t.y, t.w, t.d))),
    ...(below?.stairs ?? []).filter((st) => st.to === level.id).map((st) => asRegion(rectPoly(st.x, st.y, st.w, st.d))),
  );
  const voids = union(...level.slab.voids.filter((v) => v.kind === "double-height").map((v) => asRegion(v.outline)));
  for (const geo of rooms.filter((geo) => !geo.room.unlabelled)) {
    const open = difference(difference(geo.clear, obstacles), voids);
    label(s, regionArea(open) > geo.area * 0.2 ? open : geo.clear, geo.clear, geo.room.name, [dims(geo.bounds.w, geo.bounds.d)]);
  }
  for (const v of level.slab.voids.filter((v) => v.kind === "double-height")) {
    const region = asRegion(v.outline);
    label(s, region, region, "Open to below", []);
  }
  if (li === 0) {
    for (const p of design.site.porches) {
      const region = asRegion(p.outline);
      const b = bounds(region);
      const cars = facts.porches.find((q) => q.id === p.id)?.cars ?? 0;
      label(s, region, region, "Car porch", [dims(b.w, b.d), `${cars} car${cars === 1 ? "" : "s"}`]);
    }
    for (const l of design.site.lawns) {
      const region = difference(asRegion(l.outline), union(...design.site.planting.map((t) => asRegion(rectPoly(t.at[0] - t.size / 2, t.at[1] - t.size / 2, t.size, t.size)))));
      label(s, region, asRegion(l.outline), "Lawn", []);
    }
  }
  for (const t of level.tanks) s.text([t.x + t.w / 2, t.y + t.d / 2 - TEXT * 0.35], "TANK", "fp-label-sub");

  // Dimension strings, grid bubbles, outside the plot on the rear and left
  // Overall dimensions measure the main building, not detached pieces such as a gatehouse
  const main = asRegion(level.slab.outline);
  const mainWalls = [...frames.values()].filter((f) => pointInRegion(alongWall(f, f.length / 2), main)).map(wallPoly);
  const extents = bounds(union(mainWalls, ...level.parapets.map((p) => pathStrip(p.path, p.closed, p.thickness))));
  if (Number.isFinite(extents.minX)) {
    const gx = design.grid.x.filter((x) => x >= extents.minX - 0.01 && x <= extents.maxX + 0.01);
    const gy = design.grid.y.filter((y) => y >= extents.minY - 0.01 && y <= extents.maxY + 0.01);
    const rowGrid = D + 3;
    const rowAll = D + 6;
    const bubble = D + 9.6;
    const colGrid = -3;
    const colAll = -6;
    const bubbleX = -9.6;
    for (const x of [extents.minX, extents.maxX]) s.line([x, extents.maxY + 0.6], [x, rowAll + 0.8], "fp-ext");
    for (const y of [extents.minY, extents.maxY]) s.line([extents.minX - 0.6, y], [colAll - 0.8, y], "fp-ext");
    gx.forEach((x, i) => {
      if (i) dimension(s, "x", gx[i - 1], x, rowGrid);
      s.line([x, extents.maxY + 0.6], [x, bubble - 1.2], "fp-grid");
      s.circle([x, bubble], 1.2, "fp-bubble");
      s.text([x, bubble - TEXT * 0.35], gridLetter(design.grid.x.indexOf(x)), "fp-label-sub");
    });
    gy.forEach((y, i) => {
      if (i) dimension(s, "y", gy[i - 1], y, colGrid);
      s.line([extents.minX - 0.6, y], [bubbleX + 1.2, y], "fp-grid");
      s.circle([bubbleX, y], 1.2, "fp-bubble");
      s.text([bubbleX, y - TEXT * 0.35], String(design.grid.y.indexOf(y) + 1), "fp-label-sub");
    });
    dimension(s, "x", extents.minX, extents.maxX, rowAll);
    dimension(s, "y", extents.minY, extents.maxY, colAll);
  }

  // Title block: name, level, note, facts; scale bar and north arrow on the right
  const base = -3;
  // Beside the scale bar and north arrow, the text needs the sheet's full width
  const titleX = narrow ? -MARGIN.left + 1 : 0;
  s.line([-MARGIN.left + 1, base + 1.2], [W + MARGIN.right - 1, base + 1.2], "fp-rule");
  s.text([titleX, base - 2.4], design.name.toUpperCase(), "fp-title", { anchor: "start", size: 2.4 });
  s.text([titleX, base - 4.6], `${level.name} plan`.toUpperCase(), "fp-label", { anchor: "start", size: 1.3 });
  s.text([titleX, base - 6.6], "Concept design. Indicative only.", "fp-note", { anchor: "start" });
  const levelArea = facts.levels.find((l) => l.id === level.id)?.coveredArea;
  s.text([titleX, base - 8.4], `Plot ${plotDimensions(facts.plot)} · ${facts.plot.size}`, "fp-label-sub", { anchor: "start" });
  if (levelArea) s.text([titleX, base - 10.2], `Covered area ${sqft(levelArea)}`, "fp-label-sub", { anchor: "start" });

  const scaleEnd = W - 1;
  const scaleLength = narrow ? 10 : 20;
  const scaleStart = scaleEnd - scaleLength;
  const sy = base - 9.5;
  (narrow ? [0, 5, 10] : [0, 5, 10, 20]).forEach((v, i, all) => {
    if (i === all.length - 1) return;
    s.rect(scaleStart + v, sy, all[i + 1] - v, 0.6, i % 2 ? "fp-scale-b" : "fp-scale-a");
  });
  for (const v of [0, scaleLength / 2, scaleLength]) s.text([scaleStart + v, sy - 1.6], v ? `${v}'` : "0", "fp-label-sub");

  const nc: Pt = [scaleEnd - 2.2, base - 4.6];
  const r = 2.1;
  s.circle(nc, r, "fp-bubble");
  const angle = (design.plot.north * Math.PI) / 180;
  const rot = (dx: number, dy: number): Pt => [nc[0] + dx * Math.cos(angle) + dy * Math.sin(angle), nc[1] - dx * Math.sin(angle) + dy * Math.cos(angle)];
  s.path(s.ring([rot(0, r * 0.85), rot(r * 0.42, -r * 0.6), rot(0, -r * 0.3), rot(-r * 0.42, -r * 0.6)]), "fp-north");
  const nTop = rot(0, r + 1.2);
  s.text([nTop[0], nTop[1] - TEXT * 0.35], "N", "fp-label");

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const size = options.pxPerFoot ? attrs({ width: vbW * options.pxPerFoot, height: vbH * options.pxPerFoot }) : "";

  const schedule = rooms.map((geo: RoomGeometry) => ({
    name: geo.room.name,
    size: dims(geo.bounds.w, geo.bounds.d),
    area: sqft(geo.area),
  }));
  if (li === 0) {
    for (const p of design.site.porches) {
      const b = bounds(asRegion(p.outline));
      schedule.push({ name: "Car porch", size: dims(b.w, b.d), area: sqft(regionArea(asRegion(p.outline))) });
    }
  }
  const spaces = `${schedule.length} ${schedule.length === 1 ? "space" : "spaces"}`;
  const desc = `Concept design. Indicative only. The room schedule lists ${spaces} with their sizes.`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="fp fp--${options.theme}" viewBox="0 0 ${n(vbW)} ${n(vbH)}"` +
    `${size} role="img" aria-labelledby="${titleId}" aria-describedby="${descId}" preserveAspectRatio="xMidYMid meet">` +
    `<title id="${titleId}">${esc(title)}</title><desc id="${descId}">${esc(desc)}</desc>${options.head ?? ""}` +
    `<defs><pattern id="${id}-lawn" width="1.5" height="1.5" patternUnits="userSpaceOnUse"><circle class="fp-lawn-dot" cx="0.75" cy="0.75" r="0.12"/></pattern></defs>` +
    `${s.out.join("")}</svg>`;
  return { svg, title, width: vbW, height: vbH, schedule };
}
