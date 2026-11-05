/**
 * 5 Marla house: 25' × 45' plot, double storey, standing on the plot line on
 * both sides. Daylight can only come from the front, the rear and from inside,
 * so the rooms are arranged around those: the car porch and drawing room at the
 * front, the bedroom and kitchen at the rear, and a sky court on the first floor
 * that lights the family lounge in the middle of the house.
 *
 * Ground: 1-car porch, drawing room, TV lounge with the dog-leg stair, kitchen,
 * bedroom with bath. First: master bedroom with bath and a balcony over the
 * porch, family lounge, sky court, second bedroom with bath, laundry.
 * Roof: stair room, water tanks, parapet.
 *
 * Facade: a terracotta brick bay beside a white plaster frame that holds a metal
 * jaali across the balcony, over a timber porch ceiling and a timber gate.
 */
import { chain, defineDesign, door, ext, fixture, gap, INT, int, makeGrid, outset, PLINTH, rect, repeat, room, SLAB, stack, STOREY, wall, win } from "./helpers.ts";
import type { WallInput } from "./helpers.ts";
import type { Poly } from "./model.ts";

/** Party walls stand just inside the plot, so their outer faces are on the plot line */
const LEFT = 0.375;
const RIGHT = 24.625;
const REAR = 41;
/** Front of the block that holds the drawing room and the master bath */
const FRONT = 3.25;
/** Face of the porch against the house */
const PORCH_BACK = 19.125;
/** The wall between the car porch and the drawing room */
const PORCH_SIDE = 10.5;
/** Splits the plan behind the porch into a lounge and kitchen side and a bedroom side */
const SPINE = 13;
/** Back of the drawing room and of the master suite */
const MID = 15.875;
/** Back of the stair, and the front of the sky court */
const STAIR_BACK = 23;
/** Back of the ground-floor bath and of the sky court */
const COURT_BACK = 28.375;

const G = makeGrid([LEFT, SPINE, RIGHT], [FRONT, PORCH_BACK, 32.25, REAR]);

/** Ventilator: a small high window for bathrooms */
const vent = (id: string, host: string, offset: number) => win(id, host, offset, 2, { sill: 6, height: 2 });
/** Tall front glazing, head in line with the doors */
const tall = { sill: 1, height: 7 };

/** Brick on the bay that faces the street; every other wall stays plaster */
const brickFront = (name: string) => (w: WallInput): WallInput => (w.id === name ? { ...w, material: "brick-cladding" } : w);

const stair = { type: "dog-leg", x: 13.25, y: 16.0625, w: 11, d: 6.75, up: "right", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);
const mumty = rect([12.875, 15.6875], [RIGHT, 23.1875]);
const court = rect([SPINE, STAIR_BACK], [RIGHT, COURT_BACK]);
// Starts behind the stair room's back wall, which stands on the slab's edge
const courtOpening = rect([13.1875, 23.5625], [24.25, 28.1875]);

/** The first floor and roof reach forward over the porch to frame the balcony */
const upperOutline: Poly = [[0, 0.75], [10.875, 0.75], [10.875, 2.875], [25, 2.875], [25, 41.375], [0, 41.375]];

export default defineDesign({
  slug: "5-marla",
  name: "5 Marla House",
  kind: "house",
  plot: { width: 25, depth: 45 },
  grid: { x: G.x, y: G.y, column: [0.75, 1.25], omit: ["B2"] },
  levels: stack(PLINTH, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: [[10.125, 2.875], [25, 2.875], [25, 41.375], [0, 41.375], [0, 18.75], [10.125, 18.75]],
        // Strips along the plot line that carry the porch side wall and the low yard walls
        islands: [
          rect([0, 0.75], [0.75, 18.75]),
          rect([24.25, 0.75], [25, 2.875]),
          rect([0, 41.375], [0.75, 44.25]),
          rect([24.25, 41.375], [25, 44.25]),
        ],
      },
      walls: [
        ...chain("out", [[LEFT, PORCH_BACK], [PORCH_SIDE, PORCH_BACK], [PORCH_SIDE, FRONT], [RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior" }).map(brickFront("out-3")),
        // Carries the first floor over the porch
        ext("porch-side", [LEFT, 0.75], [LEFT, PORCH_BACK]),
        ext("front-cheek", [RIGHT, 0.75], [RIGHT, 2.875], { height: 3 }),
        ext("yard-left", [LEFT, 41.375], [LEFT, 44.25], { height: 3 }),
        ext("yard-right", [RIGHT, 41.375], [RIGHT, 44.25], { height: 3 }),
        int("drawing-back", [PORCH_SIDE, MID], [RIGHT, MID]),
        int("stair-back", [SPINE, STAIR_BACK], [RIGHT, STAIR_BACK]),
        int("spine", [SPINE, STAIR_BACK], [SPINE, REAR]),
        int("bath-back", [SPINE, COURT_BACK], [RIGHT, COURT_BACK]),
        int("kitchen-front", [LEFT, 32.25], [SPINE, 32.25]),
      ],
      openings: [
        // Facing the porch (out-1 runs left to right along y = 19.125)
        win("lounge-porch", "out-1", 1, 4.5, tall),
        door("main-door", "out-1", 6, { width: 3.5, hinge: "end" }),
        // Front (out-3, s = x - 10.5)
        win("drawing-front", "out-3", 3, 8, tall),
        // Rear (out-5, s = 24.625 - x)
        win("bed1-rear", "out-5", 3, 6),
        win("kitchen-rear", "out-5", 15, 5, { sill: 3.5, height: 4.5 }),
        door("back-door", "out-5", 20.5, { opensTo: "right" }),
        // Inside
        door("drawing-door", "drawing-back", 0.5, { width: 2.5, opensTo: "right" }),
        door("bath1-door", "bath-back", 3, { width: 2.5, opensTo: "left" }),
        door("bed1-door", "spine", 6, { opensTo: "left", hinge: "end" }),
        gap("kitchen-arch", "kitchen-front", 5, 6),
      ],
      rooms: [
        room("drawing", "Drawing room", "drawing", rect([PORCH_SIDE, FRONT], [RIGHT, MID])),
        room("lounge", "TV lounge", "tv-lounge", [[LEFT, PORCH_BACK], [PORCH_SIDE, PORCH_BACK], [PORCH_SIDE, MID], [RIGHT, MID], [RIGHT, STAIR_BACK], [SPINE, STAIR_BACK], [SPINE, 32.25], [LEFT, 32.25]]),
        room("kitchen", "Kitchen", "kitchen", rect([LEFT, 32.25], [SPINE, REAR])),
        room("bath1", "Bath 1", "bathroom", rect([SPINE, STAIR_BACK], [RIGHT, COURT_BACK]), { attachedTo: "bed1" }),
        room("bed1", "Bedroom 1", "bedroom", rect([SPINE, COURT_BACK], [RIGHT, REAR])),
      ],
      fixtures: [
        fixture("k-counter", "counter", [0.75, 33], [2, 7.625], "left"),
        fixture("k-counter-rear", "counter", [2.75, 38.625], [1.5, 2], "rear"),
        fixture("k-sink", "sink", [0.75, 37], [2, 3], "left"),
        fixture("k-hob", "hob", [0.75, 34], [2, 2.5], "left"),
        fixture("b1-wc", "wc", [22, 23.25], [2.25, 1.5], "front"),
        fixture("b1-basin", "basin", [13.25, 23.25], [1.75, 1.5], "front"),
        fixture("b1-shower", "shower", [13.25, 25.1], [3, 3], "rear"),
        fixture("b1-wardrobe", "wardrobe", [13.25, 33], [2, 7.5], "left"),
      ],
      stairs: [{ id: "stair", ...stair, to: "first" }],
    },
    {
      id: "first",
      name: "First floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: upperOutline,
        voids: [{ id: "stairwell", kind: "stair", outline: stairwell }],
        cantilevers: [
          { id: "balcony", outline: rect([0.75, 0.75], [10.875, 2.875]) },
          { id: "over-porch", outline: rect([0.75, 2.875], [10.125, 18.75]) },
        ],
      },
      walls: [
        ...chain("f", [[LEFT, 7], [PORCH_SIDE, 7], [PORCH_SIDE, FRONT], [RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior" }).map(brickFront("f-3")),
        // The cheeks either side of the balcony
        ext("balcony-left", [LEFT, 0.75], [LEFT, 7]),
        ext("balcony-right", [PORCH_SIDE, 0.75], [PORCH_SIDE, FRONT]),
        int("master-back", [LEFT, MID], [RIGHT, MID]),
        int("master-side", [18.125, FRONT], [18.125, MID]),
        wall("court-front", [SPINE, STAIR_BACK], [RIGHT, STAIR_BACK], { kind: "exterior", thickness: INT }),
        wall("court-left", [SPINE, STAIR_BACK], [SPINE, COURT_BACK], { kind: "exterior", thickness: INT }),
        wall("court-back", [SPINE, COURT_BACK], [RIGHT, COURT_BACK], { kind: "exterior", thickness: INT }),
        int("spine", [SPINE, COURT_BACK], [SPINE, REAR]),
        int("lounge-back", [LEFT, 32.25], [SPINE, 32.25]),
        int("bath2-side", [7, 32.25], [7, REAR]),
      ],
      openings: [
        door("balcony-door", "f-1", 1.5, { type: "sliding-door", width: 7 }),
        win("master-front", "f-3", 3, 4, tall),
        vent("master-bath-vent", "f-3", 10),
        win("bed2-rear", "f-5", 3, 6),
        vent("bath2-vent", "f-5", 13),
        win("laundry-rear", "f-5", 19, 3),
        door("master-door", "master-back", 8, { opensTo: "left" }),
        door("master-bath-door", "master-side", 8.5, { width: 2.5, opensTo: "left" }),
        door("court-door", "court-left", 0.75, { type: "sliding-door", width: 3.75 }),
        win("bed2-court", "court-back", 2, 6),
        door("bed2-door", "spine", 0.5, { opensTo: "left", hinge: "end" }),
        door("bath2-door", "spine", 8.875, { width: 2.5, opensTo: "right" }),
        door("laundry-door", "lounge-back", 2, { width: 2.5, opensTo: "right" }),
      ],
      rooms: [
        room("balcony", "Balcony", "terrace", rect([LEFT, 0.75], [PORCH_SIDE, 7]), { floor: "paving-stone" }),
        room("master", "Master bedroom", "master-bedroom", [[LEFT, 7], [PORCH_SIDE, 7], [PORCH_SIDE, FRONT], [18.125, FRONT], [18.125, MID], [LEFT, MID]]),
        room("master-bath", "Master bath", "bathroom", rect([18.125, FRONT], [RIGHT, MID]), { attachedTo: "master" }),
        room("family", "Family lounge", "family-lounge", [[LEFT, MID], [RIGHT, MID], [RIGHT, STAIR_BACK], [SPINE, STAIR_BACK], [SPINE, 32.25], [LEFT, 32.25]]),
        room("court", "Sky court", "terrace", court, { floor: "paving-stone" }),
        room("bed2", "Bedroom 2", "bedroom", rect([SPINE, COURT_BACK], [RIGHT, REAR])),
        room("bath2", "Bath 2", "bathroom", rect([7, 32.25], [SPINE, REAR]), { attachedTo: "bed2" }),
        room("laundry", "Laundry", "laundry", rect([LEFT, 32.25], [7, REAR])),
      ],
      fixtures: [
        fixture("m-wardrobe", "wardrobe", [0.75, 13.5], [8, 2], "rear"),
        fixture("mb-wc", "wc", [22, 3.75], [2.25, 1.5], "front"),
        fixture("mb-basin", "basin", [18.375, 3.75], [1.75, 1.5], "front"),
        fixture("mb-shower", "shower", [21.1, 12.5], [3, 3], "rear"),
        fixture("b2-wardrobe", "wardrobe", [22.2, 29], [2, 7], "right"),
        fixture("b2b-wc", "wc", [7.25, 39], [2.25, 1.5], "rear"),
        fixture("b2b-basin", "basin", [7.25, 32.5], [1.75, 1.5], "front"),
        fixture("b2b-shower", "shower", [9.75, 32.5], [3, 2.5], "front"),
        fixture("laundry-counter", "counter", [0.75, 38.5], [6, 2], "rear"),
      ],
      stairs: [{ id: "stair", ...stair, to: "roof" }],
    },
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 9,
      slab: {
        outline: upperOutline,
        voids: [
          { id: "stairwell", kind: "stair", outline: stairwell },
          { id: "sky-court", kind: "open", outline: courtOpening },
        ],
      },
      walls: chain("mumty", mumty, { closed: true, kind: "exterior", material: "plaster-warm-grey" }),
      openings: [door("roof-door", "mumty-4", 2, { opensTo: "right" })],
      rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
      parapets: [
        { id: "parapet", path: [[RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR], [LEFT, 1.125], [PORCH_SIDE, 1.125], [PORCH_SIDE, FRONT]], closed: false, material: "plaster-white" },
        { id: "parapet-front", path: [[PORCH_SIDE, FRONT], [RIGHT, FRONT]], closed: false, material: "brick-cladding" },
        { id: "court-parapet", path: court, thickness: INT },
      ],
      tanks: [
        { id: "tank-1", x: 2, y: 34, w: 4, d: 4, height: 4 },
        { id: "tank-2", x: 7, y: 34, w: 4, d: 4, height: 4 },
      ],
    },
    {
      id: "top",
      name: "Stair room roof",
      kind: "roof",
      height: 1,
      slab: { outline: outset(mumty, 0.375), thickness: SLAB },
    },
  ]),
  site: {
    boundary: {
      // The house stands on the plot line on both sides
      sides: ["front", "rear"],
      height: 5,
      material: "plaster-white",
      gates: [{ id: "car-gate", side: "front", offset: 0.75, width: 9.375, kind: "vehicle", material: "wood-panel" }],
    },
    porches: [{ id: "porch", outline: rect([0.75, 0.75], [10.125, 18.75]) }],
    paving: [
      { id: "front-strip", outline: rect([10.125, 0.75], [24.25, 2.875]) },
      { id: "rear-yard", outline: rect([0.75, 41.375], [24.25, 44.25]) },
    ],
    planting: [
      { id: "shrub-1", kind: "shrub", at: [13, 1.8], size: 1.8 },
      { id: "shrub-2", kind: "shrub", at: [17, 1.8], size: 1.8 },
      { id: "shrub-3", kind: "shrub", at: [21, 1.8], size: 1.8 },
    ],
  },
  facade: [
    // Timber ceiling over the car porch
    { id: "porch-soffit", type: "box", level: "ground", role: "soffit", x: 0.75, y: 0.75, w: 9.375, d: 18, z: 10.4, h: 0.1, material: "wood-panel" },
    // Carries the corner of the balcony's frame, which reaches forward past the drawing room
    { id: "porch-pier", type: "box", level: "ground", role: "cladding", x: 10.125, y: 0.75, w: 0.75, d: 0.75, z: 0, h: 10.5, material: "plaster-white" },
    // Metal jaali across the balcony opening: 3-inch bars on a grid of about a foot
    ...repeat("jaali-v", 10, [1.25, 1], [9.625, 1], { level: "first", role: "jaali", w: 0.25, d: 0.17, z: 0, h: 10.5, material: "metal-dark" }),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `jaali-h-${i + 1}`, type: "box" as const, level: "first", role: "jaali", x: 0.75, y: 0.915, w: 9.375, d: 0.17, z: 0.75 + i, h: 0.25, material: "metal-dark" as const,
    })),
  ],
});
