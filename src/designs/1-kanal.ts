/**
 * 1 Kanal house: 50' × 90' plot, double storey. The hero building.
 *
 * Ground: front lawn, 2-car porch under the cantilevered terrace slab, foyer,
 * drawing room with guest bath, dining, TV lounge with the dog-leg stair,
 * kitchen and back kitchen, elders' bedroom with bath, servant room with bath.
 * First: master suite (dressing, bath, terrace over the porch), three more
 * bedrooms with baths, family lounge. Roof: stair room, water tanks, parapet.
 */
import {
  chain,
  defineDesign,
  door,
  EXT,
  fixture,
  gap,
  int,
  makeGrid,
  outset,
  PLINTH,
  rect,
  repeat,
  room,
  SLAB,
  stack,
  STOREY,
  win,
} from "./helpers.ts";

const G = makeGrid([5, 21, 29, 45], [22, 40, 58, 76]);
const { g } = G;

/** Ventilator: a small high window for bathrooms */
const vent = (id: string, host: string, offset: number) => win(id, host, offset, 2, { sill: 6, height: 2 });
/** Tall front glazing, head in line with the doors */
const tall = { sill: 1, height: 7 };

const stair = { type: "dog-leg", x: 37.125, y: 40.25, w: 7.5, d: 14, up: "front", firstFlight: "right" } as const;
const stairwell = rect([stair.x, stair.y], [stair.x + stair.w, stair.y + stair.d]);

// Ground floor footprint, outer faces of the 9" walls
const groundOutline = outset(rect(g("A", 1), g("D", 4)), EXT / 2);
// First floor: the front-left bedroom box projects 3' over the lawn
const firstWalls: [number, number][] = [[5, 19], [21, 19], [21, 22], [45, 22], [45, 76], [5, 76]];
const firstOutline = outset(firstWalls, EXT / 2);
const bay = rect([4.625, 18.625], [21.375, 21.625]);
// The terrace slab over the porch, carried as a cantilever off the front wall
const terrace = rect([21.375, 6], [45.375, 21.625]);
const mumty = rect([36.75, 39.625], [45, 58]);

export default defineDesign({
  slug: "1-kanal",
  name: "1 Kanal House",
  kind: "house",
  plot: { width: 50, depth: 90 },
  grid: { x: G.x, y: G.y },
  levels: stack(PLINTH, [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      height: STOREY,
      slab: { outline: groundOutline },
      walls: [
        ...chain("out", [g("A", 1), g("D", 1), g("D", 4), g("A", 4)], { closed: true, kind: "exterior" }),
        int("b1", g("B", 1), g("B", 2)),
        int("c1", g("C", 1), g("C", 2)),
        int("pw-a", [5, 34], [11, 34]),
        int("pw-b", [11, 34], [11, 40]),
        int("eb-a", [38, 33], [45, 33]),
        int("eb-b", [38, 33], [38, 40]),
        int("y2a", g("A", 2), g("B", 2)),
        int("y2b", g("B", 2), g("C", 2)),
        int("y2c", g("C", 2), g("D", 2)),
        int("b2", g("B", 2), g("B", 3)),
        int("y3a", g("A", 3), g("B", 3)),
        int("y3b", g("B", 3), g("D", 3)),
        int("b3", g("B", 3), g("B", 4)),
        int("bk", [21, 66], [31, 66]),
        int("x31", [31, 58], [31, 76]),
        int("sv", [31, 68], [45, 68]),
        int("x38", [38, 68], [38, 76]),
      ],
      openings: [
        // Front (out-1 runs left to right along y = 22)
        win("drawing-front", "out-1", 3, 10, tall),
        door("main-door", "out-1", 18, { type: "double-door", width: 4.5, hinge: "start", opensTo: "left" }),
        win("elders-front", "out-1", 28, 8, tall),
        // Right side (out-2, s = y - 22)
        win("elders-side", "out-2", 3, 6),
        vent("elders-bath-vent", "out-2", 13.5),
        win("stair-light", "out-2", 21, 4, { sill: 4, height: 6 }),
        door("servant-door", "out-2", 38.5, { opensTo: "right", hinge: "end" }),
        win("servant-win", "out-2", 42.4, 2.5),
        vent("servant-bath-vent", "out-2", 50),
        // Rear (out-3, s = 45 - x)
        door("laundry-door", "out-3", 9, { opensTo: "right" }),
        door("back-door", "out-3", 16, { opensTo: "right" }),
        win("back-kitchen-win", "out-3", 20.5, 3, { sill: 3.5, height: 4.5 }),
        win("kitchen-rear", "out-3", 28, 8, { sill: 3.5, height: 4.5 }),
        // Left side (out-4, s = 76 - y)
        win("kitchen-side", "out-4", 6, 6, { sill: 3.5, height: 4.5 }),
        win("dining-side", "out-4", 23, 8, tall),
        vent("powder-vent", "out-4", 37.5),
        win("drawing-side", "out-4", 45, 6),
        // Inside
        door("drawing-door", "b1", 8, { type: "double-door", width: 4.5, opensTo: "right" }),
        door("elders-door", "c1", 13, { opensTo: "left", hinge: "end" }),
        door("powder-door", "pw-b", 2.5, { width: 2.5, opensTo: "right", hinge: "end" }),
        door("elders-bath-door", "eb-b", 4.2, { width: 2.5, opensTo: "left" }),
        gap("foyer-arch", "y2b", 1, 6),
        gap("dining-arch", "b2", 3, 12),
        door("kitchen-door", "y3a", 11, { opensTo: "left", hinge: "end" }),
        door("back-kitchen-door", "b3", 10, { opensTo: "left" }),
        door("store-door", "bk", 6, { width: 2.5, opensTo: "right" }),
        door("laundry-inner", "x31", 12, { opensTo: "left" }),
        door("servant-bath-door", "sv", 8.5, { width: 2.5, opensTo: "left" }),
      ],
      rooms: [
        room("drawing", "Drawing room", "drawing", [[5, 22], [21, 22], [21, 40], [11, 40], [11, 34], [5, 34]]),
        room("powder", "Guest bath", "powder-room", rect([5, 34], [11, 40]), { attachedTo: "drawing" }),
        room("foyer", "Foyer", "foyer", rect(g("B", 1), g("C", 2))),
        room("elders", "Bedroom 1", "bedroom", [[29, 22], [45, 22], [45, 33], [38, 33], [38, 40], [29, 40]]),
        room("elders-bath", "Bath 1", "bathroom", rect([38, 33], [45, 40]), { attachedTo: "elders" }),
        room("dining", "Dining", "dining", rect(g("A", 2), g("B", 3))),
        room("lounge", "TV lounge", "tv-lounge", rect(g("B", 2), g("D", 3))),
        room("kitchen", "Kitchen", "kitchen", rect(g("A", 3), g("B", 4))),
        room("store", "Store", "store", rect([21, 58], [31, 66])),
        room("back-kitchen", "Back kitchen", "back-kitchen", rect([21, 66], [31, 76])),
        room("servant", "Servant room", "servant-room", rect([31, 58], [45, 68])),
        room("laundry", "Laundry", "laundry", rect([31, 68], [38, 76])),
        room("servant-bath", "Servant bath", "bathroom", rect([38, 68], [45, 76]), { attachedTo: "servant" }),
      ],
      fixtures: [
        // Kitchen: L-shaped counter on the left and rear walls
        fixture("k-counter-side", "counter", [5.375, 58.25], [2, 15.375], "left"),
        fixture("k-counter-rear", "counter", [7.375, 73.625], [13.4, 2], "rear"),
        fixture("k-sink", "sink", [5.375, 65.5], [2, 3], "left"),
        fixture("k-hob", "hob", [5.375, 60], [2, 2.5], "left"),
        fixture("bk-counter", "counter", [21.25, 73.625], [4.5, 2], "rear"),
        fixture("bk-sink", "sink", [21.75, 73.625], [2.5, 2], "rear"),
        // Guest bath
        fixture("pw-wc", "wc", [5.375, 37.5], [2.25, 1.5], "left"),
        fixture("pw-basin", "basin", [7.5, 34.25], [1.75, 1.5], "front"),
        // Elders' bath
        fixture("eb-wc", "wc", [42.375, 33.4], [2.25, 1.5], "right"),
        fixture("eb-basin", "basin", [38.25, 33.5], [1.5, 1.75], "left"),
        fixture("eb-shower", "shower", [41.6, 36.8], [3, 3], "right"),
        fixture("elders-wardrobe", "wardrobe", [29.25, 24], [2, 9], "left"),
        // Servant bath
        fixture("sb-wc", "wc", [42, 73.375], [1.5, 2.25], "rear"),
        fixture("sb-basin", "basin", [43.125, 69.5], [1.5, 1.75], "right"),
        fixture("sb-shower", "shower", [38.25, 72.6], [3, 3], "rear"),
        fixture("laundry-counter", "counter", [31.25, 73.625], [6.5, 2], "rear"),
      ],
      stairs: [{ id: "stair", ...stair, to: "first" }],
    },
    {
      id: "first",
      name: "First floor",
      kind: "floor",
      height: STOREY,
      slab: {
        outline: [[4.625, 18.625], [21.375, 18.625], [21.375, 6], [45.375, 6], [45.375, 76.375], [4.625, 76.375]],
        voids: [{ id: "stairwell", kind: "stair", outline: stairwell }],
        cantilevers: [
          { id: "bedroom-box", outline: bay },
          { id: "porch-terrace", outline: terrace },
        ],
      },
      walls: [
        ...chain("f", firstWalls, { closed: true, kind: "exterior" }),
        int("b1", g("B", 1), g("B", 2)),
        int("c1", g("C", 1), g("C", 2)),
        int("dr", [21, 31], [29, 31]),
        int("b2-a", [5, 32], [12, 32]),
        int("b2-b", [12, 32], [12, 40]),
        int("y2", g("A", 2), g("D", 2)),
        int("y3", g("A", 3), g("D", 3)),
        int("b3", g("B", 3), g("B", 4)),
        int("c3", g("C", 3), g("C", 4)),
        int("bb", [21, 67], [29, 67]),
      ],
      openings: [
        win("bed2-front", "f-1", 2, 12, tall),
        door("terrace-door", "f-3", 12, { type: "sliding-door", width: 8 }),
        win("master-side", "f-4", 4, 5),
        win("stair-light", "f-4", 20, 4, { sill: 4, height: 4 }),
        win("bed4-side", "f-4", 42, 6),
        win("bed4-rear", "f-5", 4, 8),
        vent("bath4-vent", "f-5", 19),
        win("bed3-rear", "f-5", 28, 8),
        win("bed3-side", "f-6", 6, 6),
        win("family-side", "f-6", 22, 10, tall),
        vent("bath2-vent", "f-6", 39),
        win("bed2-side", "f-6", 47, 6),
        door("bed2-door", "y2", 9, { opensTo: "left" }),
        door("master-door", "y2", 25, { opensTo: "left", hinge: "end" }),
        door("bed3-door", "y3", 11, { opensTo: "right" }),
        door("bed4-door", "y3", 26, { opensTo: "right", hinge: "end" }),
        door("dressing-door", "c1", 2, { opensTo: "right" }),
        door("master-bath-door", "dr", 2.5, { width: 2.5, opensTo: "left" }),
        door("bath2-door", "b2-b", 1, { width: 2.5, opensTo: "right" }),
        door("bath3-door", "b3", 2, { width: 2.5, opensTo: "left", hinge: "end" }),
        door("bath4-door", "c3", 12, { width: 2.5, opensTo: "right" }),
      ],
      rooms: [
        room("bed2", "Bedroom 2", "bedroom", [[5, 19], [21, 19], [21, 40], [12, 40], [12, 32], [5, 32]]),
        room("bath2", "Bath 2", "bathroom", rect([5, 32], [12, 40]), { attachedTo: "bed2" }),
        room("dressing", "Dressing", "dressing", rect(g("B", 1), [29, 31]), { attachedTo: "master" }),
        room("master-bath", "Master bath", "bathroom", rect([21, 31], g("C", 2)), { attachedTo: "dressing" }),
        room("master", "Master bedroom", "master-bedroom", rect(g("C", 1), g("D", 2))),
        room("family", "Family lounge", "family-lounge", rect(g("A", 2), g("D", 3))),
        room("bed3", "Bedroom 3", "bedroom", rect(g("A", 3), g("B", 4))),
        room("bath3", "Bath 3", "bathroom", rect(g("B", 3), [29, 67]), { attachedTo: "bed3" }),
        room("bath4", "Bath 4", "bathroom", rect([21, 67], g("C", 4)), { attachedTo: "bed4" }),
        room("bed4", "Bedroom 4", "bedroom", rect(g("C", 3), g("D", 4))),
        room("terrace", "Terrace", "terrace", rect([21.375, 6], [45, 22]), { floor: "paving-stone" }),
      ],
      fixtures: [
        fixture("b2-wc", "wc", [5.375, 36], [2.25, 1.5], "left"),
        fixture("b2-basin", "basin", [7, 38.125], [1.75, 1.5], "rear"),
        fixture("b2-shower", "shower", [8.6, 32.2], [3.2, 3], "front"),
        fixture("b2-wardrobe", "wardrobe", [19, 23], [2, 8], "right"),
        fixture("dr-wardrobe-a", "wardrobe", [21.25, 22.4], [2, 8.4], "left"),
        fixture("dr-wardrobe-b", "wardrobe", [26.8, 25.5], [2, 5.3], "right"),
        fixture("mb-tub", "bathtub", [21.25, 37.25], [5.5, 2.5], "rear"),
        fixture("mb-wc", "wc", [27.15, 33.5], [1.6, 2.25], "right"),
        fixture("mb-vanity", "vanity", [21.25, 31.25], [2, 4], "left"),
        fixture("m-wardrobe", "wardrobe", [29.25, 32], [2, 7.75], "left"),
        fixture("b3-wc", "wc", [26.5, 64.5], [2.25, 1.5], "right"),
        fixture("b3-basin", "basin", [23, 58.25], [1.75, 1.5], "front"),
        fixture("b3-shower", "shower", [21.25, 63.75], [3, 3], "left"),
        fixture("b3-wardrobe", "wardrobe", [5.375, 60], [2, 8], "left"),
        fixture("b4-wc", "wc", [21.25, 73.25], [2.25, 1.5], "left"),
        fixture("b4-basin", "basin", [23.5, 74.1], [1.75, 1.5], "rear"),
        fixture("b4-shower", "shower", [25.6, 67.25], [3.2, 3], "right"),
        fixture("b4-wardrobe", "wardrobe", [37, 58.25], [7.5, 2], "front"),
      ],
      stairs: [{ id: "stair", ...stair, to: "roof" }],
    },
    {
      id: "roof",
      name: "Roof",
      kind: "roof",
      height: 9,
      slab: { outline: firstOutline, voids: [{ id: "stairwell", kind: "stair", outline: stairwell }] },
      walls: chain("mumty", mumty, { closed: true, kind: "exterior", material: "plaster-warm-grey" }),
      openings: [door("roof-door", "mumty-4", 0.6, { opensTo: "right" })],
      rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
      parapets: [{ id: "parapet", path: firstWalls }],
      tanks: [
        { id: "tank-1", x: 29.5, y: 43, w: 5, d: 5, height: 5 },
        { id: "tank-2", x: 29.5, y: 50, w: 5, d: 5, height: 5 },
      ],
    },
    {
      id: "top",
      name: "Stair room roof",
      kind: "roof",
      height: 1,
      slab: { outline: outset(mumty, EXT / 2), thickness: SLAB },
    },
  ]),
  site: {
    boundary: {
      gates: [
        { id: "car-gate", side: "front", offset: 25, width: 16, kind: "vehicle" },
        { id: "side-gate", side: "front", offset: 45.6, width: 3.5, kind: "pedestrian" },
      ],
    },
    porches: [{ id: "porch", outline: rect([21.375, 3.5], [45.375, 21.625]) }],
    driveways: [{ id: "drive", outline: rect([24.5, 0.75], [41.5, 3.5]) }],
    lawns: [{ id: "front-lawn", outline: rect([0.75, 0.75], [20.5, 18.25]) }],
    paving: [
      { id: "side-passage", outline: rect([45.375, 0.75], [49.25, 89.25]) },
      { id: "rear-yard", outline: rect([0.75, 76.375], [45.375, 89.25]) },
      { id: "left-passage", outline: rect([0.75, 18.25], [4.625, 76.375]) },
    ],
    planting: [
      { id: "tree-1", kind: "tree", at: [4, 4], size: 6 },
      { id: "tree-2", kind: "tree", at: [16.5, 4], size: 6 },
      { id: "palm-1", kind: "palm", at: [19, 15.5], size: 4 },
      { id: "hedge-1", kind: "hedge", at: [10.5, 1.75], size: 2 },
      { id: "shrub-1", kind: "shrub", at: [2.75, 13], size: 3 },
      { id: "shrub-2", kind: "shrub", at: [47.25, 84], size: 3 },
    ],
  },
  facade: [
    // Stone-clad pier rising from the porch to the parapet beside the entrance
    { id: "stone-pier", type: "box", level: "ground", role: "cladding", x: 21.375, y: 20.625, w: 2, d: 1, z: 0, h: 25.5, material: "stone-cladding" },
    // Wood soffits under the porch slab and the projecting bedroom box
    { id: "porch-soffit", type: "box", level: "ground", role: "soffit", x: 23.375, y: 6, w: 22, d: 15.625, z: 10.4, h: 0.1, material: "wood-panel" },
    { id: "box-soffit", type: "box", level: "ground", role: "soffit", x: 4.625, y: 18.625, w: 16.75, d: 3, z: 10.4, h: 0.1, material: "wood-panel" },
    // Deep slab edge band wrapping the porch canopy
    { id: "canopy-band", type: "box", level: "first", role: "slab-edge", x: 21.375, y: 6, w: 24, d: 0.5, z: -0.5, h: 1.25, material: "exposed-concrete" },
    // Slender metal fins in front of the first-floor bedroom glazing
    ...repeat("fin", 9, [6.5, 18.2], [19.5, 18.2], { level: "first", role: "fin", w: 0.25, d: 0.6, z: 0, h: 10.5, material: "metal-dark" }),
    // Glass balustrade around the terrace
    { id: "terrace-rail", type: "railing", level: "first", role: "balustrade", path: [[23.5, 6.25], [45.125, 6.25], [45.125, 21.5]], z: 0, h: 3.5, material: "glass-clear" },
  ],
});
