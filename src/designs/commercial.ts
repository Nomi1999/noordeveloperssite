/**
 * Commercial plaza: 50' × 90' commercial plot, ground plus three floors.
 *
 * Ground: three shops with full-height glazed frontage behind a slim canopy
 * band, and an entrance lobby to the offices. Floors 1-3: open-plan offices
 * behind a curtain wall framed by a thick exposed-concrete border. Every floor
 * shares one core: dog-leg stair, lift shaft and two washrooms. Roof: stair
 * room, lift machine room, parapet and water tanks.
 */
import { chain, defineDesign, door, EXT, fixture, gap, int, makeGrid, outset, rect, room, stack, wall, win } from "./helpers.ts";
import type { LevelInput, Pt } from "./model.ts";

const G = makeGrid([0.375, 13.75, 27.125, 40.5, 49.625], [15, 38.5, 62, 84]);
const { g } = G;

const GROUND_HEIGHT = 13;
const OFFICE_HEIGHT = 11.5;

const stair = { type: "dog-leg", x: 41, y: 66.5, w: 8.25, d: 17, up: "rear", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);
// The lift shaft has 9" walls; its void runs through every office floor slab
const liftShaft = rect([34.375, 62.375], [40.125, 68.625]);
const footprint = outset(rect(g("A", 1), g("E", 4)), EXT / 2);
const perimeter = () => chain("out", [g("A", 1), g("E", 1), g("E", 4), g("A", 4)], { closed: true, kind: "exterior" });

/** The core: lift, corridor and two washrooms, the same on every floor */
const coreWalls = () => [
  int("core-front", [27.125, 62], [34, 62]),
  wall("lift-front", [34, 62], [40.5, 62], { thickness: EXT }),
  wall("lift-left", [34, 62], [34, 69], { thickness: EXT }),
  wall("lift-rear", [34, 69], [40.5, 69], { thickness: EXT }),
  int("wash-side", [34, 69], [34, 84]),
  int("wash-split", [27.125, 73], [34, 73]),
];

const coreRooms = () => [
  room("lift", "Lift", "lift", rect([34, 62], [40.5, 69])),
  room("corridor", "Corridor", "corridor", rect([34, 69], [40.5, 84])),
  room("wash-1", "Washroom 1", "washroom", rect([27.125, 62], [34, 73])),
  room("wash-2", "Washroom 2", "washroom", rect([27.125, 73], [34, 84])),
];

const coreOpenings = (coreWall: string, liftAt: number, corridorAt: number) => [
  door("lift-door", coreWall, liftAt, { type: "sliding-door", width: 3.5 }),
  gap("corridor-opening", coreWall, corridorAt, 4),
  door("wash-1-door", "wash-side", 0.5, { opensTo: "right" }),
  door("wash-2-door", "wash-side", 7, { opensTo: "right" }),
];

const washroomFixtures = (): ReturnType<typeof fixture>[] =>
  [62, 73].flatMap((y, i) => [
    fixture(`w${i + 1}-wc-1`, "wc", [27.5, y + 0.6], [2.25, 1.5], "left"),
    fixture(`w${i + 1}-wc-2`, "wc", [27.5, y + 3.6], [2.25, 1.5], "left"),
    fixture(`w${i + 1}-basin-1`, "basin", [31, y + 8.8], [1.75, 1.5], "rear"),
    fixture(`w${i + 1}-basin-2`, "basin", [28.6, y + 8.8], [1.75, 1.5], "rear"),
  ]);

function officeFloor(id: string, name: string, to: string): Omit<LevelInput, "elevation"> {
  const office: Pt[] = [[0.375, 15], [49.625, 15], [49.625, 56], [40.5, 56], [40.5, 62], [27.125, 62], [27.125, 84], [0.375, 84]];
  return {
    id,
    name,
    kind: "floor",
    height: OFFICE_HEIGHT,
    slab: {
      outline: footprint,
      voids: [
        { id: "stairwell", kind: "stair", outline: stairwell },
        { id: "lift-shaft", kind: "shaft", outline: liftShaft },
      ],
    },
    walls: [
      ...perimeter(),
      int("lobby-front", [40.5, 56], [49.625, 56]),
      int("lobby-side", [40.5, 56], g("D", 4)),
      int("office-rear", g("C", 3), g("C", 4)),
      ...coreWalls(),
    ],
    openings: [
      win("curtain-wall", "out-1", 0.6, 48, { sill: 0.25, height: 10.5, material: "glass-tinted" }),
      win("rear-1", "out-3", 24, 10),
      win("rear-2", "out-3", 37, 10),
      door("office-door", "lobby-front", 2, { type: "double-door", width: 5, opensTo: "right" }),
      ...coreOpenings("lobby-side", 7.5, 15),
    ],
    rooms: [
      room("office", "Office", "office", office),
      room("lobby", "Lobby", "stair-hall", rect([40.5, 56], g("E", 4))),
      ...coreRooms(),
    ],
    fixtures: washroomFixtures(),
    stairs: [{ id: "stair", ...stair, to }],
  };
}

export default defineDesign({
  slug: "commercial",
  name: "Commercial Plaza",
  kind: "commercial",
  plot: { width: 50, depth: 90 },
  grid: { x: G.x, y: G.y },
  levels: stack(1, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: GROUND_HEIGHT,
      slab: { outline: footprint },
      walls: [
        ...perimeter(),
        // Party walls between shops are 9"
        wall("shop-1-2", g("B", 1), g("B", 4), { thickness: EXT }),
        wall("shop-2-3", g("C", 1), g("C", 4), { thickness: EXT }),
        int("lobby-side", g("D", 1), g("D", 4)),
        ...coreWalls(),
      ],
      openings: [
        // Full-height shop fronts: glazing and a glass door each (out-1, s = x - 0.375)
        ...[0, 13.375, 26.75].flatMap((s, i) => [
          win(`shop-${i + 1}-glass`, "out-1", s + 0.75, 8.5, { sill: 0, height: 11, material: "glass-clear" }),
          door(`shop-${i + 1}-door`, "out-1", s + 9.4, { width: 3.5, height: 11, opensTo: "left" }),
        ]),
        door("lobby-entrance", "out-1", 42.5, { type: "double-door", width: 5, height: 11, opensTo: "left" }),
        door("shop-1-service", "out-3", 42, { opensTo: "left" }),
        door("shop-2-service", "out-3", 30, { opensTo: "left" }),
        win("wash-2-vent", "out-3", 17.5, 2, { sill: 7, height: 2 }),
        ...coreOpenings("lobby-side", 48.5, 56),
      ],
      rooms: [
        room("shop-1", "Shop 1", "shop", rect(g("A", 1), g("B", 4))),
        room("shop-2", "Shop 2", "shop", rect(g("B", 1), g("C", 4))),
        room("shop-3", "Shop 3", "shop", rect(g("C", 1), g("D", 3))),
        room("lobby", "Entrance lobby", "stair-hall", rect(g("D", 1), g("E", 4))),
        ...coreRooms(),
      ],
      fixtures: washroomFixtures(),
      stairs: [{ id: "stair", ...stair, to: "first" }],
    },
    officeFloor("first", "First floor", "second"),
    officeFloor("second", "Second floor", "third"),
    officeFloor("third", "Third floor", "roof"),
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 10,
      slab: { outline: footprint, voids: [{ id: "stairwell", kind: "stair", outline: stairwell }] },
      walls: [
        ...chain("mumty", rect(g("D", 3), g("E", 4)), { closed: true, kind: "exterior", material: "plaster-warm-grey" }),
        ...chain("machine", [g("D", 3), [34, 62], [34, 69], [40.5, 69]], { kind: "exterior", material: "plaster-warm-grey" }),
      ],
      openings: [
        door("roof-door", "mumty-1", 1, { opensTo: "left" }),
        door("machine-door", "machine-2", 3, { width: 3 }),
      ],
      rooms: [
        room("stair-room", "Stair room", "stair-room", rect(g("D", 3), g("E", 4))),
        room("machine-room", "Lift machine room", "machine-room", rect([34, 62], [40.5, 69])),
      ],
      parapets: [{ id: "parapet", path: rect(g("A", 1), g("E", 4)) }],
      tanks: [
        { id: "tank-1", x: 4, y: 72, w: 6, d: 6, height: 5 },
        { id: "tank-2", x: 12, y: 72, w: 6, d: 6, height: 5 },
      ],
    },
    {
      id: "top",
      name: "Stair room roof",
      kind: "roof",
      height: 1,
      slab: { outline: [[33.625, 61.625], [50, 61.625], [50, 84.375], [40.125, 84.375], [40.125, 69.375], [33.625, 69.375]] },
    },
  ]),
  site: {
    boundary: { sides: ["rear"] },
    paving: [
      { id: "forecourt", outline: rect([0, 0], [50, 14.625]) },
      { id: "service-lane", outline: rect([0, 84.375], [50, 89.25]) },
    ],
    planting: [
      { id: "tree-1", kind: "tree", at: [6, 3], size: 4 },
      { id: "tree-2", kind: "tree", at: [25, 3], size: 4 },
      { id: "tree-3", kind: "tree", at: [44, 3], size: 4 },
    ],
  },
  facade: [
    // Slim canopy band over the shop fronts
    { id: "canopy", type: "box", level: "ground", role: "canopy", x: 0, y: 12.5, w: 50, d: 2.125, z: 11.25, h: 0.75, material: "metal-dark" },
    // Thick exposed-concrete border framing the office curtain wall
    { id: "frame-left", type: "box", level: "first", role: "frame", x: 0, y: 12.5, w: 2, d: 2.125, z: -0.5, h: 38.5, material: "exposed-concrete" },
    { id: "frame-right", type: "box", level: "first", role: "frame", x: 48, y: 12.5, w: 2, d: 2.125, z: -0.5, h: 38.5, material: "exposed-concrete" },
    { id: "frame-top", type: "box", level: "first", role: "frame", x: 2, y: 12.5, w: 46, d: 2.125, z: 33.5, h: 4.5, material: "exposed-concrete" },
    { id: "frame-bottom", type: "box", level: "first", role: "frame", x: 2, y: 12.5, w: 46, d: 2.125, z: -0.5, h: 1.5, material: "exposed-concrete" },
    // Curtain wall mullions
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `mullion-${i + 1}`,
      type: "box" as const,
      level: "first",
      role: "mullion",
      x: 2 + ((i + 1) * 46) / 8 - 0.125,
      y: 14.25,
      w: 0.25,
      d: 0.375,
      z: 1,
      h: 32.5,
      material: "metal-dark" as const,
    })),
  ],
});
