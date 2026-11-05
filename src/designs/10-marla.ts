/**
 * 10 Marla house: 35' × 65' plot, double storey, standing on the plot line on
 * its left side, with an open passage down the right behind the car porch.
 *
 * Ground: 2-car porch, drawing room, TV lounge opening onto dining, dog-leg
 * stair, kitchen and store, guest bath, bedroom with bath. First: master suite
 * with dressing in a box projecting over the porch, a terrace over the drawing
 * room, family lounge, two more bedrooms with baths, laundry.
 * Roof: stair room, water tanks, parapet.
 *
 * Facade: a charcoal plaster box over light plaster and exposed concrete, with a
 * concrete frame around its corner window, vertical timber slats on the stair
 * tower and a steel pergola over the terrace.
 */
import type { WallInput } from "./helpers.ts";
import { chain, defineDesign, door, ext, fixture, gap, int, makeGrid, outset, PLINTH, rect, repeat, room, SLAB, stack, STOREY, win } from "./helpers.ts";

/** The party wall's outer face is on the plot line */
const LEFT = 0.375;
/** The house's right wall behind the porch; the side passage is beyond it */
const RIGHT = 30.375;
const REAR = 60;
/** Front of the drawing room */
const FRONT = 5;
/** The wall between the drawing room and the porch, continuing back through the house */
const SPINE = 15.75;
/** Face of the house against the porch, and the back of the master bedroom */
const PORCH_BACK = 19.125;
/** Back of the lounge on its right side */
const LOUNGE_BACK = 36;
/** Back of the bath and lounge, and the front of the bedrooms on both floors */
const BED_FRONT = 46;
/** Front of the kitchen */
const KITCHEN_FRONT = 49.25;
/** Front and side of the store, in the kitchen's far corner */
const STORE_FRONT = 53;
const STORE_SIDE = 10;
/** The upper floor's face behind the terrace, and the stair tower's front */
const TOWER_FRONT = 21.8125;
/** The stair tower's side */
const TOWER_SIDE = 8.625;
/** The master box's front and side */
const BOX_FRONT = 3.5;
const BOX_SIDE = 33;
/** Splits the first floor's right side from the family lounge */
const SERVICE = 21;
/** The side of the ground-floor bath, and of the lounge's dining nook */
const NOOK = 23;

const G = makeGrid([LEFT, SPINE, RIGHT], [FRONT, PORCH_BACK, LOUNGE_BACK, REAR]);

/** Ventilator: a small high window for bathrooms */
const vent = (id: string, host: string, offset: number) => win(id, host, offset, 2, { sill: 6, height: 2 });
/** Tall glazing, head in line with the doors */
const tall = { sill: 1, height: 7 };

const CONCRETE = "exposed-concrete";
const CHARCOAL = "plaster-charcoal";
const LIGHT = "plaster-warm-grey";
/** A level's walls in the light plaster, with the ones named in another material. Interior walls too: their ends show on the outside. */
const finish = (materials: Record<string, WallInput["material"]>) => (w: WallInput): WallInput => ({ ...w, material: materials[w.id] ?? LIGHT });

const stair = { type: "dog-leg", x: 0.75, y: 22.1875, w: 7.5, d: 14, up: "front", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);
const mumty = rect([LEFT, TOWER_FRONT], [TOWER_SIDE, 36.5625]);

export default defineDesign({
  slug: "10-marla",
  name: "10 Marla House",
  kind: "house",
  plot: { width: 35, depth: 65 },
  grid: { x: G.x, y: G.y, column: [0.75, 1.25], omit: ["C1", "B3"] },
  levels: stack(PLINTH, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: [[0, 4.625], [16.125, 4.625], [16.125, 18.75], [30.75, 18.75], [30.75, 60.375], [0, 60.375]],
        // Strips along the plot line that carry the low walls either side of the house
        islands: [rect([0, 0.75], [0.75, 4.625]), rect([0, 60.375], [0.75, 64.25])],
      },
      walls: [
        ...chain("out", [[LEFT, FRONT], [SPINE, FRONT], [SPINE, PORCH_BACK], [RIGHT, PORCH_BACK], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior" }),
        ext("front-cheek", [LEFT, 0.75], [LEFT, 4.625], { height: 3 }),
        ext("yard-left", [LEFT, 60.375], [LEFT, 64.25], { height: 3 }),
        int("drawing-back", [LEFT, 22], [SPINE, 22]),
        int("spine-front", [SPINE, PORCH_BACK], [SPINE, LOUNGE_BACK]),
        int("spine-middle", [SPINE, LOUNGE_BACK], [SPINE, BED_FRONT]),
        int("spine-rear", [SPINE, BED_FRONT], [SPINE, REAR]),
        int("stair-side", [8.4375, 22], [8.4375, 36.1875]),
        int("foyer-back", [8.4375, 28], [SPINE, 28]),
        int("powder-back", [8.4375, 36.1875], [SPINE, 36.1875]),
        int("lounge-back", [NOOK, LOUNGE_BACK], [RIGHT, LOUNGE_BACK]),
        int("bath-side", [NOOK, LOUNGE_BACK], [NOOK, BED_FRONT]),
        int("bed-front", [SPINE, BED_FRONT], [RIGHT, BED_FRONT]),
        int("kitchen-front", [LEFT, KITCHEN_FRONT], [SPINE, KITCHEN_FRONT]),
        int("store-front", [STORE_SIDE, STORE_FRONT], [SPINE, STORE_FRONT]),
        int("store-side", [STORE_SIDE, STORE_FRONT], [STORE_SIDE, REAR]),
      ].map(finish({ "out-1": CONCRETE, "out-2": CONCRETE })),
      openings: [
        // Front (out-1, s = x - 0.375)
        win("drawing-front", "out-1", 3, 9, tall),
        // Facing the porch (out-3, s = x - 15.75)
        door("main-door", "out-3", 3, { type: "double-door", width: 4.5, hinge: "start", opensTo: "left" }),
        win("lounge-porch", "out-3", 8.5, 4.5, tall),
        // Right side (out-4, s = y - 19.125)
        win("lounge-side", "out-4", 3, 8, tall),
        vent("bath1-vent", "out-4", 21),
        win("bed1-side", "out-4", 31, 6),
        // Rear (out-5, s = 30.375 - x)
        win("bed1-rear", "out-5", 4, 7),
        vent("store-vent", "out-5", 16.5),
        win("kitchen-rear", "out-5", 21, 4.5, { sill: 3.5, height: 4.5 }),
        door("back-door", "out-5", 26, { opensTo: "right" }),
        // Inside
        door("drawing-door", "drawing-back", 9, { opensTo: "right" }),
        gap("foyer-arch", "spine-front", 3.5, 4.5),
        door("powder-door", "foyer-back", 0.75, { type: "sliding-door", width: 2.5 }),
        gap("dining-arch", "spine-middle", 1.5, 7),
        door("bed1-door", "spine-rear", 0.2, { width: 2.75, opensTo: "left", hinge: "end" }),
        door("bath1-door", "bed-front", 8, { width: 2.5, opensTo: "left" }),
        door("kitchen-door", "kitchen-front", 7.2, { opensTo: "right" }),
        door("store-door", "store-front", 2, { width: 2.5, opensTo: "right" }),
      ],
      rooms: [
        room("drawing", "Drawing room", "drawing", rect([LEFT, FRONT], [SPINE, 22])),
        room("lounge", "TV lounge", "tv-lounge", [[SPINE, PORCH_BACK], [RIGHT, PORCH_BACK], [RIGHT, LOUNGE_BACK], [NOOK, LOUNGE_BACK], [NOOK, BED_FRONT], [SPINE, BED_FRONT]]),
        room("foyer", "Foyer", "foyer", rect([8.4375, 22], [SPINE, 28])),
        room("powder", "Guest bath", "powder-room", rect([8.4375, 28], [SPINE, 36.1875])),
        room("dining", "Dining", "dining", rect([LEFT, 36.1875], [SPINE, KITCHEN_FRONT])),
        room("kitchen", "Kitchen", "kitchen", [[LEFT, KITCHEN_FRONT], [SPINE, KITCHEN_FRONT], [SPINE, STORE_FRONT], [STORE_SIDE, STORE_FRONT], [STORE_SIDE, REAR], [LEFT, REAR]]),
        room("store", "Store", "store", rect([STORE_SIDE, STORE_FRONT], [SPINE, REAR])),
        room("bath1", "Bath 1", "bathroom", rect([NOOK, LOUNGE_BACK], [RIGHT, BED_FRONT]), { attachedTo: "bed1" }),
        room("bed1", "Bedroom 1", "bedroom", rect([SPINE, BED_FRONT], [RIGHT, REAR])),
      ],
      fixtures: [
        fixture("k-counter", "counter", [0.75, 49.625], [2, 8], "left"),
        fixture("k-counter-rear", "counter", [2.75, 57.625], [2, 2], "rear"),
        fixture("k-sink", "sink", [0.75, 54], [2, 3], "left"),
        fixture("k-hob", "hob", [0.75, 50.5], [2, 2.5], "left"),
        fixture("p-wc", "wc", [13.3, 34.45], [2.25, 1.5], "rear"),
        fixture("p-basin", "basin", [8.8, 34.45], [1.75, 1.5], "rear"),
        fixture("b1-wc", "wc", [27.5, 36.5], [2.25, 1.5], "front"),
        fixture("b1-basin", "basin", [23.4, 36.5], [1.75, 1.5], "front"),
        fixture("b1-shower", "shower", [26.75, 42.7], [3, 3], "rear"),
        fixture("b1-wardrobe", "wardrobe", [16.2, 50], [2, 9], "left"),
      ],
      stairs: [{ id: "stair", ...stair, to: "first" }],
    },
    {
      id: "first",
      name: "First floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: [[0, 4.625], [15.375, 4.625], [15.375, 3.125], [33.375, 3.125], [33.375, 19.5], [30.75, 19.5], [30.75, 60.375], [0, 60.375]],
        voids: [{ id: "stairwell", kind: "stair", outline: stairwell }],
        cantilevers: [
          { id: "box-corner", outline: rect([15.375, 3.125], [16.125, 4.625]) },
          { id: "box-over-porch", outline: rect([16.125, 3.125], [33.375, 18.75]) },
          { id: "box-back", outline: rect([30.75, 18.75], [33.375, 19.5]) },
        ],
      },
      walls: [
        ...chain("f", [[LEFT, TOWER_FRONT], [SPINE, TOWER_FRONT], [SPINE, BOX_FRONT], [BOX_SIDE, BOX_FRONT], [BOX_SIDE, PORCH_BACK], [RIGHT, PORCH_BACK], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior" }),
        int("tower-side", [TOWER_SIDE, TOWER_FRONT], [TOWER_SIDE, 36.1875]),
        int("master-back", [SPINE, PORCH_BACK], [RIGHT, PORCH_BACK]),
        int("service", [SERVICE, PORCH_BACK], [SERVICE, BED_FRONT]),
        int("dressing-back", [SERVICE, 25], [RIGHT, 25]),
        int("bath-back", [SERVICE, 32.5], [RIGHT, 32.5]),
        int("laundry-back", [SERVICE, 38], [RIGHT, 38]),
        int("lounge-back", [LEFT, 38.5], [13.5, 38.5]),
        int("closet-side", [6, 38.5], [6, BED_FRONT]),
        int("bath2-side", [13.5, 38.5], [13.5, BED_FRONT]),
        int("bed-front", [LEFT, BED_FRONT], [RIGHT, BED_FRONT]),
        int("bed-divide", [17.25, BED_FRONT], [17.25, REAR]),
      ].map(finish({ "f-2": CHARCOAL, "f-3": CHARCOAL, "f-4": CHARCOAL, "f-5": CHARCOAL })),
      openings: [
        // Facing the terrace (f-1, s = x - 0.375; f-2, s = 21.8125 - y)
        door("terrace-door", "f-1", 9, { type: "sliding-door", width: 5.5 }),
        win("master-terrace", "f-2", 7, 6, tall),
        // The master box's corner window (f-3, s = x - 15.75; f-4, s = y - 3.5)
        win("master-corner-front", "f-3", 10, 6.875, tall),
        win("master-corner-side", "f-4", 0.375, 8, tall),
        // Right side (f-6, s = y - 19.125)
        vent("dressing-vent", "f-6", 2),
        vent("master-bath-vent", "f-6", 8),
        win("laundry-side", "f-6", 13.6, 2.5),
        vent("bath3-vent", "f-6", 22),
        win("bed3-side", "f-6", 31, 6),
        // Rear (f-7, s = 30.375 - x)
        win("bed3-rear", "f-7", 4, 7),
        win("bed2-rear", "f-7", 17, 8),
        // Inside
        door("master-door", "master-back", 1.25, { opensTo: "right" }),
        door("dressing-door", "master-back", 7.5, { width: 2.5, opensTo: "right" }),
        door("master-bath-door", "dressing-back", 0.375, { type: "sliding-door", width: 3 }),
        door("laundry-door", "service", 15.5, { width: 2.5, opensTo: "left" }),
        door("closet-door", "bed-front", 2.6, { width: 2.5, opensTo: "left" }),
        door("bath2-door", "bed-front", 6.25, { width: 2.5, opensTo: "left" }),
        door("bed2-door", "bed-front", 13.6, { opensTo: "left" }),
        door("bed3-door", "bed-front", 17.1, { opensTo: "left" }),
        door("bath3-door", "bed-front", 22.5, { width: 2.5, opensTo: "left" }),
      ],
      rooms: [
        room("terrace", "Terrace", "terrace", rect([LEFT, FRONT], [SPINE, TOWER_FRONT]), { floor: "paving-stone" }),
        room("master", "Master bedroom", "master-bedroom", rect([SPINE, BOX_FRONT], [BOX_SIDE, PORCH_BACK])),
        room("dressing", "Dressing", "dressing", rect([SERVICE, PORCH_BACK], [RIGHT, 25]), { attachedTo: "master" }),
        room("master-bath", "Master bath", "bathroom", rect([SERVICE, 25], [RIGHT, 32.5]), { attachedTo: "dressing" }),
        room("laundry", "Laundry", "laundry", rect([SERVICE, 32.5], [RIGHT, 38])),
        room("family", "Family lounge", "family-lounge", [[TOWER_SIDE, TOWER_FRONT], [SPINE, TOWER_FRONT], [SPINE, PORCH_BACK], [SERVICE, PORCH_BACK], [SERVICE, 38.5], [LEFT, 38.5], [LEFT, 36.1875], [TOWER_SIDE, 36.1875]]),
        room("corridor", "Corridor", "corridor", rect([13.5, 38.5], [SERVICE, BED_FRONT])),
        room("closet", "Closet", "store", rect([LEFT, 38.5], [6, BED_FRONT])),
        room("bath2", "Bath 2", "bathroom", rect([6, 38.5], [13.5, BED_FRONT]), { attachedTo: "bed2" }),
        room("bath3", "Bath 3", "bathroom", rect([SERVICE, 38], [RIGHT, BED_FRONT]), { attachedTo: "bed3" }),
        room("bed2", "Bedroom 2", "bedroom", rect([LEFT, BED_FRONT], [17.25, REAR])),
        room("bed3", "Bedroom 3", "bedroom", rect([17.25, BED_FRONT], [RIGHT, REAR])),
      ],
      fixtures: [
        fixture("m-wardrobe", "wardrobe", [16.2, 4], [2, 5], "left"),
        fixture("d-wardrobe", "wardrobe", [28.15, 19.5], [2, 5], "right"),
        fixture("mb-wc", "wc", [24, 30.75], [2.25, 1.5], "rear"),
        fixture("mb-basin", "basin", [21.3, 30.75], [1.75, 1.5], "rear"),
        fixture("mb-shower", "shower", [27, 29.75], [3, 2.5], "rear"),
        fixture("laundry-counter", "counter", [28.2, 32.8], [1.9, 4.9], "right"),
        fixture("b2b-wc", "wc", [11, 44.3], [2.25, 1.5], "rear"),
        fixture("b2b-basin", "basin", [6.35, 38.75], [1.75, 1.5], "front"),
        fixture("b2b-shower", "shower", [10.65, 38.75], [2.6, 2.75], "front"),
        fixture("b3b-wc", "wc", [27.6, 38.4], [2.25, 1.5], "front"),
        fixture("b3b-basin", "basin", [21.3, 38.4], [1.75, 1.5], "front"),
        fixture("b3b-shower", "shower", [27, 43], [3, 2.75], "rear"),
        fixture("b2-wardrobe", "wardrobe", [0.75, 49], [2, 6], "left"),
        fixture("b3-wardrobe", "wardrobe", [17.65, 50], [2, 8], "left"),
      ],
      stairs: [{ id: "stair", ...stair, to: "roof" }],
    },
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 9,
      slab: {
        outline: [[0, 21.4375], [15.375, 21.4375], [15.375, 3.125], [33.375, 3.125], [33.375, 19.5], [30.75, 19.5], [30.75, 60.375], [0, 60.375]],
        voids: [{ id: "stairwell", kind: "stair", outline: stairwell }],
      },
      walls: chain("mumty", mumty, { closed: true, kind: "exterior", material: "plaster-warm-grey" }),
      openings: [door("roof-door", "mumty-2", 9, { opensTo: "right" })],
      rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
      parapets: [
        { id: "parapet-box", path: [[SPINE, TOWER_FRONT], [SPINE, BOX_FRONT], [BOX_SIDE, BOX_FRONT], [BOX_SIDE, PORCH_BACK], [RIGHT, PORCH_BACK]], closed: false, material: CHARCOAL },
        { id: "parapet", path: [[RIGHT, PORCH_BACK], [RIGHT, REAR], [LEFT, REAR], [LEFT, TOWER_FRONT], [SPINE, TOWER_FRONT]], closed: false, material: LIGHT },
      ],
      tanks: [
        { id: "tank-1", x: 20, y: 48, w: 5, d: 5, height: 5 },
        { id: "tank-2", x: 20, y: 54, w: 5, d: 5, height: 5 },
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
      // The left side stands on the plot line
      sides: ["front", "rear", "right"],
      height: 5,
      material: CHARCOAL,
      gates: [
        { id: "car-gate", side: "front", offset: 16.4, width: 14, kind: "vehicle" },
        { id: "side-gate", side: "front", offset: 30.8, width: 3.4, kind: "pedestrian" },
      ],
    },
    porches: [{ id: "porch", outline: rect([16.125, 0.75], [34.25, 18.75]) }],
    lawns: [{ id: "front-lawn", outline: rect([0.75, 0.75], [16.125, 4.625]) }],
    paving: [
      { id: "side-passage", outline: rect([30.75, 18.75], [34.25, 64.25]) },
      { id: "rear-yard", outline: rect([0.75, 60.375], [30.75, 64.25]) },
    ],
    planting: [
      { id: "shrub-1", kind: "shrub", at: [2.8, 2.6], size: 2.4 },
      { id: "shrub-2", kind: "shrub", at: [5.6, 2.6], size: 2.4 },
      { id: "shrub-3", kind: "shrub", at: [12.8, 2.6], size: 2.4 },
      { id: "shrub-4", kind: "shrub", at: [32.5, 50], size: 2.4 },
    ],
  },
  facade: [
    // Concrete ceiling to the deep porch, and a pier carrying the box's far corner
    { id: "porch-soffit", type: "box", level: "ground", role: "soffit", x: 16.125, y: 3.125, w: 17.25, d: 15.625, z: 10.4, h: 0.1, material: CONCRETE },
    { id: "box-pier", type: "box", level: "ground", role: "cladding", x: 32.375, y: 3.125, w: 1, d: 1, z: 0, h: 10.5, material: CHARCOAL },
    // Tall concrete frame around the corner window, standing proud of the charcoal
    { id: "frame-head-front", type: "box", level: "first", role: "frame", x: 25, y: 2.75, w: 8.75, d: 0.75, z: 8, h: 0.75, material: CONCRETE },
    { id: "frame-sill-front", type: "box", level: "first", role: "frame", x: 25, y: 2.75, w: 8.75, d: 0.75, z: 0.25, h: 0.75, material: CONCRETE },
    { id: "frame-jamb-front", type: "box", level: "first", role: "frame", x: 25, y: 2.75, w: 0.75, d: 0.75, z: 1, h: 7, material: CONCRETE },
    { id: "frame-head-side", type: "box", level: "first", role: "frame", x: 33, y: 3.5, w: 0.75, d: 9.125, z: 8, h: 0.75, material: CONCRETE },
    { id: "frame-sill-side", type: "box", level: "first", role: "frame", x: 33, y: 3.5, w: 0.75, d: 9.125, z: 0.25, h: 0.75, material: CONCRETE },
    { id: "frame-jamb-side", type: "box", level: "first", role: "frame", x: 33, y: 11.875, w: 0.75, d: 0.75, z: 1, h: 7, material: CONCRETE },
    // Charcoal over the roof slab's edge, so the box reads as one piece
    { id: "box-fascia-front", type: "box", level: "roof", role: "fascia", x: 15.25, y: 3, w: 18.25, d: 0.125, z: -0.6, h: 0.7, material: CHARCOAL },
    { id: "box-fascia-side", type: "box", level: "roof", role: "fascia", x: 33.375, y: 3.125, w: 0.125, d: 16.375, z: -0.6, h: 0.7, material: CHARCOAL },
    { id: "box-fascia-terrace", type: "box", level: "roof", role: "fascia", x: 15.25, y: 3.125, w: 0.125, d: 18.3125, z: -0.6, h: 0.7, material: CHARCOAL },
    // Vertical timber slats up the face of the stair tower, from the terrace to the top of the stair room
    ...repeat("tower-slat", 12, [0.75, 21.25], [8.25, 21.25], { level: "first", role: "slat", w: 0.25, d: 0.33, z: 0, h: 19.5, material: "wood-panel" }),
    // Solid concrete upstand around the terrace
    { id: "terrace-rail", type: "railing", level: "first", role: "balustrade", path: [[0.25, 21.4], [0.25, 5.25], [15.25, 5.25]], z: 0, h: 3.5, thickness: 0.25, material: CONCRETE },
    // Steel pergola over the terrace: posts, a front beam and rafters back to the house
    { id: "pergola-post-left", type: "box", level: "first", role: "pergola", x: 1, y: 6, w: 0.33, d: 0.33, z: 0, h: 9, material: "metal-dark" },
    { id: "pergola-post-right", type: "box", level: "first", role: "pergola", x: 14.8, y: 6, w: 0.33, d: 0.33, z: 0, h: 9, material: "metal-dark" },
    { id: "pergola-beam", type: "box", level: "first", role: "pergola", x: 1, y: 6, w: 14.13, d: 0.33, z: 9, h: 0.5, material: "metal-dark" },
    ...repeat("pergola-rafter", 11, [1.17, 13.7], [14.97, 13.7], { level: "first", role: "pergola", w: 0.17, d: 15.1, z: 9.5, h: 0.42, material: "metal-dark" }),
  ],
});
