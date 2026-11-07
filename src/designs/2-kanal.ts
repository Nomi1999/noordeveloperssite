/**
 * 2 Kanal house: 75' × 120' plot, double storey, the 1 Kanal language wider.
 *
 * Ground: formal drawing (with guest bath) and dining at the front, a
 * double-height lounge with a full-height window wall to the side lawn,
 * kitchen and back kitchen, two bedrooms with baths, servant quarter at the
 * rear, a 3-car porch and a guard room by the gate. First: master suite with
 * the terrace over the porch, four more bedrooms with baths, and a gallery and
 * family lounge overlooking the double-height void. Roof: stair room, tanks.
 *
 * Outside: a charcoal bedroom box with black fins over a travertine drawing room, a grey stone
 * pier and entrance tower, a travertine porch and terrace over a charcoal beam on granite columns,
 * a charcoal roof overhang with a timber soffit over the terrace, and black fins on the lounge
 * glass. The front boundary is grey stone with a black lattice, granite piers and black gates.
 */
import {
  BOUNDARY_BASE,
  BOUNDARY_TOP,
  boundaryKit,
  chain,
  cladding,
  defineDesign,
  door,
  EXT,
  finishKit,
  fixture,
  gap,
  int,
  ledLines,
  makeGrid,
  outset,
  PLINTH,
  rect,
  repeat,
  room,
  sconces,
  stack,
  stoneTile,
  STOREY,
  tileJoints,
  washLights,
  win,
  withDots,
  type FacadeInput,
} from "./helpers.ts";

const G = makeGrid([22, 40, 48, 56, 70], [28, 48, 64, 74, 94, 106]);
const { g } = G;

const vent = (id: string, host: string, offset: number) => win(id, host, offset, 2, { sill: 6, height: 2 });
const tall = { sill: 1, height: 7 };

const stair = { type: "dog-leg", x: 48.25, y: 58.5, w: 7.5, d: 14, up: "front", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);

const guard = rect([66.5, 1.5], [73.5, 8.5]);
const guardSlab = outset(guard, EXT / 2);
const firstWalls: [number, number][] = [[22, 25], [40, 25], [40, 28], [70, 28], [70, 106], [22, 106]];
const mumty = rect([47.875, 58.125], [56.125, 76.375]);
// Height of the double-height window wall: up to the underside of the roof slab
const doubleHeight = 2 * STOREY - 0.5;

// ---- Finishes ----
// Every height here is above the road. The ground floor is at 2', the first at 13', the roof slab's
// top at 24' and the parapet's top at 27'-6".

const { above, face, hole, box } = finishKit(PLINTH);
const sand = { material: "plaster-sand" } as const;
const charcoal = { material: "plaster-charcoal" } as const;

/** The height of a wall light's centre */
const LIGHT = 7.5;
/** The underside of the first floor's slab, where the soffits sit */
const SOFFIT = 12.4;

const FRONT = 27.625;
const LEFT = 21.625;
const RIGHT = 70.375;
/** The front of the stone pier and the stone tower above the entrance */
const PIER = 26.625;
const TOWER_END = 46.5;
const PIER_END = 42;

const boxFront = face([LEFT, 24.625], [40.375, 24.625], 12.4, 27.5);
const boxLeft = face([LEFT, 47.625], [LEFT, 24.625], 12.5, 27.5);
const drawingFront = face([LEFT, FRONT], [40.375, FRONT], 0, SOFFIT);
const drawingSide = face([LEFT, 47.625], [LEFT, FRONT], 0, 12.5);
const towerFront = face([40.375, PIER], [TOWER_END, PIER], 13, 28.5);
const pierFront = face([40.375, PIER], [PIER_END, PIER], 0, 13);
const entrance = face([PIER_END, FRONT], [48, FRONT], 0, SOFFIT);
const porchWall = face([48, FRONT], [RIGHT, FRONT], 0, SOFFIT);
const terraceWall = face([TOWER_END, FRONT], [RIGHT, FRONT], 13, 24);
const loungeSide = face([LEFT, 74.375], [LEFT, 47.625], 0, 27.5);
const rightFront = face([RIGHT, FRONT], [RIGHT, 48], 0, 24);
const rightMass = face([RIGHT, 48], [RIGHT, 62], 0, 27.5);

const house: FacadeInput[] = [
  // The bedroom box: charcoal around its window, with LED lines at the corner and black fins in front
  ...cladding("box-front", boxFront, "plaster-charcoal", { holes: [hole(2.375, 16.375, 14, 21)] }),
  ...ledLines("box-led", boxFront, [0.8, 1.4]),
  ...cladding("box-left", boxLeft, "plaster-charcoal", { holes: [hole(2.625, 4.625, 19, 21), hole(8.625, 16.625, 16, 21)] }),
  ...cladding("box-return", face([40.375, 24.625], [40.375, PIER], 13, 27.5), "plaster-charcoal"),
  ...withDots(box("box-soffit", "soffit", "wood-slat", [LEFT, 24.625], [40.375, FRONT], SOFFIT, 12.5)),

  // The drawing room under the box, in travertine with its wall lights
  ...cladding("drawing-front", drawingFront, "travertine", { holes: [hole(3.375, 15.375, 3, 10)] }),
  ...sconces("drawing-sconce", drawingFront, [[1.7, above(LIGHT)], [17, above(LIGHT)]]),
  ...cladding("drawing-side", drawingSide, "travertine", { holes: [hole(2.125, 4.125, 8, 10), hole(9.625, 17.625, 5, 10)] }),
  ...sconces("drawing-side-sconce", drawingSide, [[8.4, above(LIGHT)], [18.8, above(LIGHT)]]),

  // The stone pier beside the door, and the tower over the entrance that passes through the roofline
  box("stone-pier", "cladding", "stone-tile-grey", [40.375, PIER], [PIER_END, FRONT], 0, 13),
  ...tileJoints("stone-pier-joint", pierFront, { width: 99, height: 2.7, out: 0 }),
  box("stone-tower", "cladding", "stone-tile-grey", [40.375, PIER], [TOWER_END, 28.375], 13, 28.5),
  ...tileJoints("stone-tower-joint", towerFront, { width: 99, height: 2.7, out: 0 }),
  ...ledLines("stone-tower-led", towerFront, [0.6, 5.525], 0),

  // The entrance: beige tile around the door and over it, up to the soffit
  ...cladding("entrance-tile", entrance, "tile-beige", { holes: [hole(0, 4.5, 2, 10)] }),
  ...tileJoints("entrance-joint", entrance, { width: 99, height: 5.5, holes: [hole(0, 4.5, 2, 10)] }),
  ...sconces("entrance-sconce", entrance, [[5.25, above(LIGHT)]]),
  ...washLights("entrance-wash", entrance, [0.75, 2.25, 3.75], above(12.3)),

  // The porch: travertine around the dining window, a charcoal beam on granite columns and a timber ceiling
  ...cladding("porch-stone", porchWall, "travertine", { holes: [hole(4, 18, 3, 10)] }),
  box("beam-front", "beam", "plaster-charcoal", [40.355, 10.98], [70.395, 11.6], 10.6, 13.02),
  box("beam-left", "beam", "plaster-charcoal", [40.355, 10.98], [41, PIER], 10.6, 13.02),
  box("beam-right", "beam", "plaster-charcoal", [69.8, 10.98], [70.395, FRONT], 10.6, 13.02),
  ...withDots(box("porch-ceiling", "soffit", "wood-slat", [41, 11.6], [69.8, FRONT], SOFFIT, 12.5)),

  // The terrace's back wall, in travertine around the sliding door
  ...cladding("terrace-stone", terraceWall, "travertine", { holes: [hole(7.5, 17.5, 13, 21)] }),
  ...sconces("terrace-sconce", terraceWall, [[20.7, above(18)]]),
  ...washLights("terrace-wash", terraceWall, [1.5, 3.75, 6, 9.5, 12.5, 15.5, 18.5, 21.5], above(23.85)),

  // The roof over the terrace: a charcoal fascia over a timber soffit, running on down the right side
  box("fascia-front", "fascia", "plaster-charcoal", [TOWER_END, 23.5], [71.4, 28], 24, 27.6),
  box("fascia-side", "fascia", "plaster-charcoal", [RIGHT, 28], [71.4, 40], 24, 27.6),
  ...withDots(box("soffit-roof-front", "soffit", "wood-slat", [TOWER_END, 23.5], [71.4, 28], 23.9, 24)),
  ...withDots(box("soffit-roof-side", "soffit", "wood-slat", [RIGHT, 28], [71.4, 40], 23.9, 24)),

  // The lounge's window wall on the lawn, framed in stone
  ...stoneTile("lounge-stone", loungeSide, 99, 3.5, [hole(1.375, 25.375, 2, 23)]),

  // The right side: travertine at the front, then a tall stone mass with LED lines
  ...cladding("right-front", rightFront, "travertine", { holes: [hole(4.375, 12.375, 5, 10), hole(5.375, 13.375, 16, 21)] }),
  ...sconces("right-sconce", rightFront, [[2.2, above(LIGHT)], [14.5, above(LIGHT)]]),
  ...washLights("right-wash", rightFront, [2.5, 5.5, 8.5, 11.5], above(23.85)),
  ...stoneTile("right-mass", rightMass, 3.5, 3.5, [hole(4, 10, 5.5, 10), hole(5, 13, 16, 21)]),
  ...ledLines("right-mass-led", rightMass, [1, 1.6]),

  // The guard room's cap
  box("guard-cap", "fascia", "plaster-charcoal", [66.1, 1.1], [73.9, 8.9], 12.4, 13.4),
];

// ---- The boundary above its base ----

const { run, inWall, stoneWall, wallLights } = boundaryKit<"front" | "right" | "rear" | "left">(PLINTH, {
  front: [[0, 0], [75, 0]],
  right: [[75, 0], [75, 120]],
  rear: [[75, 120], [0, 120]],
  left: [[0, 120], [0, 0]],
});
const lattice = (id: string, s0: number, s1: number, z0: number, z1: number): FacadeInput => ({
  ...cladding(id, run("front", s0, s1, z0, z1), "metal-dark", { out: -0.15, depth: 0.05 })[0],
  role: "lattice",
});
const pier = (id: string, x0: number, x1: number): FacadeInput => ({
  id, type: "box", level: "ground", role: "pier", x: x0, y: 0, w: x1 - x0, d: 1.5, z: -PLINTH, h: 8.5, material: "granite-black",
});
// The panels on the sides stop short of the corners, where the front and rear panels run through
const SIDE_START = 0.52;

const boundary: FacadeInput[] = [
  // Front, left to right: stone with a lattice onto the lawn, the gate piers, then stone past the guard room
  ...stoneWall("boundary-front-stone-a", "front", 0, 36, [hole(12, 22, BOUNDARY_BASE, 3.5)]),
  ...[1.6, 2.2, 2.8].map((z, i) => lattice(`boundary-front-lattice-rail-${i + 1}`, 12, 22, z - 0.03, z + 0.03)),
  ...Array.from({ length: 18 }, (_, i) => {
    const x = 12 + (10 * (i + 0.5)) / 18;
    return lattice(`boundary-front-lattice-bar-${i + 1}`, x - 0.03, x + 0.03, BOUNDARY_BASE, 3.5);
  }),
  pier("boundary-front-pier-a", 36, 38.16),
  pier("boundary-front-pier-b", 41.84, 44.66),
  pier("boundary-front-pier-c", 63.34, 65.4),
  ...stoneWall("boundary-front-stone-b", "front", 65.4, 75),
  ...wallLights("boundary-front-sconce", "front", [3.5, 9.5, 24.5, 30.5, 70]),
  // The neighbours' sides in plain plaster
  ...cladding("boundary-right-wall", run("right", SIDE_START, 120 - SIDE_START, BOUNDARY_BASE, BOUNDARY_TOP), "plaster-warm-grey", inWall),
  ...cladding("boundary-rear-wall", run("rear", 0, 75, BOUNDARY_BASE, BOUNDARY_TOP), "plaster-warm-grey", inWall),
  ...cladding("boundary-left-wall", run("left", SIDE_START, 120 - SIDE_START, BOUNDARY_BASE, BOUNDARY_TOP), "plaster-warm-grey", inWall),
];

export default defineDesign({
  slug: "2-kanal",
  name: "2 Kanal House",
  kind: "house",
  plot: { width: 75, depth: 120 },
  // Columns are as deep as the walls, and none stands in a window or door
  grid: { x: G.x, y: G.y, column: [EXT, EXT], omit: ["B3", "D1", "A3", "A5", "B6", "C4"] },
  levels: stack(PLINTH, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: STOREY,
      slab: { outline: outset(rect(g("A", 1), g("E", 6)), EXT / 2), islands: [guardSlab] },
      walls: [
        ...chain("out", [g("A", 1), g("E", 1), g("E", 6), g("A", 6), g("A", 4), g("A", 2)], { closed: true, kind: "exterior", ...sand }).map(
          (w) => (w.id === "out-5" ? { ...w, height: doubleHeight } : w),
        ),
        ...chain("guard", guard, { closed: true, kind: "exterior", material: "travertine" }),
        int("pw-a", [22, 41], [28, 41]),
        int("pw-b", [28, 41], [28, 48]),
        int("b1", g("B", 1), g("B", 2)),
        int("c1", g("C", 1), g("C", 2)),
        int("y2a", g("A", 2), g("C", 2)),
        int("y2b", g("C", 2), g("E", 2)),
        int("c2", g("C", 2), g("C", 4)),
        int("d2", g("D", 2), g("D", 6)),
        int("y3", g("D", 3), g("E", 3)),
        int("y4a", g("A", 4), g("B", 4)),
        int("y4b", g("D", 4), g("E", 4)),
        int("b4", g("B", 4), g("B", 5)),
        int("lobby", [40, 84], [48, 84]),
        int("c5", [48, 84], g("C", 6)),
        int("y5a", g("A", 5), g("C", 5)),
        int("x32", [32, 94], [32, 106]),
        int("b2-a", [62, 86], [70, 86]),
        int("b2-b", [62, 86], [62, 94]),
        int("y5b", g("D", 5), g("E", 5)),
        int("x62", [62, 94], [62, 106]),
        int("sq", [56, 98], [62, 98]),
      ],
      openings: [
        // Front (out-1, s = x - 22)
        win("drawing-front", "out-1", 3, 12, tall),
        door("main-door", "out-1", 20, { type: "double-door", width: 4.5 }),
        win("dining-front", "out-1", 30, 14, tall),
        // Right (out-2, s = y - 28)
        win("dining-side", "out-2", 4, 8),
        win("kitchen-side", "out-2", 24, 6, { sill: 3.5, height: 4.5 }),
        door("back-kitchen-door", "out-2", 38, { opensTo: "right", hinge: "end" }),
        win("bed2-side", "out-2", 48, 6),
        vent("bath2-vent", "out-2", 61),
        win("servant-side", "out-2", 70, 4),
        // Rear (out-3, s = 70 - x)
        door("servant-door", "out-3", 2, { opensTo: "right" }),
        vent("servant-bath-vent", "out-3", 10),
        door("back-door", "out-3", 17, { opensTo: "right" }),
        win("store-rear", "out-3", 26, 6, { sill: 4, height: 3 }),
        vent("bath1-vent", "out-3", 42),
        // Left (out-4 and out-6), with the double-height window wall (out-5) between
        win("bed1-side", "out-4", 18, 8, tall),
        win("lounge-glass", "out-5", 1, 24, { sill: 0, height: doubleHeight - 0.5 }),
        vent("powder-vent", "out-6", 2.5),
        win("drawing-side", "out-6", 10, 8),
        // Guard room
        door("guard-door", "guard-4", 2, { opensTo: "right" }),
        win("guard-front", "guard-1", 2, 3),
        win("guard-rear", "guard-3", 2, 3),
        // Inside
        door("drawing-door", "b1", 12, { type: "double-door", width: 4.5, opensTo: "right" }),
        door("dining-door", "c1", 12, { type: "double-door", width: 4.5, opensTo: "left" }),
        door("powder-door", "pw-b", 2, { width: 2.5, opensTo: "right", hinge: "end" }),
        gap("foyer-arch", "y2a", 19.5, 6),
        door("kitchen-door", "y2b", 11, { opensTo: "right" }),
        gap("lounge-hall", "c2", 2, 8),
        door("kitchen-hall", "d2", 2, { opensTo: "right" }),
        door("bed2-door", "d2", 28, { opensTo: "right", hinge: "end" }),
        door("laundry-door", "d2", 47, { width: 2.5, opensTo: "right" }),
        door("back-kitchen-inner", "y3", 4, { opensTo: "right" }),
        door("bed1-door", "b4", 2, { opensTo: "left" }),
        door("dressing1-door", "b4", 12, { opensTo: "right" }),
        door("bath1-door", "y5a", 2, { width: 2.5, opensTo: "right" }),
        door("store-door", "c5", 12, { opensTo: "left" }),
        door("bath2-door", "b2-b", 2, { width: 2.5, opensTo: "right" }),
        door("servant-bath-door", "x62", 7.5, { width: 2.5, opensTo: "left" }),
      ],
      rooms: [
        room("drawing", "Drawing room", "drawing", [[22, 28], [40, 28], [40, 48], [28, 48], [28, 41], [22, 41]]),
        room("powder", "Guest bath", "powder-room", rect([22, 41], [28, 48]), { attachedTo: "drawing" }),
        room("foyer", "Foyer", "foyer", rect(g("B", 1), g("C", 2))),
        room("dining", "Dining", "dining", rect(g("C", 1), g("E", 2))),
        room("lounge", "Lounge", "lounge", rect(g("A", 2), g("C", 4))),
        room("hall", "Hall", "stair-hall", [[48, 48], [56, 48], [56, 106], [48, 106], [48, 84], [40, 84], [40, 74], [48, 74]]),
        room("kitchen", "Kitchen", "kitchen", rect(g("D", 2), g("E", 3))),
        room("back-kitchen", "Back kitchen", "back-kitchen", rect(g("D", 3), g("E", 4))),
        room("bed1", "Bedroom 1", "bedroom", rect(g("A", 4), g("B", 5))),
        room("dressing1", "Dressing", "dressing", rect([40, 84], g("C", 5)), { attachedTo: "bed1" }),
        room("bath1", "Bath 1", "bathroom", rect(g("A", 5), [32, 106]), { attachedTo: "bed1" }),
        room("store", "Store", "store", rect([32, 94], g("C", 6))),
        room("bed2", "Bedroom 2", "bedroom", [[56, 74], [70, 74], [70, 86], [62, 86], [62, 94], [56, 94]]),
        room("bath2", "Bath 2", "bathroom", rect([62, 86], g("E", 5)), { attachedTo: "bed2" }),
        room("laundry", "Laundry", "laundry", rect(g("D", 5), [62, 98])),
        room("servant-bath", "Servant bath", "bathroom", rect([56, 98], [62, 106]), { attachedTo: "servant" }),
        room("servant", "Servant room", "servant-room", rect([62, 94], g("E", 6))),
        room("guard", "Guard room", "guard-room", guard),
      ],
      fixtures: [
        fixture("pw-wc", "wc", [22.375, 44.5], [2.25, 1.5], "left"),
        fixture("pw-basin", "basin", [24.5, 41.2], [1.75, 1.5], "front"),
        fixture("k-counter-side", "counter", [67.625, 48.5], [2, 15.1], "right"),
        fixture("k-island", "counter", [56.2, 54.5], [2, 7], "left"),
        fixture("k-sink", "sink", [67.625, 53.5], [2, 3], "right"),
        fixture("k-hob", "hob", [56.2, 56.75], [2, 2.5], "left"),
        fixture("bk-counter", "counter", [58, 71.8], [9.5, 2], "rear"),
        fixture("bk-sink", "sink", [61, 71.8], [2.5, 2], "rear"),
        fixture("b1-wc", "wc", [22.375, 99], [2.25, 1.5], "left"),
        fixture("b1-vanity", "vanity", [29.8, 95], [2, 4], "right"),
        fixture("b1-shower", "shower", [28.8, 102.6], [3, 3], "rear"),
        fixture("b1-tub", "bathtub", [22.375, 103.1], [5.5, 2.5], "rear"),
        fixture("bed1-wardrobe", "wardrobe", [28, 74.2], [8, 2], "front"),
        fixture("d1-wardrobe", "wardrobe", [45.8, 84.5], [2, 9], "right"),
        fixture("b2-wc", "wc", [67.375, 86.5], [2.25, 1.5], "right"),
        fixture("b2-shower", "shower", [66.6, 90.8], [3, 3], "right"),
        fixture("b2-basin", "basin", [62.6, 92.3], [1.75, 1.5], "rear"),
        fixture("bed2-wardrobe", "wardrobe", [60, 74.2], [8, 2], "front"),
        fixture("sb-wc", "wc", [57, 103.35], [1.5, 2.25], "rear"),
        fixture("sb-basin", "basin", [56.2, 100.5], [1.5, 1.75], "left"),
        fixture("laundry-counter", "counter", [58, 94.2], [3.8, 2], "front"),
      ],
      stairs: [{ id: "stair", ...stair, to: "first" }],
    },
    {
      id: "first",
      name: "First floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: [[21.625, 24.625], [40.375, 24.625], [40.375, 11], [70.375, 11], [70.375, 106.375], [21.625, 106.375]],
        islands: [guardSlab],
        voids: [
          { id: "stairwell", kind: "stair", outline: stairwell },
          { id: "lounge-void", kind: "double-height", outline: rect([21.625, 52], [44, 74]) },
        ],
        cantilevers: [
          { id: "bedroom-box", outline: rect([21.625, 24.625], [40.375, 27.625]) },
          { id: "porch-terrace", outline: rect([40.375, 11], [70.375, 27.625]) },
        ],
      },
      walls: [
        ...chain("f", [[22, 48], ...firstWalls, [22, 74]], { kind: "exterior", ...sand }),
        int("y2a", g("A", 2), g("C", 2)),
        int("y2b", g("C", 2), g("E", 2)),
        int("b1", [40, 28], g("B", 2)),
        int("b3-a", [22, 40], [29, 40]),
        int("b3-b", [29, 40], [29, 48]),
        int("mb", [40, 38], [48, 38]),
        int("c1", g("C", 1), g("C", 2)),
        int("d2", g("D", 2), g("D", 6)),
        int("y66", [56, 66], [70, 66]),
        int("y4", g("D", 4), g("E", 4)),
        int("y5", g("D", 5), g("E", 5)),
        int("x62", [62, 94], [62, 106]),
        int("c4", g("C", 4), g("C", 6)),
        int("fam", [22, 88.5], [48, 88.5]),
        int("b6", [40, 88.5], [40, 106]),
        int("d6", [40, 98], [48, 98]),
      ],
      openings: [
        win("bed3-front", "f-2", 2, 14, tall),
        door("terrace-door", "f-4", 14, { type: "sliding-door", width: 10 }),
        win("master-side", "f-5", 5, 8),
        win("bed4-side", "f-5", 25, 8),
        vent("bath4-vent", "f-5", 42),
        win("bed5-side", "f-5", 51, 8),
        vent("bath5-vent", "f-5", 70),
        win("bed6-rear", "f-6", 34, 10),
        win("bed6-side", "f-7", 4, 10, tall),
        win("family-side", "f-7", 22, 8, tall),
        win("bed3-side", "f-1", 9, 8),
        vent("bath3-vent", "f-1", 3),
        door("bed3-door", "y2a", 10, { opensTo: "left" }),
        door("master-door", "y2b", 2, { opensTo: "left" }),
        door("bath3-door", "b3-b", 1, { width: 2.5, opensTo: "left", hinge: "end" }),
        door("dressing-door", "c1", 3, { opensTo: "right" }),
        door("master-bath-door", "mb", 2, { width: 2.5, opensTo: "left" }),
        door("bed4-door", "d2", 2, { opensTo: "left" }),
        door("bed5-door", "d2", 28, { opensTo: "left", hinge: "end" }),
        door("bath4-door", "y66", 6, { width: 2.5, opensTo: "left" }),
        door("dressing5-door", "y5", 1.5, { width: 2.5, opensTo: "left" }),
        door("bath5-door", "y5", 7, { width: 2.5, opensTo: "left" }),
        gap("family-opening", "c4", 2, 10),
        door("bed6-door", "fam", 8, { opensTo: "right" }),
        door("bath6-door", "b6", 1.5, { width: 2.5, opensTo: "right" }),
        door("dressing6-door", "b6", 11.5, { width: 2.5, opensTo: "right" }),
      ],
      rooms: [
        room("bed3", "Bedroom 3", "bedroom", [[22, 25], [40, 25], [40, 48], [29, 48], [29, 40], [22, 40]]),
        room("bath3", "Bath 3", "bathroom", rect([22, 40], [29, 48]), { attachedTo: "bed3" }),
        room("dressing", "Dressing", "dressing", rect([40, 28], [48, 38]), { attachedTo: "master" }),
        room("master-bath", "Master bath", "bathroom", rect([40, 38], g("C", 2)), { attachedTo: "dressing" }),
        room("master", "Master bedroom", "master-bedroom", rect(g("C", 1), g("E", 2))),
        room("terrace", "Terrace", "terrace", rect([40.375, 11], [70, 28]), { floor: "paving-stone" }),
        room("landing", "Gallery", "stair-hall", [[22, 48], [56, 48], [56, 106], [48, 106], [48, 74], [44, 74], [44, 52], [22, 52]]),
        room("bed4", "Bedroom 4", "bedroom", rect(g("D", 2), [70, 66])),
        room("bath4", "Bath 4", "bathroom", rect([56, 66], g("E", 4)), { attachedTo: "bed4" }),
        room("bed5", "Bedroom 5", "bedroom", rect(g("D", 4), g("E", 5))),
        room("dressing5", "Dressing 5", "dressing", rect(g("D", 5), [62, 106]), { attachedTo: "bed5" }),
        room("bath5", "Bath 5", "bathroom", rect([62, 94], g("E", 6)), { attachedTo: "bed5" }),
        room("family", "Family lounge", "family-lounge", rect(g("A", 4), [48, 88.5])),
        room("bed6", "Bedroom 6", "bedroom", rect([22, 88.5], g("B", 6))),
        room("bath6", "Bath 6", "bathroom", rect([40, 88.5], [48, 98]), { attachedTo: "bed6" }),
        room("dressing6", "Dressing 6", "dressing", rect([40, 98], g("C", 6)), { attachedTo: "bed6" }),
      ],
      fixtures: [
        fixture("b3-wc", "wc", [22.375, 44], [2.25, 1.5], "left"),
        fixture("b3-shower", "shower", [25.8, 44.8], [3, 3], "rear"),
        fixture("b3-basin", "basin", [23, 40.2], [1.75, 1.5], "front"),
        fixture("bed3-wardrobe", "wardrobe", [37.8, 30], [2, 8], "right"),
        fixture("d-wardrobe", "wardrobe", [40.2, 28.5], [2, 9], "left"),
        fixture("mb-tub", "bathtub", [40.2, 45.3], [5.5, 2.5], "rear"),
        fixture("mb-wc", "wc", [45.55, 39], [2.25, 1.5], "right"),
        fixture("mb-vanity", "vanity", [40.2, 39.5], [2, 4], "left"),
        fixture("bed4-wardrobe", "wardrobe", [60, 63.8], [8, 2], "rear"),
        fixture("b4-wc", "wc", [67.375, 66.5], [2.25, 1.5], "right"),
        fixture("b4-shower", "shower", [66.6, 70.8], [3, 3], "right"),
        fixture("b4-vanity", "vanity", [58, 71.8], [4, 2], "rear"),
        fixture("d5-wardrobe", "wardrobe", [56.2, 95], [2, 10], "left"),
        fixture("b5-wc", "wc", [67.375, 99], [2.25, 1.5], "right"),
        fixture("b5-tub", "bathtub", [62.2, 103.1], [5.5, 2.5], "rear"),
        fixture("b5-vanity", "vanity", [67.625, 94.6], [2, 3.5], "right"),
        fixture("d6-wardrobe", "wardrobe", [40.2, 103.6], [7.6, 2], "rear"),
        fixture("b6-wc", "wc", [45.55, 89], [2.25, 1.5], "right"),
        fixture("b6-shower", "shower", [44.8, 94.8], [3, 3], "rear"),
        fixture("b6-basin", "basin", [41, 96.3], [1.75, 1.5], "rear"),
      ],
      stairs: [{ id: "stair", ...stair, to: "roof" }],
    },
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 9,
      slab: { outline: outset(firstWalls, EXT / 2), voids: [{ id: "stairwell", kind: "stair", outline: stairwell }] },
      walls: chain("mumty", mumty, { closed: true, kind: "exterior", ...charcoal }),
      openings: [door("roof-door", "mumty-4", 0.6, { opensTo: "right" })],
      rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
      parapets: [{ id: "parapet", path: firstWalls, ...charcoal }],
      tanks: [
        { id: "tank-1", x: 58.5, y: 60, w: 5, d: 5, height: 5, ...charcoal },
        { id: "tank-2", x: 58.5, y: 67, w: 5, d: 5, height: 5, ...charcoal },
      ],
    },
    {
      id: "top",
      name: "Stair room roof",
      kind: "roof",
      height: 1,
      slab: { outline: outset(mumty, EXT / 2) },
    },
  ]),
  site: {
    boundary: {
      // The white base: the wall above it is panels in `boundary`, because its finish changes every few feet
      height: BOUNDARY_BASE,
      material: "plaster-white",
      // Each gate runs from pier to pier, so the white base stops at the piers' outer faces and never
      // shows at their foot. The renderer insets a leaf 8" from its ends, so both openings meet inside
      // the middle pier and the leaves end hidden in the piers
      gates: [
        { id: "car-gate", side: "front", offset: 42.6, width: 22.8, kind: "vehicle", height: BOUNDARY_TOP, posts: false },
        { id: "front-gate", side: "front", offset: 36, width: 6.6, kind: "pedestrian", height: BOUNDARY_TOP, posts: false },
      ],
    },
    porches: [{ id: "porch", outline: rect([40, 9.5], [70.375, 27.625]) }],
    driveways: [{ id: "drive", outline: rect([44, 0.75], [64, 9.5]) }],
    lawns: [
      { id: "lawn", outline: [[0.75, 0.75], [37.5, 0.75], [37.5, 27.25], [21.25, 27.25], [21.25, 105.5], [0.75, 105.5]] },
    ],
    paving: [
      { id: "front-path", outline: rect([38, 0.75], [42, 9.5]) },
      { id: "side-passage", outline: rect([70.375, 9.5], [74.25, 106.375]) },
      { id: "rear-yard", outline: rect([0.75, 106.375], [74.25, 119.25]) },
    ],
    planting: [
      { id: "tree-1", kind: "tree", at: [5, 5], size: 8 },
      { id: "tree-2", kind: "tree", at: [10, 20], size: 8 },
      { id: "tree-3", kind: "tree", at: [6, 96], size: 8 },
      { id: "palm-1", kind: "palm", at: [5, 45], size: 5 },
      { id: "palm-2", kind: "palm", at: [5, 85], size: 5 },
      ...[13.5, 16, 18.5, 21].map((x, i) => ({ id: `lattice-shrub-${i + 1}`, kind: "shrub" as const, at: [x, 2.2] as [number, number], size: 2.2 })),
      { id: "shrub-1", kind: "shrub", at: [3, 60], size: 3 },
      { id: "shrub-2", kind: "shrub", at: [35, 24], size: 3 },
      // Two plants in dark pots on the terrace: at its front corner by the bedroom box, and beside the sliding door
      { id: "pot-terrace-corner", kind: "pot", at: [42.6, 13.4], size: 2.5, level: "first" },
      { id: "pot-terrace-door", kind: "pot", at: [66.6, 25.6], size: 2.5, level: "first" },
    ],
  },
  facade: [
    // Granite columns under the porch beam
    { id: "porch-column-a", type: "box", level: "ground", role: "column", x: 40.375, y: 11, w: 0.75, d: 1.5, z: -PLINTH, h: 10.6, material: "granite-black" },
    { id: "porch-column-b", type: "box", level: "ground", role: "column", x: 69.625, y: 11, w: 0.75, d: 1.5, z: -PLINTH, h: 10.6, material: "granite-black" },
    ...repeat("fin", 11, [23.5, 24.2], [38.5, 24.2], { level: "first", role: "fin", w: 0.25, d: 0.6, z: 0, h: 10.5, material: "metal-dark" }),
    // Vertical fins in front of the double-height window wall
    ...repeat("side-fin", 9, [21.2, 50], [21.2, 72], { level: "ground", role: "fin", w: 0.6, d: 0.25, z: 0, h: doubleHeight, material: "metal-dark" }),
    // Glass on all three open sides of the terrace, from the bedroom box's wall round to the house wall
    { id: "terrace-rail", type: "railing", level: "first", role: "balustrade", path: [[40.45, 25], [40.45, 11.25], [70.125, 11.25], [70.125, 27.625]], z: 0, h: 3.5, material: "glass-tinted" },
    { id: "void-rail", type: "railing", level: "first", role: "balustrade", path: [[22.4, 52.1], [43.9, 52.1], [43.9, 73.9], [22.4, 73.9]], z: 0, h: 3.5, material: "glass-clear" },
    ...house,
    ...boundary,
  ],
});
