/**
 * Render export: one JSON file per design for the Blender pipeline. Geometry
 * is resolved here so the renderer only extrudes the given boxes and polygons:
 * walls come already split around openings, with absolute bottoms and tops.
 *
 * Units are feet. x runs along the street, y into the plot and z up, with the
 * origin at the plot's front-left corner at road level.
 */
import { z } from "zod";
import type { DesignFacts } from "./facts.ts";
import {
  alongWall,
  boundaryPieces,
  boundaryPoint,
  clearHeight,
  levelColumns,
  levelRooms,
  pathPieces,
  signedArea,
  slabRegion,
  splitWall,
  stairLayout,
  wallFrames,
  wallHeight,
  pointInRegion,
} from "./geometry.ts";
import { FixtureType, Material, OpeningType, PlotEdge, Point, Polygon, RoomType, Side, type Design, type Poly } from "./model.ts";

/** Raise when the format changes incompatibly; the renderer refuses other versions */
export const SCHEMA_VERSION = 1;

/** Decimal places kept for every number: 1/10,000 ft is well under a millimetre */
const PRECISION = 4;

const Id = z.string();
const Num = z.number();

/** A straight box along a centreline, `thickness` wide, from `bottom` to `top` */
const piece = { from: Point, to: Point, thickness: Num, bottom: Num, top: Num };
/** An axis-aligned box: (x, y) is its front-left corner */
const box = { x: Num, y: Num, w: Num, d: Num, bottom: Num, top: Num };

const PolygonWithHoles = z.strictObject({ outer: Polygon, holes: z.array(Polygon) });

const ExportLevel = z.strictObject({
  id: Id,
  name: z.string(),
  kind: z.enum(["floor", "roof"]),
  /** Finished floor level: the top of this level's slab */
  elevation: Num,
  /** Floor-to-floor height */
  height: Num,
  slab: z.strictObject({
    top: Num,
    bottom: Num,
    material: Material,
    /** The slab with every void cut out, ready to extrude from bottom to top */
    polygons: z.array(PolygonWithHoles),
    voids: z.array(z.strictObject({ id: Id, kind: z.enum(["stair", "shaft", "double-height", "open"]), outline: Polygon })),
    /** Parts not carried by the level below, e.g. for soffit finishes */
    cantilevers: z.array(z.strictObject({ id: Id, outline: Polygon })),
  }),
  /** Wall boxes: solid runs, and the sill and lintel above and below each opening */
  walls: z.array(
    z.strictObject({
      wall: Id,
      kind: z.enum(["exterior", "interior"]),
      part: z.enum(["solid", "sill", "lintel"]),
      /** The opening a sill or lintel belongs to */
      opening: Id.nullable(),
      ...piece,
      material: Material,
    }),
  ),
  /** The hole each opening leaves, for doors, frames and glass; `from` is nearer the wall's `a` end */
  openings: z.array(
    z.strictObject({
      id: Id,
      wall: Id,
      type: OpeningType,
      ...piece,
      /** Doors: which end carries the hinge, `start` being `from` */
      hinge: z.enum(["start", "end"]),
      /** Doors: the side the leaf swings into, looking from `from` to `to` */
      opensTo: z.enum(["left", "right"]),
      /** Null leaves the finish to the renderer's default for the opening type */
      material: Material.nullable(),
    }),
  ),
  rooms: z.array(
    z.strictObject({
      id: Id,
      name: z.string(),
      type: RoomType,
      /** On wall centrelines */
      outline: Polygon,
      /** Clear floor area in square feet */
      area: Num,
      attachedTo: Id.nullable(),
      floor: Material,
    }),
  ),
  fixtures: z.array(
    z.strictObject({ id: Id, type: FixtureType, x: Num, y: Num, w: Num, d: Num, bottom: Num, back: Side }),
  ),
  stairs: z.array(
    z.strictObject({
      id: Id,
      type: z.enum(["dog-leg", "straight", "l-shaped", "spiral"]),
      x: Num,
      y: Num,
      w: Num,
      d: Num,
      bottom: Num,
      to: Id,
      up: Side,
      risers: z.number().int(),
      riser: Num,
      tread: Num,
      /** Treads and any mid landing in climbing order, each a box from the stair's bottom */
      steps: z.array(z.strictObject(box)),
      /** Spiral only: wedge-shaped treads in climbing order, each from the stair's bottom */
      treadPolygons: z.array(z.strictObject({ outline: Polygon, bottom: Num, top: Num })).optional(),
    }),
  ),
  /** Columns from this floor to the underside of the slab above */
  columns: z.array(z.strictObject({ ref: z.string(), ...box })),
  parapets: z.array(z.strictObject({ parapet: Id, ...piece, material: Material })),
  tanks: z.array(z.strictObject({ id: Id, ...box, material: Material })),
});

const Area = z.strictObject({ id: Id, outline: Polygon, material: Material });

export const ExportDesign = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  slug: z.string(),
  name: z.string(),
  kind: z.string(),
  plot: z.strictObject({
    width: Num,
    depth: Num,
    /** Direction of north, in degrees clockwise from +y */
    north: Num,
    /** Corners of a plot that is not a rectangle: front, corner, right, rear, left edges in order */
    outline: Polygon.optional(),
  }),
  grid: z.strictObject({
    x: z.array(z.strictObject({ ref: z.string(), at: Num })),
    y: z.array(z.strictObject({ ref: z.string(), at: Num })),
  }),
  levels: z.array(ExportLevel),
  site: z.strictObject({
    boundary: z.strictObject({
      material: Material,
      walls: z.array(z.strictObject({ side: PlotEdge, ...piece })),
      gates: z.array(z.strictObject({ id: Id, side: Side, kind: z.enum(["vehicle", "pedestrian"]), ...piece, material: Material, open: z.boolean().optional(), posts: z.boolean().optional() })),
    }),
    porches: z.array(Area),
    driveways: z.array(Area),
    lawns: z.array(z.strictObject({ id: Id, outline: Polygon })),
    paving: z.array(Area),
    planting: z.array(
      z.strictObject({
        id: Id,
        kind: z.enum(["tree", "palm", "shrub", "hedge", "pot"]),
        at: Point,
        size: Num,
        /** Pots: the height of the floor they stand on */
        bottom: Num.optional(),
      }),
    ),
  }),
  facade: z.array(
    z.discriminatedUnion("type", [
      z.strictObject({ type: z.literal("box"), id: Id, role: z.string(), ...box, material: Material }),
      z.strictObject({ type: z.literal("railing"), id: Id, role: z.string(), pieces: z.array(z.strictObject(piece)), material: Material }),
      z.strictObject({ type: z.literal("panel"), id: Id, role: z.string(), pieces: z.array(z.strictObject(piece)), material: Material }),
    ]),
  ),
  facts: z.strictObject({
    plot: z.strictObject({ width: Num, depth: Num, minWidth: Num.optional(), area: Num, size: z.string() }),
    storeys: z.number().int(),
    levels: z.array(z.strictObject({ id: Id, name: z.string(), coveredArea: Num })),
    coveredArea: Num,
    bedrooms: z.number().int(),
    bedroomsWithAttachedBath: z.number().int(),
    bathrooms: z.number().int(),
    shops: z.number().int(),
    officeArea: Num,
    roomCounts: z.partialRecord(RoomType, z.number().int()),
    doubleHeightRooms: z.array(z.string()),
    porches: z.array(z.strictObject({ id: Id, cars: z.number().int(), covered: z.boolean() })),
    lawnArea: Num,
    roof: z.strictObject({ parapet: z.boolean(), stairRoom: z.boolean(), tanks: z.number().int(), machineRoom: z.boolean() }),
    levelsWithWashrooms: z.number().int(),
    levelsWithLift: z.number().int(),
  }),
});

export type ExportDesign = z.infer<typeof ExportDesign>;

/** Groups a region's rings into outer rings with the holes inside each */
function withHoles(rings: Poly[]): { outer: Poly; holes: Poly[] }[] {
  const outers = rings.filter((r) => signedArea(r) > 0).map((outer) => ({ outer, holes: [] as Poly[] }));
  for (const hole of rings.filter((r) => signedArea(r) < 0)) {
    const host = outers.find((o) => pointInRegion(hole[0], [o.outer]));
    if (!host) throw new Error("Slab hole outside every slab part");
    host.holes.push(hole);
  }
  return outers;
}

const gridRefs = (lines: number[], ref: (i: number) => string) => lines.map((at, i) => ({ ref: ref(i), at }));

export function buildExport(design: Design, facts: DesignFacts): ExportDesign {
  const levels = design.levels.map((level, li) => {
    const base = level.elevation;
    const frames = wallFrames(level);
    const frame = (id: string) => frames.get(id)!;

    return {
      id: level.id,
      name: level.name,
      kind: level.kind,
      elevation: base,
      height: level.height,
      slab: {
        top: base,
        bottom: base - level.slab.thickness,
        material: level.slab.material,
        polygons: withHoles(slabRegion(level.slab)),
        voids: level.slab.voids.map((v) => ({ id: v.id, kind: v.kind, outline: v.outline })),
        cantilevers: level.slab.cantilevers.map((c) => ({ id: c.id, outline: c.outline })),
      },
      walls: level.walls.flatMap((wall) =>
        splitWall(
          frame(wall.id),
          level.openings.filter((o) => o.wall === wall.id),
          base,
          wallHeight(wall, design, li),
        ).map((p) => ({
          wall: p.wall,
          kind: wall.kind,
          part: p.part,
          opening: p.opening ?? null,
          from: p.from,
          to: p.to,
          thickness: p.thickness,
          bottom: p.bottom,
          top: p.top,
          material: p.material,
        })),
      ),
      openings: level.openings.map((o) => {
        const f = frame(o.wall);
        return {
          id: o.id,
          wall: o.wall,
          type: o.type,
          from: alongWall(f, o.offset),
          to: alongWall(f, o.offset + o.width),
          thickness: f.wall.thickness,
          bottom: base + o.sill,
          top: base + o.sill + o.height,
          hinge: o.hinge,
          opensTo: o.opensTo,
          material: o.material ?? null,
        };
      }),
      rooms: levelRooms(level).map(({ room, area }) => ({
        id: room.id,
        name: room.name,
        type: room.type,
        outline: room.outline,
        area,
        attachedTo: room.attachedTo ?? null,
        floor: room.floor,
      })),
      fixtures: level.fixtures.map((f) => ({ id: f.id, type: f.type, x: f.x, y: f.y, w: f.w, d: f.d, bottom: base, back: f.back })),
      stairs: level.stairs.map((st) => {
        const to = design.levels.find((l) => l.id === st.to)!;
        const layout = stairLayout(st, to.elevation - base);
        return {
          id: st.id,
          type: st.type,
          x: st.x,
          y: st.y,
          w: st.w,
          d: st.d,
          bottom: base,
          to: st.to,
          up: st.up,
          risers: layout.risers,
          riser: layout.riser,
          tread: layout.tread,
          steps: layout.steps.map(({ rect: [x, y, w, d], top }) => ({ x, y, w, d, bottom: base, top: base + top })),
          ...(layout.wedges ? { treadPolygons: layout.wedges.map((w) => ({ outline: w.outline, bottom: base, top: base + w.top })) } : {}),
        };
      }),
      columns: levelColumns(design, li).map((c) => ({
        ref: c.ref,
        // Columns are centred on grid intersections; the export gives the front-left corner like every box
        x: c.x - c.w / 2,
        y: c.y - c.d / 2,
        w: c.w,
        d: c.d,
        bottom: base,
        top: base + clearHeight(design, li),
      })),
      parapets: level.parapets.flatMap((p) =>
        pathPieces(p.path, p.closed, p.thickness).map((pc) => ({
          parapet: p.id,
          ...pc,
          bottom: base,
          top: base + p.height,
          material: p.material,
        })),
      ),
      tanks: level.tanks.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        d: t.d,
        bottom: base,
        top: base + t.height,
        material: t.material,
      })),
    };
  });

  const elevation = (id: string) => design.levels.find((l) => l.id === id)!.elevation;
  const { boundary } = design.site;
  const area = (a: { id: string; outline: Poly; material: z.infer<typeof Material> }) => ({
    id: a.id,
    outline: a.outline,
    material: a.material,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    slug: design.slug,
    name: design.name,
    kind: design.kind,
    plot: {
      width: design.plot.width,
      depth: design.plot.depth,
      north: design.plot.north,
      ...(design.plot.outline ? { outline: design.plot.outline } : {}),
    },
    grid: {
      x: gridRefs(design.grid.x, (i) => String.fromCharCode(65 + i)),
      y: gridRefs(design.grid.y, (i) => String(i + 1)),
    },
    levels,
    site: {
      boundary: {
        material: boundary.material,
        walls: boundaryPieces(design).map((p) => ({ side: p.side, from: p.from, to: p.to, thickness: p.thickness, bottom: 0, top: boundary.height })),
        gates: boundary.gates.map((g) => ({
          id: g.id,
          side: g.side,
          kind: g.kind,
          from: boundaryPoint(design, g.side, g.offset),
          to: boundaryPoint(design, g.side, g.offset + g.width),
          thickness: boundary.thickness,
          bottom: 0,
          top: g.height ?? boundary.height,
          material: g.material,
          ...(g.open ? { open: true } : {}),
          ...(g.posts ? {} : { posts: false }),
        })),
      },
      porches: design.site.porches.map(area),
      driveways: design.site.driveways.map(area),
      lawns: design.site.lawns.map((l) => ({ id: l.id, outline: l.outline })),
      paving: design.site.paving.map(area),
      planting: design.site.planting.map((p) => ({
        id: p.id,
        kind: p.kind,
        at: p.at,
        size: p.size,
        ...(p.level ? { bottom: elevation(p.level) } : {}),
      })),
    },
    facade: design.facade.map((el) => {
      const bottom = elevation(el.level) + el.z;
      return el.type === "box"
        ? { type: "box" as const, id: el.id, role: el.role, x: el.x, y: el.y, w: el.w, d: el.d, bottom, top: bottom + el.h, material: el.material }
        : {
            type: el.type,
            id: el.id,
            role: el.role,
            pieces: pathPieces(el.path, false, el.thickness).map((pc) => ({ ...pc, bottom, top: bottom + el.h })),
            material: el.material,
          };
    }),
    facts,
  };
}

/** Rounds to the export precision; -0 becomes 0 so output never depends on float signs */
const fixed = (v: number) => {
  const r = Number(v.toFixed(PRECISION));
  return Object.is(r, -0) ? 0 : r;
};

/**
 * The file contents: checked against the schema, keys in schema order, numbers
 * at fixed precision, two-space indent and a final newline. The same design
 * always gives the same bytes.
 */
export function serializeExport(data: ExportDesign): string {
  const checked = ExportDesign.parse(data);
  return `${JSON.stringify(checked, (_key, v) => (typeof v === "number" ? fixed(v) : v), 2)}\n`;
}

/** The JSON Schema the render pipeline checks files against */
export function exportJsonSchema(): string {
  const schema = z.toJSONSchema(ExportDesign, { io: "output" });
  return `${JSON.stringify({ ...schema, title: "Noor Developers design export", $comment: `schemaVersion ${SCHEMA_VERSION}` }, null, 2)}\n`;
}
