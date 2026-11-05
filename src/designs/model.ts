/**
 * The building design data model. Every concept design is one file typed by
 * this schema; floor plans, render export and displayed facts derive from it.
 *
 * Units are feet. The origin is the plot's front-left corner as seen from the
 * street, x runs along the street frontage and y runs into the plot.
 */
import { z } from "zod";

/** Shared with the renderer: the model names materials, the renderer owns their look */
export const MATERIALS = [
  "plaster-white",
  "plaster-warm-grey",
  "stone-cladding",
  "wood-panel",
  "exposed-concrete",
  "metal-dark",
  "glass-clear",
  "glass-tinted",
  "porcelain-paving",
  "brick-structure",
  "brick-cladding",
  "plaster-charcoal",
  "paving-stone",
  "grass",
  "planter-soil",
] as const;
export const Material = z.enum(MATERIALS);

export const ROOM_TYPES = [
  "master-bedroom",
  "bedroom",
  "bathroom",
  "powder-room",
  "dressing",
  "drawing",
  "dining",
  "lounge",
  "tv-lounge",
  "family-lounge",
  "kitchen",
  "back-kitchen",
  "foyer",
  "corridor",
  "stair-hall",
  "store",
  "laundry",
  "servant-room",
  "guard-room",
  "terrace",
  "stair-room",
  "shop",
  "office",
  "lobby",
  "washroom",
  "lift",
  "shaft",
  "machine-room",
  "other",
] as const;
export const RoomType = z.enum(ROOM_TYPES);

export const FIXTURE_TYPES = [
  "counter",
  "sink",
  "hob",
  "wc",
  "basin",
  "vanity",
  "shower",
  "bathtub",
  "urinal",
  "wardrobe",
] as const;
export const FixtureType = z.enum(FIXTURE_TYPES);

export const OPENING_TYPES = ["door", "double-door", "sliding-door", "window", "opening"] as const;
export const OpeningType = z.enum(OPENING_TYPES);

/** Plot-relative sides: front faces the street (y = 0), rear is y = depth */
export const Side = z.enum(["front", "rear", "left", "right"]);

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase letters, digits and dashes");
const Length = z.number().positive();

export const Point = z.tuple([z.number(), z.number()]);
/** A closed polygon: the last point joins back to the first */
export const Polygon = z.array(Point);

/** An axis-aligned rectangle: (x, y) is its front-left corner */
const rect = { x: z.number(), y: z.number(), w: Length, d: Length };

export const Wall = z.object({
  id: Id,
  /** Centreline endpoints */
  a: Point,
  b: Point,
  thickness: Length,
  kind: z.enum(["exterior", "interior"]),
  /** Defaults to the clear height up to the slab above */
  height: Length.optional(),
  material: Material.default("plaster-white"),
});

export const Opening = z.object({
  id: Id,
  /** Host wall id on the same level */
  wall: Id,
  type: OpeningType,
  /** Distance along the host wall's centreline from its `a` end to the opening's near edge */
  offset: z.number(),
  width: Length,
  height: Length,
  sill: z.number().min(0).default(0),
  /** Doors: which edge carries the hinge (`start` is the edge nearer `a`) */
  hinge: z.enum(["start", "end"]).default("start"),
  /** Doors: the side of the wall the leaf swings into, looking from `a` to `b` */
  opensTo: z.enum(["left", "right"]).default("left"),
  material: Material.optional(),
});

export const Room = z.object({
  id: Id,
  name: z.string().min(1),
  type: RoomType,
  /** Drawn on wall centrelines; the clear outline is this minus the walls */
  outline: Polygon,
  /** For bathrooms and dressings: the room they belong to */
  attachedTo: Id.optional(),
  floor: Material.default("porcelain-paving"),
});

export const Fixture = z.object({
  id: Id,
  type: FixtureType,
  ...rect,
  /** The side its back is against */
  back: Side,
});

export const Stair = z.object({
  id: Id,
  type: z.enum(["dog-leg", "straight"]),
  ...rect,
  /** The level it climbs to */
  to: Id,
  /** Direction of travel of the first flight */
  up: Side,
  /** Dog-leg only: the half of the stair the first flight takes, looking along `up` */
  firstFlight: z.enum(["left", "right"]).default("right"),
});

export const Void = z.object({
  id: Id,
  /** `double-height` and `open` voids are not covered area; stair and shaft voids are */
  kind: z.enum(["stair", "shaft", "double-height", "open"]),
  outline: Polygon,
});

export const Slab = z.object({
  outline: Polygon,
  /** Separate pieces of the same slab, such as a gatehouse floor or roof */
  islands: z.array(Polygon).default([]),
  thickness: Length.default(0.5),
  voids: z.array(Void).default([]),
  /** Regions of this slab not carried by the level below; walls may stand on them */
  cantilevers: z.array(z.object({ id: Id, outline: Polygon })).default([]),
  material: Material.default("exposed-concrete"),
});

export const Parapet = z.object({
  id: Id,
  path: z.array(Point).min(2),
  closed: z.boolean().default(true),
  height: Length.default(3.5),
  thickness: Length.default(0.75),
  material: Material.default("plaster-white"),
});

export const Tank = z.object({
  id: Id,
  ...rect,
  height: Length,
  material: Material.default("plaster-warm-grey"),
});

export const Level = z.object({
  id: Id,
  name: z.string().min(1),
  /** `floor` levels count as storeys */
  kind: z.enum(["floor", "roof"]),
  /** Finished floor level above the road, equal to the level below's elevation plus its height */
  elevation: z.number(),
  /** Floor-to-floor height */
  height: Length,
  /** The slab this level stands on */
  slab: Slab,
  walls: z.array(Wall).default([]),
  openings: z.array(Opening).default([]),
  rooms: z.array(Room).default([]),
  fixtures: z.array(Fixture).default([]),
  stairs: z.array(Stair).default([]),
  parapets: z.array(Parapet).default([]),
  tanks: z.array(Tank).default([]),
});

export const Gate = z.object({
  id: Id,
  side: Side,
  /** Along the side from its x = 0 (front, rear) or y = 0 (left, right) end to the gate's near edge */
  offset: z.number(),
  width: Length,
  kind: z.enum(["vehicle", "pedestrian"]),
  material: Material.default("metal-dark"),
});

const Area = z.object({ id: Id, outline: Polygon });

export const Site = z.object({
  boundary: z.object({
    /** Plot sides with a boundary wall; a building may stand on the plot line instead */
    sides: z.array(Side).default(["front", "rear", "left", "right"]),
    thickness: Length.default(0.75),
    height: Length.default(7),
    material: Material.default("plaster-warm-grey"),
    gates: z.array(Gate).default([]),
  }),
  /** Car porches; car capacity is computed from their size */
  porches: z.array(Area.extend({ material: Material.default("porcelain-paving") })).default([]),
  driveways: z.array(Area.extend({ material: Material.default("paving-stone") })).default([]),
  lawns: z.array(Area).default([]),
  paving: z.array(Area.extend({ material: Material.default("paving-stone") })).default([]),
  planting: z
    .array(
      z.object({
        id: Id,
        kind: z.enum(["tree", "palm", "shrub", "hedge"]),
        at: Point,
        /** Canopy or clump diameter */
        size: Length,
      }),
    )
    .default([]),
});

const FacadeBase = {
  id: Id,
  /** The level whose elevation `z` is measured from */
  level: Id,
  /** Free-form role such as fin, cladding, soffit, canopy or frame */
  role: z.string().min(1),
  /** Bottom, relative to the level's elevation */
  z: z.number(),
  h: Length,
  material: Material,
};

export const FacadeElement = z.discriminatedUnion("type", [
  z.object({ type: z.literal("box"), ...FacadeBase, ...rect }),
  z.object({ type: z.literal("railing"), ...FacadeBase, path: z.array(Point).min(2), thickness: Length.default(0.15) }),
]);

export const Design = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  /** Open vocabulary (house, apartments, ...) so new building types are content */
  kind: z.string().regex(/^[a-z][a-z-]*$/),
  plot: z.object({
    width: Length,
    depth: Length,
    /** Direction of north, in degrees clockwise from +y (into the plot) */
    north: z.number().default(0),
  }),
  grid: z.object({
    /** Grid lines along x are lettered A, B, C ... */
    x: z.array(z.number()).min(2),
    /** Grid lines along y are numbered 1, 2, 3 ... */
    y: z.array(z.number()).min(2),
    /** Column size along x and y */
    column: z.tuple([Length, Length]).default([1, 1.5]),
    /** Intersections without a column, e.g. "C3" */
    omit: z.array(z.string().regex(/^[A-Z]\d+$/)).default([]),
  }),
  levels: z.array(Level).min(1),
  site: Site,
  facade: z.array(FacadeElement).default([]),
});

export type MaterialTag = z.infer<typeof Material>;
export type RoomTypeName = z.infer<typeof RoomType>;
export type FixtureTypeName = z.infer<typeof FixtureType>;
export type OpeningTypeName = z.infer<typeof OpeningType>;
export type SideName = z.infer<typeof Side>;
export type Pt = z.infer<typeof Point>;
export type Poly = Pt[];
export type Wall = z.output<typeof Wall>;
export type Opening = z.output<typeof Opening>;
export type Room = z.output<typeof Room>;
export type Fixture = z.output<typeof Fixture>;
export type Stair = z.output<typeof Stair>;
export type Slab = z.output<typeof Slab>;
export type Level = z.output<typeof Level>;
export type Site = z.output<typeof Site>;
export type FacadeElement = z.output<typeof FacadeElement>;
export type Design = z.output<typeof Design>;
/** What design files are written as: fields with defaults may be left out */
export type DesignInput = z.input<typeof Design>;
export type LevelInput = z.input<typeof Level>;
