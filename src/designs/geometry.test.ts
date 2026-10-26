import { describe, expect, it } from "vitest";
import {
  coveredArea,
  outlineProblem,
  pointInRegion,
  poleOfInaccessibility,
  regionArea,
  roomGeometry,
  slabRegion,
  splitWall,
  stairLayout,
  wallFrame,
  wallsRegion,
} from "./geometry.ts";
import { chain, door, rect, room, win } from "./helpers.ts";
import { Design, Level, Opening, Room, Slab, Stair, Wall } from "./model.ts";

const W = (input: Parameters<typeof Wall.parse>[0]) => Wall.parse(input);

describe("splitWall", () => {
  // A 30 ft front wall joined by 9-inch side walls at both ends
  const host = W({ id: "front", a: [0, 0], b: [30, 0], thickness: 0.75, kind: "exterior" });
  const sides = [
    W({ id: "left", a: [0, 0], b: [0, 20], thickness: 0.75, kind: "exterior" }),
    W({ id: "right", a: [30, 0], b: [30, 20], thickness: 0.75, kind: "exterior" }),
  ];
  const frame = wallFrame(host, [host, ...sides]);
  const openings = [
    win("w2", "front", 20, 6),
    door("d1", "front", 12),
    win("w1", "front", 3, 4),
  ].map((o) => Opening.parse(o));
  const segments = splitWall(frame, openings, 2, 10.5);

  it("runs into the walls it joins", () => {
    expect(frame.extA).toBe(0.375);
    expect(frame.extB).toBe(0.375);
  });

  it("splits into solid pieces, sills under windows and lintels over every opening", () => {
    const summary = segments.map((s) => [s.part, s.opening ?? "", s.from[0], s.to[0], s.bottom, s.top]);
    expect(summary).toEqual([
      ["solid", "", -0.375, 3, 2, 12.5],
      ["sill", "w1", 3, 7, 2, 5],
      ["lintel", "w1", 3, 7, 10, 12.5],
      ["solid", "", 7, 12, 2, 12.5],
      ["lintel", "d1", 12, 15, 10, 12.5],
      ["solid", "", 15, 20, 2, 12.5],
      ["sill", "w2", 20, 26, 2, 5],
      ["lintel", "w2", 20, 26, 10, 12.5],
      ["solid", "", 26, 30.375, 2, 12.5],
    ]);
  });

  it("leaves no lintel when an opening reaches the slab", () => {
    const tall = Opening.parse(win("tall", "front", 5, 10, { sill: 0, height: 10.5 }));
    expect(splitWall(frame, [tall], 0, 10.5).map((s) => s.part)).toEqual(["solid", "solid"]);
  });
});

describe("rooms", () => {
  const L = Room.parse(room("l", "L lounge", "lounge", [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]]));

  it("measures an L-shaped room", () => {
    const geo = roomGeometry(L, []);
    expect(geo.area).toBeCloseTo(300);
    expect([geo.bounds.w, geo.bounds.d]).toEqual([20, 20]);
  });

  it("labels an L-shaped room inside its widest part", () => {
    const geo = roomGeometry(L, []);
    const [x, y] = geo.labelAt;
    expect(pointInRegion(geo.labelAt, geo.clear)).toBe(true);
    // The largest circle in this L touches both outer edges and the inner corner, at about (5.86, 5.86)
    expect(x).toBeCloseTo(5.86, 0);
    expect(y).toBeCloseTo(5.86, 0);
  });

  it("measures clear sizes inside the walls", () => {
    const level = Level.parse({
      id: "g",
      name: "G",
      kind: "floor",
      elevation: 0,
      height: 11,
      slab: { outline: rect([-1, -1], [11, 11]) },
      walls: chain("w", [[0, 0], [10, 0], [10, 10], [0, 10]], { closed: true, kind: "exterior" }),
    });
    const geo = roomGeometry(Room.parse(room("r", "Room", "bedroom", rect([0, 0], [10, 10]))), wallsRegion(level));
    expect(geo.bounds.w).toBeCloseTo(9.25);
    expect(geo.bounds.d).toBeCloseTo(9.25);
    expect(geo.area).toBeCloseTo(9.25 * 9.25);
  });

  it("rejects outlines that do not close", () => {
    expect(outlineProblem([[0, 0], [10, 0]])).toMatch(/at least 3/);
    expect(outlineProblem([[0, 0], [10, 0], [20, 0]])).toMatch(/no area/);
    expect(outlineProblem([[0, 0], [10, 10], [10, 0], [0, 10]])).toMatch(/crosses itself/);
    expect(outlineProblem([[0, 0], [10, 0], [10, 10], [0, 0]])).toBeNull();
  });
});

describe("slabs", () => {
  const slab = Slab.parse({
    outline: rect([0, 0], [40, 50]),
    voids: [
      { id: "stair", kind: "stair", outline: rect([0, 0], [8, 14]) },
      { id: "lounge", kind: "double-height", outline: rect([20, 20], [40, 40]) },
    ],
  });

  it("cuts voids out of a slab", () => {
    expect(regionArea(slabRegion(slab))).toBeCloseTo(2000 - 112 - 400);
    expect(regionArea(slabRegion(slab, ["double-height"]))).toBeCloseTo(2000 - 400);
  });

  it("counts covered area under higher slabs, without double-height voids", () => {
    const level = (id: string, outline: [number, number][], s = {}) =>
      ({ id, name: id, kind: "floor", elevation: 0, height: 11, slab: { outline, ...s } }) as const;
    const design = Design.parse({
      slug: "t",
      name: "T",
      kind: "house",
      plot: { width: 50, depth: 90 },
      grid: { x: [0, 40], y: [0, 50] },
      site: { boundary: {} },
      levels: [
        level("ground", rect([0, 0], [40, 50])),
        // First floor: smaller, with a double-height void over part of the ground floor
        level("first", rect([0, 0], [40, 40]), { voids: [{ id: "v", kind: "double-height", outline: rect([20, 20], [40, 40]) }] }),
        { ...level("roof", rect([0, 0], [40, 40])), kind: "roof" },
      ],
    });
    // Ground: only the part under the first-floor slab outline (the void is still roofed higher up)
    expect(coveredArea(design, 0)).toBeCloseTo(1600);
    expect(coveredArea(design, 1)).toBeCloseTo(1600 - 400);
    expect(coveredArea(design, 2)).toBeCloseTo(0);
  });
});

describe("stairLayout", () => {
  it("fits a dog-leg stair of 7-inch risers into its outline", () => {
    const stair = Stair.parse({ id: "s", type: "dog-leg", x: 10, y: 20, w: 7.5, d: 14, to: "first", up: "rear" });
    const layout = stairLayout(stair, 11);
    expect(layout.risers).toBe(19);
    expect(layout.riser * 12).toBeLessThanOrEqual(7);
    // Every tread and the landing stays inside the stair outline
    for (const { rect: [x, y, w, d] } of layout.steps) {
      expect(x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(x + w).toBeLessThanOrEqual(17.5 + 1e-9);
      expect(y + d).toBeLessThanOrEqual(34 + 1e-9);
    }
    // The last step reaches one riser below the floor above
    expect(layout.steps.at(-1)!.top).toBeCloseTo(11 - layout.riser);
    expect(layout.tread * 12).toBeGreaterThanOrEqual(10);
  });
});
