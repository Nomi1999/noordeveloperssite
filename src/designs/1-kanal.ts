/**
 * 1 Kanal house: a five-sided corner plot of about 5,000 sq ft, double storey. The hero building.
 *
 * Ground: porch, double-height stair lobby, drawing room with powder room, dining,
 * kitchen and raw kitchen, TV lounge, two bedrooms with baths.
 * First: three bedrooms with baths, TV lounge with kitchenette, study, four terraces.
 * Roof: parapet and hidden tanks. No stair room: an outdoor stair climbs from the terrace.
 */
import {
  cladding,
  defineDesign,
  door,
  EXT,
  ext,
  facePoint,
  fixture,
  gap,
  int,
  ledLines,
  makeGrid,
  outset,
  rect,
  room,
  sconces,
  slatRun,
  stack,
  tileJoints,
  washLights,
  win,
  type Face,
  type FacadeInput,
  type Hole,
  type WallInput,
} from "./helpers.ts";
import type { Pt } from "./model.ts";

const PLINTH = 1.5;

const sand = { material: "plaster-sand" } as const;
const stone = { material: "stone-tile-grey" } as const;
const travertine = { material: "travertine" } as const;
const beige = { material: "tile-beige" } as const;

const G = makeGrid([3.75, 20.5, 35.05, 50.55], [29.35, 45.75, 64.45, 84.2]);

/** A 9" wall between rooms */
const thick = (id: string, a: Pt, b: Pt, options: Partial<WallInput> = {}) => int(id, a, b, { thickness: EXT, ...options });
/** Ventilator: a small high window for bathrooms and the raw kitchen */
const vent = (id: string, host: string, offset: number, width = 2) => win(id, host, offset, width, { sill: 6.5, height: 2 });
/** Tall glazing, head in line with the doors */
const tall = { sill: 1, height: 7 };
/** Sill-to-soffit glazing on the first floor */
const full = { sill: 0.75, height: 9 };

/** Ground floor wall centrelines, going around the outside */
const groundRing: Pt[] = [
  [3.75, 29.35], [20.5, 29.35], [20.5, 22.05], [29.25, 22.05], [29.25, 15.4], [35.05, 15.4], [35.05, 17.35],
  [51.75, 17.35], [51.75, 37.05], [50.55, 37.05], [50.55, 45.75], [45.35, 45.75], [45.35, 64.45], [48.15, 64.45],
  [48.15, 73.45], [47.25, 73.45], [47.25, 84.2], [3.75, 84.2],
];
const groundOutline = outset(groundRing, EXT / 2);

// The main stair climbs from the lobby: its first flight starts under the first floor, before the stairwell
const stair = { type: "dog-leg", x: 38.8, y: 37.425, w: 11.375, d: 7.95, up: "right", firstFlight: "right", extraRun: 3.925 } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);

/** The first floor's slab, with the terraces it carries over the porch and the side passages */
const firstOutline: Pt[] = [
  [0, 15.025], [20.875, 15.025], [20.875, 21.675], [28.875, 21.675], [28.875, 15.025], [35.425, 15.025], [35.425, 16.975],
  [52.125, 16.975], [52.125, 37.425], [50.925, 37.425], [50.925, 46.125], [47.8, 46.125], [47.8, 64.075], [48.525, 64.075],
  [48.525, 73.825], [47.625, 73.825], [47.625, 84.575], [3.375, 84.575], [3.375, 61.4], [0, 61.4], [0, 45.3], [3.375, 45.3],
  [3.375, 31.375], [0, 31.375],
];
const porchSlab: Pt[] = [
  [0, 15.025], [20.875, 15.025], [20.875, 21.675], [20.125, 21.675], [20.125, 28.975], [3.375, 28.975], [3.375, 31.375], [0, 31.375],
];

// Open over the stair lobby. The notch at its front right links the passage to the door in the hollow pier
const lobbyVoid: Pt[] = [[20.875, 22.425], [32, 22.425], [32, 25], [34.8, 25], [34.8, 40.4], [20.875, 40.4]];

/** The roof over the first floor's rooms, without the terraces */
const roofOutline: Pt[] = [
  [0, 22.825], [20.125, 22.825], [20.125, 21.675], [28.875, 21.675], [28.875, 15.025], [35.425, 15.025], [35.425, 21.675],
  [49.625, 21.675], [49.625, 36.675], [50.925, 36.675], [50.925, 46.125], [40.825, 46.125], [40.825, 64.075], [48.525, 64.075],
  [48.525, 73.825], [47.625, 73.825], [47.625, 84.575], [3.375, 84.575], [3.375, 60.7], [10.425, 60.7], [10.425, 46.125],
  [3.375, 46.125], [3.375, 31.375], [0, 31.375],
];

// ---- Finishes ----
// Every height here is above the road, so the numbers read straight against the elevations.

/** Height of the boundary's white base */
const BASE = 1.1;
const above = (height: number) => height - PLINTH;

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
/** The grey stone tile, with its joints */
const stoneTile = (id: string, f: Face, width: number, height: number, holes: Hole[] = []) => [
  ...cladding(id, f, "stone-tile-grey", { holes }),
  ...tileJoints(`${id}-joint`, f, { width, height, holes }),
];
/** The bright dots of a soffit's downlights, spaced as the renderer spaces the lights themselves: one per 2.2 m */
const downlightDots = (soffit: FacadeInput): FacadeInput[] => {
  if (soffit.type !== "box") return [];
  const count = (length: number) => Math.max(1, Math.round((length * 0.3048) / 2.2));
  const [nx, ny] = [count(soffit.w), count(soffit.d)];
  return Array.from({ length: nx * ny }, (_, k) => {
    const [i, j] = [k % nx, Math.floor(k / nx)];
    const [x, y] = [soffit.x + ((i + 0.5) * soffit.w) / nx, soffit.y + ((j + 0.5) * soffit.d) / ny];
    return { id: `${soffit.id}-dot-${k + 1}`, type: "box", level: "ground", role: "led", material: "led-strip", x: x - 0.12, y: y - 0.12, w: 0.24, d: 0.24, z: soffit.z - 0.02, h: 0.02, plan: false };
  });
};
/** A horizontal LED line */
const ledEdge = (id: string, f: Face): FacadeInput => ({ ...cladding(id, f, "led-strip", { depth: 0.03 })[0], id, role: "led" });

const withDots = (soffit: FacadeInput) => [soffit, ...downlightDots(soffit)];

const pierFront = face([28.875, 15.025], [35.425, 15.025], 0, 24);
const entrance = face([20.125, 21.675], [28.875, 21.675], 0, 24);
const entranceX = (x: number) => x - 20.125;
const feature = (x0: number, x1: number, top: number) => face([x0, 22.825], [x1, 22.825], 13.5, top);
const drawingFront = face([35.425, 16.975], [52.125, 16.975], 0, 13.5);
const drawingSide = face([52.125, 16.975], [52.125, 37.425], 0, 13.5);
const studySide = face([49.625, 21.675], [49.625, 36.675], 13.5, 26);
const mass1 = face([50.925, 36.675], [50.925, 46.125], 0, 28.5);
const mass2 = face([48.525, 64.075], [48.525, 73.825], 0, 28);
const recessGround = face([45.725, 46.125], [45.725, 64.075], 0, 13);
const recessFirst = face([40.825, 46.125], [40.825, 64.075], 13.5, 28);
const rearBlock = face([47.625, 73.825], [47.625, 84.575], 0, 28);

const house: FacadeInput[] = [
  // The stone pier, with its LED lines and a joint every 2'-8"
  ...stoneTile("pier-front", pierFront, 99, 2.7),
  ...ledLines("pier-led", pierFront, [0.4, 1, 5.6, 6.2]),
  ...stoneTile("pier-left", face([28.875, 21.675], [28.875, 15.025], 0, 24), 99, 2.7),
  ...stoneTile("pier-right-low", face([35.425, 15.025], [35.425, 16.975], 0, 13.5), 99, 2.7),
  ...stoneTile("pier-right-high", face([35.425, 15.025], [35.425, 21.675], 13.5, 24), 99, 2.7, [hole(2.975, 6.175, 13.5, 21.5)]),

  // The upper roof: a charcoal fascia over a wood soffit
  box("fascia-upper", "fascia", "plaster-charcoal", [20.5, 18], [52, 36.7], 26, 28.5),
  box("soffit-upper-hidden", "trim", "wood-slat", [20.5, 18], [35.425, 21.675], 25.9, 26),
  ...withDots(box("soffit-upper-front", "soffit", "wood-slat", [35.425, 18], [52, 21.675], 25.9, 26)),
  ...withDots(box("soffit-upper-side", "soffit", "wood-slat", [49.625, 21.675], [52, 36.7], 25.9, 26)),
  ...cladding("band-behind-canopy", face([20.125, 21.675], [35.425, 21.675], 24, 26), "travertine"),

  // The lower canopy over the entrance and pier
  // Stands just proud of the roof slab it wraps, so the two surfaces never coincide
  box("canopy", "fascia", "plaster-charcoal", [14.5, 15], [35.45, 22.825], 24, 25.04),
  ...withDots(box("soffit-canopy-terrace", "soffit", "wood-slat", [14.5, 15.1], [20.875, 22.7], 23.9, 24)),
  ...withDots(box("soffit-canopy-entrance", "soffit", "wood-slat", [20.875, 15.1], [28.875, 21.6], 23.9, 24)),
  ledEdge("canopy-led-front", face([14.5, 15.025], [35.425, 15.025], 24.45, 24.55)),
  ledEdge("canopy-led-side", face([14.5, 22.825], [14.5, 15.025], 24.45, 24.55)),

  // The entrance: a beige tile panel, and tall wood stiles with slits of dark glass over the door and strip window
  ...cladding("entrance-tile", entrance, "tile-beige"),
  ...tileJoints("entrance-joint", entrance, { width: 99, height: 5.5 }),
  ...cladding("entrance-dark", face([22, 21.675], [27, 21.675], 1.5, 21.5), "metal-dark", { out: 0.08, depth: 0.02 }),
  ...[[22.3, 23.5], [23.7, 24.4], [24.6, 25.3], [25.5, 26.7]].flatMap(([x0, x1], i) =>
    cladding(`entrance-stile-${i + 1}`, face([x0, 21.675], [x1, 21.675], 1.5, 21.5), "wood-slat", { out: 0.1, depth: 0.05 }),
  ),
  ...cladding("entrance-transom", face([22, 21.675], [27, 21.675], 12.9, 13.2), "metal-dark", { out: 0.15, depth: 0.03 }),
  ...[24.5, 24.8].flatMap((x, i) => cladding(`entrance-handle-${i + 1}`, face([x - 0.04, 21.675], [x + 0.04, 21.675], 3.5, 9), "metal-dark", { out: 0.15, depth: 0.06 })),
  ...sconces("entrance-sconce", entrance, [[entranceX(21), above(7)], [entranceX(27.95), above(7)], [entranceX(21), above(18.5)], [entranceX(27.95), above(18.5)]]),
  ...washLights("entrance-wash", entrance, [entranceX(22.2), entranceX(24.5), entranceX(26.8)], above(23.85)),
  ...cladding("lobby-tile", face([20.125, 28.975], [20.125, 21.675], 0, 13), "tile-beige", { holes: [hole(0.775, 5.775, 2.5, 12)] }),
  ...sconces("lobby-sconce", face([20.125, 28.975], [20.125, 21.675], 0, 13), [[6.5, above(8)]]),

  // The porch: a white beam on granite columns, a bronze tile wall and a veined marble panel
  box("beam-front", "beam", "plaster-white", [0.02, 15.025], [20.875, 15.6], 11.1, 13.48),
  box("beam-left", "beam", "plaster-white", [0.02, 15.025], [0.75, 31.375], 11.1, 13.48),
  box("beam-right", "beam", "plaster-white", [20.1, 15.025], [20.875, 21.675], 11.1, 13.48),
  ...withDots(box("porch-ceiling", "soffit", "plaster-white", [0.75, 15.6], [20.1, 28.975], 12.9, 13.01)),
  ...cladding("porch-marble", face([0.75, 16.5], [0.75, 28.2], 0, 11.1), "marble-bronze", { depth: 0.05 }),
  ...cladding("porch-tile", face([3.375, 28.975], [20.125, 28.975], 0, 13), "tile-bronze"),
  ...tileJoints("porch-joint", face([3.375, 28.975], [20.125, 28.975], 0, 13), { width: 3.35, height: 3.25 }),

  // The feature wall on the first floor: black panel with LEDs, wood slats, dark glass and a lit hood
  ...cladding("feature-black", feature(0.02, 4.6, 28.5), "plaster-charcoal"),
  ...ledLines("feature-led", feature(0.02, 4.6, 28.5), [1.95, 2.6]),
  ...slatRun("feature-slat-a", feature(4.6, 10.7, 28)),
  ...cladding("feature-glass-back", feature(10.7, 13.6, 28), "plaster-charcoal", { depth: 0.05 }),
  ...cladding("feature-glass", feature(10.7, 13.6, 28), "glass-tinted", { out: 0.05, depth: 0.02 }),
  ...slatRun("feature-slat-b", feature(13.6, 20.125, 28)),
  box("feature-hood", "hood", "metal-dark", [7.2, 21.3], [15.9, 22.8], 21.5, 22),
  ...washLights("feature-wash", feature(0, 20.125, 28), [7.9, 9.2, 10.3, 14.1, 15.2], above(21.45), 0.35),

  // The drawing room block in plain stone, with its wall lights and the lit slat panel on the side
  ...cladding("drawing-front", drawingFront, "travertine", { holes: [hole(2.975, 12.975, 2.5, 10.5)] }),
  ...sconces("drawing-sconce", drawingFront, [[1.575, above(8)], [14.375, above(8)]]),
  ...cladding("drawing-side", drawingSide, "travertine"),
  ...cladding("drawing-rear", face([52.125, 37.425], [50.925, 37.425], 0, 13.5), "travertine"),
  ...sconces("drawing-side-sconce", drawingSide, [[5.025, above(8)], [17.025, above(8)]]),
  ...slatRun("drawing-slat", face([52.125, 24.8], [52.125, 32.5], 1.5, 12), { out: 0.08 }),
  ledEdge("drawing-slat-led", face([52.125, 24.8], [52.125, 32.5], 12, 12.08)),
  ...washLights("drawing-wash", face([52.125, 24.8], [52.125, 32.5], 1.5, 12), [0.9, 2.5, 4.1, 5.7, 7.3], above(11.95), 0.3),

  // The study under the soffit
  ...cladding("study-front", face([35.425, 21.675], [49.625, 21.675], 13.5, 24), "travertine", { holes: [hole(0.075, 13.375, 14.25, 23.25)] }),
  // The wall between the two panes reads as one wide mullion, so the glass runs on as in the renders
  ...cladding("study-mullion", face([38.7, 21.675], [39.6, 21.675], 14.25, 23.25), "metal-dark", { depth: 0.05 }),
  ...cladding("study-band", face([35.425, 21.675], [49.625, 21.675], 24, 26), "travertine"),
  ...cladding("study-side", studySide, "travertine", { holes: [hole(0.775, 10.775, 14.25, 23.25)] }),
  ...sconces("study-sconce", studySide, [[12.325, above(19)]]),
  ...washLights("study-wash", studySide, [2.3, 4.8, 7.3, 9.8, 12.3], above(25.85)),

  // The first stone mass on the side, as high as the fascia
  ...cladding("mass1-front", face([49.625, 36.675], [50.925, 36.675], 13.5, 28.5), "stone-tile-grey"),
  ...stoneTile("mass1-side", mass1, 3.5, 3.5, [hole(1.425, 3.925, 1.5, 7.5)]),
  ...ledLines("mass1-led", mass1, [7.825]),
  ...stoneTile("mass1-rear-high", face([50.925, 46.125], [40.825, 46.125], 13.5, 28.5), 3.5, 3.5),
  ...stoneTile("mass1-rear-low", face([50.925, 46.125], [45.725, 46.125], 0, 13.5), 3.5, 3.5),

  // The recess between the masses: plain stone walls, a stone band under the terrace and a black pergola
  ...cladding("recess-ground", recessGround, "travertine", { holes: [hole(1.975, 15.975, 2.5, 9.5)] }),
  ...cladding("recess-ground-frame", face([45.725, 47.7], [45.725, 62.5], 2.1, 9.9), "stone-tile-grey", { out: 0.08, depth: 0.1, holes: [hole(0.4, 14.4, 2.5, 9.5)] }),
  ...cladding("recess-first", recessFirst, "travertine", { holes: [hole(1.875, 15.975, 14.5, 21.5)] }),
  box("recess-band", "cladding", "stone-tile-grey", [45.725, 46.125], [47.8, 64.075], 11, 13),
  ...cladding("recess-band-edge", face([47.8, 46.125], [47.8, 64.075], 13, 13.48), "stone-tile-grey"),
  ...washLights("recess-ground-wash", recessGround, [2.4, 5.9, 9.4, 12.9, 16.4], above(10.95)),
  ...washLights("recess-first-wash", recessFirst, [2.9, 6.4, 9.9, 13.4, 16.9], above(23.9)),
  ...[41.5, 43, 44.5, 46, 47.5].map((x, i) => box(`pergola-long-${i + 1}`, "lattice", "metal-dark", [x - 0.1, 46.125], [x + 0.1, 64.075], 24, 25)),
  ...Array.from({ length: 11 }, (_, i) => box(`pergola-cross-${i + 1}`, "lattice", "metal-dark", [40.825, 47 + i * 1.6 - 0.1], [47.8, 47 + i * 1.6 + 0.1], 24.3, 24.7)),

  // The second stone mass, and the plain rear block with its slot windows
  ...stoneTile("mass2-side", mass2, 3.25, 3.5),
  ...ledLines("mass2-led", mass2, [1.925, 7.425]),
  ...stoneTile("mass2-front-high", face([40.825, 64.075], [48.525, 64.075], 13.5, 28), 3.25, 3.5),
  ...stoneTile("mass2-front-low", face([45.725, 64.075], [48.525, 64.075], 0, 13.5), 3.25, 3.5),
  ...cladding("rear-jog", face([48.525, 73.825], [47.625, 73.825], 0, 28), "plaster-sand"),
  ...cladding("rear-block", rearBlock, "plaster-sand", { holes: [hole(3.975, 5.975, 18.5, 22)] }),
  ...cladding("rear-slot", face([47.625, 77.8], [47.625, 79.8], 5, 8), "glass-tinted", { out: 0.08, depth: 0.02 }),
  ...cladding("rear-slot-back", face([47.625, 77.8], [47.625, 79.8], 5, 8), "plaster-charcoal", { out: 0.04, depth: 0.04 }),
];

// ---- The boundary above its base ----

/** The plot's edges in outline order, so each runs left to right as seen from the street */
const EDGE = {
  front: [[0, 0], [52.77, 0]],
  corner: [[52.77, 0], [59.21, 7]],
  right: [[59.21, 7], [52.23, 89.97]],
  rear: [[52.23, 89.97], [0, 90]],
  left: [[0, 90], [0, 0]],
} satisfies Record<string, [Pt, Pt]>;
type Edge = keyof typeof EDGE;

/** How far the stone stands inside the plot line, so the white base shows at its foot */
const INSET = 0.22;
/** How far the slats sit behind the hood above them */
const SLAT_INSET = 0.45;
const WALL_THICK = 0.3;
const TOP = 7;

const run = (edge: Edge, s0: number, s1: number, z0: number, z1: number, inset = INSET): Face => {
  const line: Face = { level: "ground", from: EDGE[edge][0], to: EDGE[edge][1], z: 0, h: 1 };
  return face(facePoint(line, s0, -inset), facePoint(line, s1, -inset), z0, z1);
};
const inWall = { out: -WALL_THICK, depth: WALL_THICK };

/** Stone tile wall on one edge: `holes` are measured from the start of this stretch */
const stoneWall = (id: string, edge: Edge, s0: number, s1: number, holes: Hole[] = []) => {
  const f = run(edge, s0, s1, BASE, TOP);
  return [...cladding(id, f, "stone-tile-grey", { ...inWall, holes }), ...tileJoints(`${id}-joint`, f, { width: 5.5, height: 2.95, holes, out: 0 })];
};
/** A run of slats set back under a dark hood with hidden lights */
const hoodedSlats = (id: string, edge: Edge, s0: number, s1: number) => {
  const slats = run(edge, s0, s1, BASE, 5.4, SLAT_INSET);
  const count = Math.round((s1 - s0) / 1.8);
  const lights = Array.from({ length: count }, (_, i) => ((i + 0.5) * (s1 - s0)) / count);
  return [
    ...slatRun(id, slats, { out: -0.05 }),
    ...cladding(`${id}-hood`, run(edge, s0, s1, 5.4, TOP, 0.02), "plaster-charcoal", { out: -SLAT_INSET, depth: SLAT_INSET }),
    ...washLights(`${id}-wash`, slats, lights, above(5.35)),
  ];
};
const timberDoor = (id: string, f: Face) => slatRun(id, f, { width: 0.14, gap: 0.05, depth: 0.05, out: -0.1 });
const wallLights = (id: string, edge: Edge, at: number[]) => sconces(id, run(edge, 0, 90, BASE, TOP), at.map((s): [number, number] => [s, above(4.6)]), -0.1);

const boundary: FacadeInput[] = [
  // Front, left to right from the vehicle entrance
  ...cladding("boundary-front-black", run("front", 20, 21.6, BASE, TOP), "plaster-charcoal", inWall),
  ...cladding("boundary-front-plate", run("front", 21.6, 23.7, BASE, TOP), "tile-bronze", inWall),
  ...stoneWall("boundary-front-stone", "front", 23.7, 51, [hole(6.5, 10.8, BASE, 6.7), hole(15.1, 23.6, BASE, 3.5)]),
  ...timberDoor("boundary-front-door", run("front", 30.2, 34.5, BASE, 6.7)),
  ...[1.6, 2.2, 2.8, 3.4].map((z, i) => ({ ...cladding(`boundary-front-lattice-rail-${i + 1}`, run("front", 38.8, 47.3, z - 0.03, z + 0.03), "metal-dark", { out: -0.15, depth: 0.05 })[0], role: "lattice" })),
  ...Array.from({ length: 15 }, (_, i) => {
    const x = 38.8 + (8.5 * (i + 0.5)) / 15;
    return { ...cladding(`boundary-front-lattice-bar-${i + 1}`, run("front", x - 0.03, x + 0.03, BASE, 3.5), "metal-dark", { out: -0.15, depth: 0.05 })[0], role: "lattice" };
  }),
  ...wallLights("boundary-front-sconce", "front", [26.5, 36.5, 50]),
  // The lit slats turn the cut corner
  ...hoodedSlats("boundary-front-slat", "front", 51, 52.77),
  ...hoodedSlats("boundary-corner-slat", "corner", 0, 9.51),
  ...hoodedSlats("boundary-right-slat-a", "right", 0, 6),
  // Right, from the corner to the rear
  ...stoneWall("boundary-right-stone-a", "right", 6, 22),
  ...hoodedSlats("boundary-right-slat-b", "right", 22, 34),
  ...stoneWall("boundary-right-stone-b", "right", 34, 45),
  ...cladding("boundary-right-door-panel", run("right", 45, 53, BASE, TOP), "plaster-sand", { ...inWall, holes: [hole(2.2, 5.7, BASE, 6.7)] }),
  ...timberDoor("boundary-right-door", run("right", 47.2, 50.7, BASE, 6.7)),
  ...stoneWall("boundary-right-stone-c", "right", 53, 63),
  ...hoodedSlats("boundary-right-slat-c", "right", 63, 72),
  ...stoneWall("boundary-right-stone-d", "right", 72, 83.26),
  ...wallLights("boundary-right-sconce", "right", [9, 19, 36.5, 42.5, 55.5, 60.5, 74.5, 80]),
  // The neighbours' sides in plain plaster
  ...cladding("boundary-rear-wall", run("rear", 0, 52.2, BASE, TOP), "plaster-warm-grey", inWall),
  ...cladding("boundary-left-wall", run("left", 0, 88.5, BASE, TOP), "plaster-warm-grey", inWall),
  // The base carries on under the two doors in every shot, whatever is hidden
  box("sill-front-door", "kerb", "plaster-white", [30.2, 0], [34.5, 0.4], 0, BASE),
];

export default defineDesign({
  slug: "1-kanal",
  name: "1 Kanal House",
  kind: "house",
  plot: {
    width: 59.21,
    depth: 90,
    outline: [[0, 0], [52.77, 0], [59.21, 7], [52.23, 89.97], [0, 90]],
    label: "1 Kanal",
  },
  grid: { x: G.x, y: G.y, column: [EXT, EXT], omit: ["A1", "C1", "D1", "B3", "C4"] },
  levels: stack(PLINTH, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: 12,
      slab: { outline: groundOutline },
      walls: [
        // Outside, from the left side round to the porch
        ext("left", [3.75, 29.35], [3.75, 84.2], sand),
        ext("rear", [3.75, 84.2], [47.25, 84.2], sand),
        ext("rear-side", [47.25, 73.45], [47.25, 84.2], sand),
        ext("rear-jog", [47.25, 73.45], [48.15, 73.45]),
        ext("dress-side", [48.15, 64.45], [48.15, 73.45]),
        ext("lounge-rear-out", [45.35, 64.45], [48.15, 64.45]),
        ext("lounge-side", [45.35, 45.75], [45.35, 64.45], travertine),
        ext("stair-rear", [45.35, 45.75], [50.55, 45.75]),
        ext("stair-side", [50.55, 37.05], [50.55, 45.75], stone),
        ext("drawing-jog", [50.55, 37.05], [51.75, 37.05]),
        ext("drawing-side", [51.75, 17.35], [51.75, 37.05]),
        ext("drawing-front", [35.05, 17.35], [51.75, 17.35], travertine),
        ext("powder-side-out", [35.05, 15.4], [35.05, 17.35]),
        ext("powder-front", [29.25, 15.4], [35.05, 15.4]),
        ext("powder-side", [29.25, 15.4], [29.25, 22.05]),
        ext("entrance", [20.5, 22.05], [29.25, 22.05]),
        ext("lobby-side", [20.5, 22.05], [20.5, 29.35], beige),
        ext("dining-front", [3.75, 29.35], [20.5, 29.35]),
        // Inside
        thick("lobby-rear-b", [32.2, 45.75], [45.35, 45.75]),
        int("lobby-rear-a", [20.5, 45.75], [32.2, 45.75]),
        thick("lounge-rear", [23.85, 64.45], [45.35, 64.45]),
        thick("stair-front", [35.05, 37.05], [50.55, 37.05]),
        thick("drawing-wall", [35.05, 17.35], [35.05, 37.05]),
        thick("powder-rear", [29.25, 22.05], [35.05, 22.05]),
        thick("dining-wall", [20.5, 29.35], [20.5, 45.75]),
        thick("dining-rear", [3.75, 41.85], [20.5, 41.85]),
        thick("kitchen-jog", [17.6, 45.75], [20.5, 45.75]),
        int("kitchen-wall", [17.6, 45.75], [17.6, 54.35]),
        thick("kitchen-rear", [3.75, 54.35], [17.6, 54.35]),
        int("raw-rear", [3.75, 60.9], [17.6, 60.9]),
        thick("bath-wall", [17.6, 54.35], [17.6, 69.45]),
        thick("bath-rear", [3.75, 69.45], [23.85, 69.45]),
        thick("bed-wall", [23.85, 64.45], [23.85, 84.2]),
        int("dress-wall", [39.2, 64.45], [39.2, 84.2]),
        int("basin-a", [44.9, 73.35], [47.25, 73.35]),
        int("basin-b", [44.9, 79.55], [47.25, 79.55]),
        // Under the stair landing, only as high as the landing allows
        int("under-stair", [46.4, 37.05], [46.4, 45.75], { height: 6.2 }),
        int("wr-rear", [46.4, 41.7], [50.55, 41.7], { height: 6.2 }),
      ],
      openings: [
        win("dining-side", "left", 2.35, 7.8, tall),
        win("kitchen-side", "left", 15.65, 6, { sill: 3.5, height: 4.5 }),
        door("raw-door", "left", 25.75, { width: 2.9, opensTo: "right" }),
        vent("raw-vent", "left", 29.35, 1.7),
        vent("bath-vent", "left", 32.75),
        win("bed1-side", "left", 42.45, 10, tall),
        win("bed2-rear", "rear", 23.85, 8),
        vent("bath2-vent", "rear", 36.35),
        win("lounge-window", "lounge-side", 2.35, 14, tall),
        door("wr-door", "stair-side", 1.05, { width: 2.5, height: 6, opensTo: "left" }),
        win("drawing-window", "drawing-front", 3.35, 10, { sill: 1, height: 8 }),
        vent("powder-vent", "powder-side-out", 0.4, 1.15),
        door("main-door", "entrance", 1.5, { type: "double-door", width: 5, height: 10, opensTo: "left", material: "wood-panel" }),
        win("lobby-window", "lobby-side", 1.15, 5, { sill: 1, height: 9.5 }),
        door("powder-door", "powder-rear", 2.55, { width: 2.3, opensTo: "right", hinge: "end" }),
        door("drawing-door", "drawing-wall", 11.95, { type: "double-door", width: 4, opensTo: "right" }),
        door("dining-door", "dining-wall", 0.75, { type: "double-door", width: 5, opensTo: "left" }),
        door("lounge-door", "lobby-rear-a", 1.6, { type: "double-door", width: 4, opensTo: "left" }),
        door("kitchen-door", "dining-rear", 13.1, { width: 2.8, opensTo: "right", hinge: "end" }),
        door("kitchen-lounge-door", "kitchen-wall", 2.35, { type: "double-door", width: 4, opensTo: "left" }),
        door("raw-inner-door", "kitchen-rear", 10.15, { width: 2.8, opensTo: "left", hinge: "end" }),
        door("bath-door", "bath-rear", 8.35, { width: 2.8, opensTo: "right", hinge: "end" }),
        door("bed1-door", "bath-rear", 15.85, { width: 3.4, opensTo: "left", hinge: "end" }),
        door("bed2-door", "bed-wall", 0.4, { width: 3.9, opensTo: "right" }),
        door("dress-door", "dress-wall", 2.85, { width: 2.8, opensTo: "right" }),
        door("electrical-door", "under-stair", 5.85, { width: 2, height: 6, opensTo: "left" }),
      ],
      rooms: [
        room("lobby", "Stair lobby", "stair-hall", rect([20.5, 22.05], [34.675, 45.75])),
        room("drawing", "Drawing room", "drawing", rect([35.05, 17.35], [51.75, 37.05])),
        room("powder", "Powder", "powder-room", rect([29.25, 15.4], [35.05, 22.05])),
        room("dining", "Dining room", "dining", rect([3.75, 29.35], [20.5, 41.85])),
        room("kitchen", "Kitchen", "kitchen", rect([3.75, 41.85], [17.225, 54.35])),
        room("kitchen-entry", "Kitchen entry", "corridor", rect([17.225, 41.85], [20.5, 45.75]), { unlabelled: true }),
        room("lounge", "TV lounge", "tv-lounge", [[17.6, 45.75], [45.35, 45.75], [45.35, 64.45], [23.85, 64.45], [23.85, 64.075], [17.6, 64.075]]),
        room("lounge-lobby", "Lobby", "corridor", rect([17.6, 64.075], [23.85, 69.45])),
        room("raw", "Raw kitchen", "back-kitchen", rect([3.75, 54.35], [17.6, 60.9])),
        room("bath1", "Bath 1", "bathroom", rect([3.75, 60.9], [17.6, 69.45]), { attachedTo: "bed1" }),
        room("bed1", "Bedroom 1", "bedroom", rect([3.75, 69.45], [23.85, 84.2])),
        room("bed2", "Bedroom 2", "bedroom", rect([23.85, 64.45], [39.2, 84.2])),
        room("dress2", "Dress", "dressing", rect([39.2, 64.45], [48.15, 73.1]), { attachedTo: "bed2" }),
        room("bath2", "Bath 2", "bathroom", rect([39.2, 73.1], [47.25, 84.2]), { attachedTo: "dress2" }),
        room("electrical", "Electrical", "other", rect([46.4, 41.7], [50.55, 45.75]), { unlabelled: true }),
        room("washroom", "Washroom", "powder-room", rect([46.4, 37.05], [50.55, 41.7]), { unlabelled: true }),
      ],
      fixtures: [
        fixture("k-counter-side", "counter", [4.1, 44.2], [2, 9.8], "left"),
        fixture("k-counter-rear", "counter", [6.1, 42.2], [8.3, 2], "front"),
        fixture("k-sink", "sink", [4.2, 46], [1.8, 4], "left"),
        fixture("k-hob", "hob", [8.2, 42.3], [3, 1.8], "front"),
        fixture("raw-counter", "counter", [4.1, 58.7], [13.1, 2], "rear"),
        fixture("raw-sink", "sink", [4.5, 58.8], [2, 1.8], "rear"),
        fixture("raw-hob", "hob", [8.5, 58.8], [3, 1.8], "rear"),
        fixture("powder-wc", "wc", [31.2, 15.8], [1.6, 2], "front"),
        fixture("powder-basin", "basin", [29.7, 19.4], [1.5, 1.7], "left"),
        fixture("b1-shower", "shower", [4.1, 65.1], [4, 4], "left"),
        fixture("b1-wc", "wc", [4.15, 62.2], [2.2, 1.7], "left"),
        fixture("b1-basin", "basin", [10, 61.2], [2.2, 1.7], "front"),
        fixture("b1-wardrobe", "wardrobe", [15.4, 61.3], [1.7, 7.5], "right"),
        fixture("d2-wardrobe-a", "wardrobe", [46, 65], [1.6, 7.9], "right"),
        fixture("d2-wardrobe-b", "wardrobe", [39.6, 65], [6.4, 1.7], "front"),
        fixture("b2-shower", "shower", [42.9, 79.8], [4, 4], "rear"),
        fixture("b2-wc", "wc", [40.2, 81.8], [1.7, 2], "rear"),
        fixture("b2-basin", "basin", [45, 75.5], [1.8, 2.2], "right"),
        fixture("wr-wc", "wc", [47.2, 37.5], [1.6, 2], "front"),
        fixture("wr-basin", "basin", [48.8, 39.9], [1.4, 1.4], "rear"),
      ],
      stairs: [
        { id: "stair", ...stair, to: "first" },
        { id: "spiral", type: "spiral", x: 9.9, y: 84.6, w: 4.4, d: 4.4, up: "rear", to: "roof", outdoor: true },
      ],
    },
    {
      id: "first",
      name: "First floor",
      kind: "floor",
      height: 11.5,
      slab: {
        outline: firstOutline,
        voids: [
          { id: "stairwell", kind: "stair", outline: stairwell },
          { id: "lobby-void", kind: "double-height", outline: lobbyVoid },
        ],
        cantilevers: [
          { id: "porch-terrace", outline: porchSlab },
          { id: "stair-terrace", outline: rect([0, 45.3], [3.375, 61.4]) },
          { id: "side-terrace", outline: rect([45.725, 46.125], [47.8, 64.075]) },
        ],
      },
      walls: [
        // Outside, on the left and rear
        ext("left-a", [3.75, 31], [3.75, 45.75], sand),
        ext("left-b", [3.75, 60.9], [3.75, 84.2], sand),
        ext("rear", [3.75, 84.2], [47.25, 84.2], sand),
        ext("rear-side", [47.25, 73.45], [47.25, 84.2], sand),
        ext("rear-jog", [47.25, 73.45], [48.15, 73.45]),
        ext("dress-side", [48.15, 64.45], [48.15, 73.45]),
        ext("lounge-rear-out", [40.45, 64.45], [48.15, 64.45]),
        ext("lounge-side", [40.45, 45.75], [40.45, 64.45], travertine),
        ext("stair-rear", [40.45, 45.75], [50.55, 45.75]),
        ext("stair-side", [50.55, 37.05], [50.55, 45.75]),
        ext("stair-jog", [49.25, 37.05], [50.55, 37.05]),
        // Study corner: set back from the drawing room below for the side terrace
        ext("study-side", [49.25, 22.05], [49.25, 37.05], travertine),
        ext("study-front", [35.05, 22.05], [49.25, 22.05], travertine),
        // The hollow stone pier
        ext("pier-left", [29.25, 15.4], [29.25, 22.05]),
        ext("pier-front", [29.25, 15.4], [35.05, 15.4]),
        ext("pier-right", [35.05, 15.4], [35.05, 22.05], stone),
        int("pier-rear", [29.25, 22.05], [35.05, 22.05]),
        ext("lobby-front", [20.5, 22.05], [29.25, 22.05]),
        // The bath and dressing block at the front
        ext("front-block", [0.375, 23.2], [20.5, 23.2]),
        ext("block-side", [0.375, 23.2], [0.375, 31], { material: "plaster-charcoal" }),
        ext("block-rear", [0.375, 31], [3.75, 31]),
        // Around the stair terrace
        ext("terrace-wall", [10.8, 45.75], [10.8, 60.9], sand),
        ext("terrace-rear", [3.75, 60.9], [10.8, 60.9], { thickness: 0.4 }),
        // Inside
        thick("lobby-side", [20.5, 22.05], [20.5, 45.75]),
        thick("lounge-front", [3.75, 45.75], [40.45, 45.75]),
        thick("lounge-rear", [23.85, 64.45], [40.45, 64.45]),
        thick("stair-front", [39.15, 37.05], [49.25, 37.05]),
        thick("study-wall", [39.15, 22.05], [39.15, 37.05]),
        thick("block-wall", [3.75, 31], [20.5, 31]),
        int("dress-wall-f", [11, 23.2], [11, 31]),
        int("shower-stub", [5.05, 23.2], [5.05, 25.6]),
        int("bath-front", [10.8, 60.9], [17.6, 60.9]),
        thick("bath-wall", [17.6, 60.9], [17.6, 69.45]),
        thick("bath-rear", [3.75, 69.45], [23.85, 69.45]),
        thick("bed-wall", [23.85, 64.45], [23.85, 84.2]),
        int("dress-wall", [39.2, 64.45], [39.2, 84.2]),
        int("shower-wall", [7.95, 64.6], [7.95, 69.45]),
      ],
      openings: [
        win("bed3-side", "left-a", 3.4, 8, tall),
        vent("bath3-vent", "left-b", 1.2),
        win("bed4-side", "left-b", 10.9, 10, tall),
        win("master-rear", "rear", 23.85, 8),
        win("master-bath-vent", "rear-side", 4.35, 2, { sill: 5, height: 3.5 }),
        win("lounge-window", "lounge-side", 2.25, 14.1, tall),
        win("study-side-glass", "study-side", 0.4, 10, full),
        win("passage-glass", "study-front", 0.45, 3.2, full),
        win("study-glass", "study-front", 4.55, 9.2, full),
        door("terrace-door", "pier-right", 2.6, { width: 3.2, opensTo: "right", material: "wood-panel" }),
        gap("pier-opening", "pier-rear", 2.75, 2.5),
        win("lobby-strip", "lobby-front", 1.5, 5, { sill: 0, height: 10.5 }),
        vent("block-vent", "block-rear", 0.425, 2.55),
        door("stair-terrace-door", "terrace-wall", 2.75, { type: "sliding-door", width: 9.7 }),
        door("bed3-door", "lobby-side", 19.4, { width: 3.9, opensTo: "left", hinge: "end" }),
        door("lounge-door", "lounge-front", 17.55, { type: "double-door", width: 6, opensTo: "left" }),
        door("study-door", "study-wall", 11.15, { width: 3.4, opensTo: "right", hinge: "end" }),
        gap("dress-gap", "block-wall", 11.35, 2.6),
        door("bath5-door", "dress-wall-f", 4.3, { width: 3.1, opensTo: "left", hinge: "end" }),
        door("bath3-door", "bath-rear", 8.35, { width: 2.8, opensTo: "right", hinge: "end" }),
        door("bed4-door", "bath-rear", 15.85, { width: 3.4, opensTo: "left", hinge: "end" }),
        door("master-door", "bed-wall", 0.4, { width: 3.9, opensTo: "right" }),
        door("master-dress-door", "dress-wall", 2.85, { width: 2.8, opensTo: "right" }),
      ],
      rooms: [
        room("bed3", "Bedroom 3", "bedroom", rect([3.75, 31], [20.5, 45.75])),
        room("dress3", "Dress", "dressing", rect([11, 23.2], [20.5, 31]), { attachedTo: "bed3" }),
        room("bath5", "Bath 3", "bathroom", rect([0.375, 23.2], [11, 31]), { attachedTo: "dress3" }),
        room("bed4", "Bedroom 4", "bedroom", rect([3.75, 69.45], [23.85, 84.2])),
        room("bath3", "Bath 4", "bathroom", rect([3.75, 60.9], [17.6, 69.45]), { attachedTo: "bed4" }),
        room("master", "Master bedroom", "master-bedroom", rect([23.85, 64.45], [39.2, 84.2])),
        room(
          "master-bath",
          "Dress and bath",
          "bathroom",
          [[39.2, 64.45], [48.15, 64.45], [48.15, 73.45], [47.25, 73.45], [47.25, 84.2], [39.2, 84.2]],
          { attachedTo: "master" },
        ),
        room("lobby", "Lobby", "corridor", rect([17.6, 64.075], [23.85, 69.45])),
        room(
          "lounge",
          "TV lounge",
          "family-lounge",
          [[21.3, 45.75], [40.45, 45.75], [40.45, 64.45], [23.85, 64.45], [23.85, 64.075], [17.6, 64.075], [17.6, 60.9], [10.8, 60.9], [10.8, 52], [21.3, 52]],
        ),
        room("kitchenette", "Kitchenette", "other", rect([10.8, 45.75], [21.3, 52])),
        room("study", "Study", "study", rect([39.15, 22.05], [49.25, 37.05])),
        room("passage", "Passage", "corridor", rect([20.5, 40.4], [34.8, 45.75])),
        room("passage-side", "Passage", "corridor", rect([34.8, 22.05], [39.15, 37.05])),
        room("pier-link", "Link", "corridor", rect([32, 22.05], [34.8, 25]), { unlabelled: true }),
        room("stair-hall", "Stair", "stair-hall", rect([34.8, 37.05], [50.55, 45.75]), { unlabelled: true }),
        room("pier", "Pier", "corridor", rect([29.25, 15.4], [35.05, 22.05])),
        room("terrace-left", "Terrace", "terrace", [[0, 15.025], [20.875, 15.025], [20.875, 22.05], [20.5, 22.05], [20.5, 23.2], [0, 23.2]], { floor: "paving-stone" }),
        room(
          "terrace-right",
          "Terrace",
          "terrace",
          [[35.05, 16.975], [52.125, 16.975], [52.125, 36.5], [50.925, 36.5], [50.925, 37.05], [49.25, 37.05], [49.25, 22.05], [35.05, 22.05]],
          { floor: "paving-stone" },
        ),
        room("terrace-stair", "Terrace", "terrace", rect([0.4, 46.125], [10.8, 60.9]), { floor: "paving-stone" }),
        room("terrace-side", "Terrace", "terrace", rect([40.45, 46.125], [47.45, 64.075]), { floor: "paving-stone" }),
      ],
      fixtures: [
        fixture("kn-counter", "counter", [11.2, 46.1], [9.7, 1.9], "front"),
        fixture("kn-sink", "sink", [12, 46.15], [2.2, 1.8], "front"),
        fixture("kn-hob", "hob", [16.8, 46.15], [1.8, 1.8], "front"),
        fixture("electronics-counter", "counter", [11.2, 58.7], [6.8, 2], "rear"),
        fixture("b3-shower", "shower", [4.2, 64.6], [3.5, 4.5], "left"),
        fixture("b3-wc", "wc", [4.15, 62.2], [2.2, 1.7], "left"),
        fixture("b3-basin", "basin", [8.2, 65.5], [1.6, 2.5], "left"),
        fixture("b3-wardrobe", "wardrobe", [15.5, 61.3], [1.6, 7.5], "right"),
        fixture("b5-shower", "shower", [0.8, 23.6], [4, 4], "front"),
        fixture("b5-vanity", "vanity", [5.3, 23.6], [5.5, 2], "front"),
        fixture("b5-wc", "wc", [0.8, 28], [2, 1.8], "left"),
        fixture("d3-wardrobe-a", "wardrobe", [18.3, 23.8], [1.7, 6.6], "right"),
        fixture("d3-wardrobe-b", "wardrobe", [11.3, 23.8], [6.9, 1.6], "front"),
        fixture("mb-shower", "shower", [39.5, 79.8], [7.5, 4], "rear"),
        fixture("mb-wc", "wc", [39.6, 75.2], [2, 1.8], "left"),
        fixture("mb-basin", "basin", [45, 75.5], [1.8, 2.5], "right"),
        fixture("mb-wardrobe-a", "wardrobe", [46, 65], [1.6, 7.9], "right"),
        fixture("mb-wardrobe-b", "wardrobe", [39.6, 65], [6.4, 1.7], "front"),
      ],
      stairs: [
        { id: "roof-stair", type: "l-shaped", x: 0.4, y: 46.1, w: 10, d: 8.3, up: "front", firstFlight: "right", flight: 2.2, to: "roof", outdoor: true },
      ],
    },
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 4,
      slab: { outline: roofOutline },
      parapets: [
        {
          id: "parapet",
          closed: false,
          height: 3,
          material: "plaster-sand",
          path: [
            [0.375, 23.2], [20.5, 23.2], [20.5, 22.05], [49.25, 22.05], [49.25, 37.05], [50.55, 37.05], [50.55, 45.75], [40.45, 45.75],
            [40.45, 64.45], [48.15, 64.45], [48.15, 73.45], [47.25, 73.45], [47.25, 84.2], [14.3, 84.2],
          ],
        },
        { id: "parapet-block", closed: false, height: 3, material: "plaster-charcoal", path: [[0.375, 31], [0.375, 23.2]] },
        { id: "parapet-left", closed: false, height: 3, material: "plaster-sand", path: [[10.8, 46.1], [10.8, 45.75], [3.75, 45.75], [3.75, 31], [0.375, 31]] },
        // Open where the two outdoor stairs arrive
        { id: "parapet-rear", closed: false, height: 3, material: "plaster-sand", path: [[9.9, 84.2], [3.75, 84.2], [3.75, 61.075], [10.8, 61.075], [10.8, 48.3]] },
      ],
      tanks: [
        { id: "tank-1", x: 28, y: 50, w: 2.5, d: 5, height: 2.5 },
        { id: "tank-2", x: 31, y: 50, w: 2.5, d: 5, height: 2.5 },
      ],
    },
  ]),
  site: {
    boundary: {
      thickness: 0.4,
      // The white base: the wall above it is panels in `boundary`, because its finish changes every few feet
      height: BASE,
      material: "plaster-white",
      gates: [
        { id: "car-entrance", side: "front", offset: 1.2, width: 17.5, kind: "vehicle", open: true },
        { id: "front-door", side: "front", offset: 30.2, width: 4.3, kind: "pedestrian", material: "wood-panel", open: true },
        { id: "side-door", side: "right", offset: 47.2, width: 3.5, kind: "pedestrian", material: "wood-panel", open: true },
      ],
    },
    porches: [{ id: "porch", outline: rect([0.4, 15.025], [20.125, 28.975]), cars: 2 }],
    driveways: [{ id: "drive", outline: rect([0.4, 0.4], [28.9, 15]) }],
    lawns: [{ id: "front-lawn", outline: [[28.9, 0.4], [52.6, 0.4], [58.8, 7.1], [57.97, 16.975], [35.425, 16.975], [35.425, 15], [28.9, 15]] }],
    paving: [
      { id: "entry", outline: rect([20.125, 15], [28.875, 21.675]) },
      {
        id: "right-passage",
        outline: [
          [52.125, 17], [57.97, 17], [51.87, 89.58], [47.625, 89.58], [47.625, 73.825], [48.525, 73.825], [48.525, 64.075],
          [45.725, 64.075], [45.725, 46.125], [50.925, 46.125], [50.925, 37.425], [52.125, 37.425],
        ],
      },
      { id: "rear-passage", outline: rect([0.4, 84.575], [47.625, 89.58]) },
      { id: "left-passage", outline: rect([0.4, 28.975], [3.375, 84.575]) },
    ],
    planting: [
      // Fan palms in pots on the terraces
      { id: "pot-terrace", kind: "pot", at: [50.3, 19.3], size: 2.5, level: "first" },
      { id: "pot-side-terrace", kind: "pot", at: [44, 55], size: 2.5, level: "first" },
      // The planted bed behind the front kerb, and along the cut corner
      ...[[32, 12.5], [37, 14.2], [41, 14.2], [45, 14.2], [49, 14.2], [52.5, 13.5]].map(([x, y], i) => ({ id: `bed-shrub-${i + 1}`, kind: "shrub" as const, at: [x, y] as Pt, size: 2.5 })),
      // Seen through the lattice screen
      ...[40, 41.8, 43.6, 45.4].map((x, i) => ({ id: `lattice-shrub-${i + 1}`, kind: "shrub" as const, at: [x, 2.2] as Pt, size: 2.2 })),
      { id: "corner-palm", kind: "palm", at: [54.5, 9.5], size: 2.2 },
    ],
  },
  facade: [
    // Granite columns under the porch beam
    { id: "porch-column-a", type: "box", level: "ground", role: "column", x: 0.05, y: 15, w: 0.7, d: 1.5, z: -PLINTH, h: 12.6, material: "granite-black" },
    { id: "porch-column-b", type: "box", level: "ground", role: "column", x: 0.05, y: 28.2, w: 0.7, d: 1.5, z: -PLINTH, h: 12.6, material: "granite-black" },
    { id: "porch-column-c", type: "box", level: "ground", role: "column", x: 20.1, y: 15.025, w: 0.775, d: 1.5, z: -PLINTH, h: 12.6, material: "granite-black" },
    // The piers of the vehicle entrance
    { id: "boundary-front-pier-a", type: "box", level: "ground", role: "pier", x: 0, y: 0, w: 1.2, d: 1.5, z: -PLINTH, h: 9, material: "granite-black" },
    { id: "boundary-front-pier-b", type: "box", level: "ground", role: "pier", x: 18.7, y: 0, w: 1.3, d: 1.5, z: -PLINTH, h: 9, material: "granite-black" },
    // The thick wall on the left boundary that carries the terrace stair above it
    { id: "stair-carrier", type: "box", level: "ground", role: "carrier", x: 0, y: 45.4, w: 0.8, d: 16.1, z: -PLINTH, h: 13, material: "plaster-sand" },
    // Entrance podium and its two steps
    { id: "podium", type: "box", level: "ground", role: "step", x: 20.9, y: 17, w: 8.0, d: 4.7, z: -0.5, h: 0.52, material: "granite-black" },
    { id: "step-a", type: "box", level: "ground", role: "step", x: 20.9, y: 16.45, w: 8.0, d: 0.55, z: -1, h: 0.5, material: "granite-black" },
    { id: "step-b", type: "box", level: "ground", role: "step", x: 20.9, y: 15.9, w: 8.0, d: 0.55, z: -1.5, h: 0.5, material: "granite-black" },
    // Glass railings around the terraces
    { id: "rail-left", type: "railing", level: "first", role: "balustrade", path: [[0.2, 23.2], [0.2, 15.225], [20.675, 15.225], [20.675, 21.675]], z: 0, h: 3.5, material: "glass-tinted" },
    { id: "rail-right", type: "railing", level: "first", role: "balustrade", path: [[35.425, 17.175], [51.925, 17.175], [51.925, 36.5]], z: 0, h: 3.5, material: "glass-tinted" },
    { id: "rail-side", type: "railing", level: "first", role: "balustrade", path: [[47.6, 46.125], [47.6, 64.075]], z: 0, h: 3.5, material: "glass-tinted" },
    { id: "rail-stair", type: "railing", level: "first", role: "balustrade", path: [[0.2, 54.4], [0.2, 61.2], [3.375, 61.2]], z: 0, h: 3.5, material: "glass-tinted" },
    ...house,
    ...boundary,
  ],
});
