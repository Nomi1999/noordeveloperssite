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
 * Facade: a light, warm palette. A beige tile bay with thin charcoal reveals beside a sand plaster
 * frame that holds a black metal jaali across the balcony, over a timber porch ceiling, with
 * timber slats on the balcony's cheek, a sand plaster porch pier, and a black gate with timber doors
 * set between grey stone piers in a solid beige tile boundary wall.
 */
import {
  BOUNDARY_BASE,
  boundaryKit,
  chain,
  cladding,
  defineDesign,
  door,
  ext,
  finishKit,
  fixture,
  gap,
  INT,
  int,
  makeGrid,
  outset,
  PLINTH,
  rect,
  repeat,
  room,
  sconces,
  SLAB,
  slatRun,
  stack,
  STOREY,
  tileJoints,
  wall,
  washLights,
  win,
  withDots,
} from "./helpers.ts";
import type { FacadeInput } from "./helpers.ts";
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

/** Every exterior wall is sand plaster; the street bay's tile and the other finishes stand on it as panels */
const SAND = { material: "plaster-sand" } as const;

const stair = { type: "dog-leg", x: 13.25, y: 16.0625, w: 11, d: 6.75, up: "right", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);
const mumty = rect([12.875, 15.6875], [RIGHT, 23.1875]);
const court = rect([SPINE, STAIR_BACK], [RIGHT, COURT_BACK]);
// Starts behind the stair room's back wall, which stands on the slab's edge
const courtOpening = rect([13.1875, 23.5625], [24.25, 28.1875]);

/** The first floor and roof reach forward over the porch to frame the balcony */
const upperOutline: Poly = [[0, 0.75], [10.875, 0.75], [10.875, 2.875], [25, 2.875], [25, 41.375], [0, 41.375]];

// ---- Finishes ----
// Every height here is above the road. The ground floor is at 2', the first at 13', the roof slab top at
// 24' and the parapet top at 27'-6". Panels stand on the walls, holed around the openings.

const { above, face, hole, box } = finishKit(PLINTH);
/** The outer face of the street wall, half a wall thickness in front of its centre line */
const FACE = FRONT - 0.375;
/** The height of a wall light centre */
const LIGHT = 7.5;
/** The underside of the first floor slab, where the soffits sit */
const SOFFIT = 12.4;
/** The height of the boundary panels and of the car gate */
const TOP = 5;

// The street bay: beige tile over both floors and the parapet, left bare at each slab edge so the charcoal shows
const bayFront = face([10.125, FACE], [25, FACE], 0, 27.5);
const bayHoles = [
  hole(3.375, 11.375, 3, 10), // the drawing room window
  hole(3.375, 7.375, 14, 21), // the master bedroom window
  hole(10.375, 12.375, 19, 21), // the master bath ventilator
  hole(0, 14.875, 12.5, 13), // the first floor slab edge
  hole(0, 14.875, 23.5, 24), // the roof slab edge
];
// The balcony right cheek faces the street at an angle
const cheek = face([10.875, 0.75], [10.875, FACE], 13, 24);
// The porch back wall and its inner side wall, both seen from the street
const porchBack = face([0, 18.75], [10.125, 18.75], 0, SOFFIT);
const porchBackHoles = [hole(1.375, 5.875, 3, 10), hole(6.375, 9.875, 2, 10)];
const porchSide = face([0.75, 0.75], [0.75, 18.75], 0, SOFFIT);

const house: FacadeInput[] = [
  ...cladding("bay-tile", bayFront, "tile-beige", { holes: bayHoles }),
  ...tileJoints("bay-joint", bayFront, { width: 3.7, height: 3, holes: bayHoles }),
  ...sconces("bay-sconce", face([10.125, FACE], [25, FACE], 0, SOFFIT), [[1.7, above(LIGHT)], [13.2, above(LIGHT)]]),
  // A thin charcoal cap on the parapet
  box("roof-cap", "fascia", "plaster-charcoal", [10.125, FACE - 0.08], [25, 3.45], 27.5, 27.85),
  // Timber on the balcony cheek, matching the porch ceiling
  ...slatRun("cheek-slat", cheek, { backing: "plaster-sand" }),
  // The porch, in the same tile
  ...cladding("porch-back", porchBack, "tile-beige", { holes: porchBackHoles }),
  ...tileJoints("porch-back-joint", porchBack, { width: 3.4, height: 3, holes: porchBackHoles }),
  ...cladding("porch-side", porchSide, "tile-beige"),
  ...tileJoints("porch-side-joint", porchSide, { width: 3.9, height: 3 }),
  ...washLights("porch-side-wash", porchSide, [3, 7.5, 12, 16.5], above(SOFFIT - 0.1)),
];

// ---- The boundary above its base ----

const { run, inWall, timberDoor } = boundaryKit<"front" | "right" | "rear" | "left">(
  PLINTH,
  { front: [[0, 0], [25, 0]], right: [[25, 0], [25, 45]], rear: [[25, 45], [0, 45]], left: [[0, 45], [0, 0]] },
  { panel: "plaster-sand", top: TOP, hood: 0.7 },
);
const pier = (id: string, x0: number, x1: number): FacadeInput[] => [
  box(id, "pier", "stone-tile-grey", [x0, 0], [x1, 1.3], 0, TOP + 0.4),
  box(`${id}-cap`, "pier", "plaster-charcoal", [x0, 0], [x1 + 0.1, 1.4], TOP + 0.4, TOP + 0.6),
];

// The solid wall beside the gate: beige tile to the cap, like the street bay
const tileFace = run("front", 11, 23.7, BOUNDARY_BASE, TOP - 0.7);

const boundary: FacadeInput[] = [
  // Front, left to right: a pier, the car gate with a wicket door in it, a pier, then a solid wall of beige tile with
  // a charcoal reveal line, under a charcoal cap, to the last pier
  ...pier("boundary-front-pier-a", 0, 1.8),
  ...pier("boundary-front-pier-b", 9.1, 11),
  // The black leaf shows between the two timber doors and around them, as the frame of the wicket
  ...timberDoor("boundary-front-gate-a", run("front", 2, 7, 0.5, TOP - 0.4)),
  ...timberDoor("boundary-front-gate-b", run("front", 7.35, 8.9, 0.5, TOP - 0.4)),
  box("boundary-front-gate-handle", "handle", "metal-dark", [7.1, 0.02], [7.22, 0.1], 2.6, 3.6),
  ...cladding("boundary-front-tile", tileFace, "tile-beige", inWall),
  ...tileJoints("boundary-front-tile-joint", tileFace, { width: 3.7, height: 99, out: 0 }),
  ...cladding("boundary-front-reveal", run("front", 11, 23.7, 3.1, 3.25), "plaster-charcoal", { out: -0.35, depth: 0.1 }),
  ...cladding("boundary-front-cap", run("front", 11, 23.7, TOP - 0.7, TOP), "plaster-charcoal", inWall),
  ...sconces("boundary-front-sconce", run("front", 0, 25, BOUNDARY_BASE, TOP), [[12.6, above(3.1)], [19, above(3.1)]], -0.1),
  ...pier("boundary-front-pier-c", 23.7, 24.9),
  // The planter between the wall and the house, holding the shrubs
  box("front-planter", "planter", "tile-beige", [11.2, 1.2], [24, 2.5], 0, 1),
  // The rear wall, in plain sand plaster
  ...cladding("boundary-rear-wall", run("rear", 0, 25, BOUNDARY_BASE, TOP), "plaster-sand", inWall),
];

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
        material: "plaster-charcoal",
        islands: [
          rect([0, 0.75], [0.75, 18.75]),
          rect([24.25, 0.75], [25, 2.875]),
          rect([0, 41.375], [0.75, 44.25]),
          rect([24.25, 41.375], [25, 44.25]),
        ],
      },
      walls: [
        ...chain("out", [[LEFT, PORCH_BACK], [PORCH_SIDE, PORCH_BACK], [PORCH_SIDE, FRONT], [RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior", ...SAND }),
        // Carries the first floor over the porch
        ext("porch-side", [LEFT, 0.75], [LEFT, PORCH_BACK], SAND),
        ext("front-cheek", [RIGHT, 0.75], [RIGHT, 2.875], { height: 3, ...SAND }),
        ext("yard-left", [LEFT, 41.375], [LEFT, 44.25], { height: 3, ...SAND }),
        ext("yard-right", [RIGHT, 41.375], [RIGHT, 44.25], { height: 3, ...SAND }),
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
        material: "plaster-charcoal",
        voids: [{ id: "stairwell", kind: "stair", outline: stairwell }],
        cantilevers: [
          { id: "balcony", outline: rect([0.75, 0.75], [10.875, 2.875]) },
          { id: "over-porch", outline: rect([0.75, 2.875], [10.125, 18.75]) },
        ],
      },
      walls: [
        ...chain("f", [[LEFT, 7], [PORCH_SIDE, 7], [PORCH_SIDE, FRONT], [RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR]], { closed: true, kind: "exterior", ...SAND }),
        // The cheeks either side of the balcony
        ext("balcony-left", [LEFT, 0.75], [LEFT, 7], SAND),
        ext("balcony-right", [PORCH_SIDE, 0.75], [PORCH_SIDE, FRONT], SAND),
        int("master-back", [LEFT, MID], [RIGHT, MID]),
        int("master-side", [18.125, FRONT], [18.125, MID]),
        wall("court-front", [SPINE, STAIR_BACK], [RIGHT, STAIR_BACK], { kind: "exterior", thickness: INT, ...SAND }),
        wall("court-left", [SPINE, STAIR_BACK], [SPINE, COURT_BACK], { kind: "exterior", thickness: INT, ...SAND }),
        wall("court-back", [SPINE, COURT_BACK], [RIGHT, COURT_BACK], { kind: "exterior", thickness: INT, ...SAND }),
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
        material: "plaster-charcoal",
        voids: [
          { id: "stairwell", kind: "stair", outline: stairwell },
          { id: "sky-court", kind: "open", outline: courtOpening },
        ],
      },
      walls: chain("mumty", mumty, { closed: true, kind: "exterior", material: "plaster-sand" }),
      openings: [door("roof-door", "mumty-4", 2, { opensTo: "right" })],
      rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
      parapets: [
        { id: "parapet", path: [[RIGHT, FRONT], [RIGHT, REAR], [LEFT, REAR], [LEFT, 1.125], [PORCH_SIDE, 1.125], [PORCH_SIDE, FRONT]], closed: false, material: "plaster-sand" },
        { id: "parapet-front", path: [[PORCH_SIDE, FRONT], [RIGHT, FRONT]], closed: false, material: "tile-beige" },
        { id: "court-parapet", path: court, thickness: INT, material: "plaster-sand" },
      ],
      tanks: [
        { id: "tank-1", x: 2, y: 34, w: 4, d: 4, height: 4, material: "plaster-sand" },
        { id: "tank-2", x: 7, y: 34, w: 4, d: 4, height: 4, material: "plaster-sand" },
      ],
    },
    {
      id: "top",
      name: "Stair room roof",
      kind: "roof",
      height: 1,
      slab: { outline: outset(mumty, 0.375), thickness: SLAB, material: "plaster-charcoal" },
    },
  ]),
  site: {
    boundary: {
      // A low sand base: everything above it is panels in `boundary`, because its finish changes along the front
      sides: ["front", "rear"],
      height: BOUNDARY_BASE,
      material: "plaster-sand",
      // The openings run pier to pier, so the sand base stops at each pier's outer face instead of showing at its foot.
      // The black leaf's ends, 8" in from each end, are hidden in the piers; the timber is drawn over it
      gates: [
        { id: "car-gate", side: "front", offset: 0, width: 11, kind: "vehicle", height: TOP, posts: false },
        { id: "end-pier-gap", side: "front", offset: 23.7, width: 1.3, kind: "pedestrian", open: true, height: TOP, posts: false },
      ],
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
    // Timber ceiling over the car porch, with its downlights
    ...withDots({ id: "porch-soffit", type: "box", level: "ground", role: "soffit", x: 0.75, y: 0.75, w: 9.375, d: 18, z: 10.4, h: 0.1, material: "wood-slat" }),
    // Carries the corner of the balcony frame, which reaches forward past the drawing room
    { id: "porch-pier", type: "box", level: "ground", role: "cladding", x: 10.125, y: 0.75, w: 0.75, d: 0.75, z: 0, h: 10.5, material: "plaster-sand" },
    // Metal jaali across the balcony opening: 3-inch bars on a grid of about a foot
    ...repeat("jaali-v", 10, [1.25, 1], [9.625, 1], { level: "first", role: "jaali", w: 0.25, d: 0.17, z: 0, h: 10.5, material: "metal-dark" }),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `jaali-h-${i + 1}`, type: "box" as const, level: "first", role: "jaali", x: 0.75, y: 0.915, w: 9.375, d: 0.17, z: 0.75 + i, h: 0.25, material: "metal-dark" as const,
    })),
    ...house,
    ...boundary,
  ],
});
