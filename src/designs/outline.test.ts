/** Plots that are not rectangles, and the stairs and elements that came with them */
import { describe, expect, it } from "vitest";
import { computeFacts } from "./facts.ts";
import { boundaryPieces, plotArea, plotEdges, stairLayout } from "./geometry.ts";
import { Design, Stair, type DesignInput } from "./model.ts";
import { plotDimensions } from "./units.ts";
import { checkDesign } from "./validate.ts";

const OUTLINE: [number, number][] = [[0, 0], [50, 0], [60, 10], [50, 80], [0, 80]];

/** A plain box on a five-sided plot */
const plan = (overrides: Partial<DesignInput> = {}): DesignInput => ({
  slug: "test-corner",
  name: "Test corner",
  kind: "house",
  plot: { width: 60, depth: 80, outline: OUTLINE, label: "1 Kanal" },
  grid: { x: [5, 25], y: [20, 40] },
  levels: [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      elevation: 1.5,
      height: 11,
      slab: { outline: [[4.625, 19.625], [25.375, 19.625], [25.375, 40.375], [4.625, 40.375]] },
      walls: [
        { id: "w1", a: [5, 20], b: [25, 20], thickness: 0.75, kind: "exterior" },
        { id: "w2", a: [25, 20], b: [25, 40], thickness: 0.75, kind: "exterior" },
        { id: "w3", a: [25, 40], b: [5, 40], thickness: 0.75, kind: "exterior" },
        { id: "w4", a: [5, 40], b: [5, 20], thickness: 0.75, kind: "exterior" },
      ],
      openings: [{ id: "d1", wall: "w1", type: "door", offset: 8, width: 3.5, height: 7 }],
      rooms: [{ id: "hall", name: "Hall", type: "lounge", outline: [[5, 20], [25, 20], [25, 40], [5, 40]] }],
    },
  ],
  site: { boundary: {} },
  ...overrides,
});

const stair = (over: Record<string, unknown>) => Stair.parse({ id: "s", x: 10, y: 10, w: 10, d: 8, to: "first", ...over });

describe("Plot outline", () => {
  it("takes its area and size from the outline and label", () => {
    const design = Design.parse(plan());
    // Shoelace by hand: the rectangle 50 × 80, plus the triangle out to (60, 10)
    expect(plotArea(design)).toBeCloseTo(50 * 80 + (80 * 10) / 2, 6);
    const facts = computeFacts(design);
    expect(facts.plot.area).toBeCloseTo(4400, 6);
    expect(facts.plot.size).toBe("1 Kanal");
    expect(facts.plot.minWidth).toBe(50);
  });

  it("is described by its width range, and a rectangle still by width × depth", () => {
    expect(plotDimensions({ width: 59.25, depth: 90, minWidth: 52.25 })).toBe(`52'-3" to 59'-3" wide × 90'-0" deep`);
    expect(plotDimensions({ width: 75, depth: 120 })).toBe(`75'-0" × 120'-0"`);
  });

  it("flags an element in the bounding box but outside the outline", () => {
    const design = plan({
      site: { boundary: {}, paving: [{ id: "pad", outline: [[52, 70], [58, 70], [58, 76], [52, 76]] }] },
    });
    expect(checkDesign(design).errors.some((e) => e.message.includes("outside the plot"))).toBe(true);
  });

  it("refuses an outline that disagrees with the width and depth", () => {
    const { errors } = checkDesign(plan({ plot: { width: 70, depth: 80, outline: OUTLINE } }));
    expect(errors.some((e) => e.element === "plot" && e.message.includes("extents"))).toBe(true);
  });

  it("walks the boundary along its edges, with corners that meet", () => {
    const design = Design.parse(plan());
    const edges = plotEdges(design);
    expect(edges.map((e) => e.edge)).toEqual(["front", "corner", "right", "rear", "left"]);
    // The wall centreline is inset by half its thickness and each edge starts where the last ended
    const t = design.site.boundary.thickness;
    expect(edges[0].a[1]).toBeCloseTo(t / 2, 6);
    for (let i = 0; i < edges.length; i++) expect(edges[i].b).toEqual(edges[(i + 1) % edges.length].a);
    const pieces = boundaryPieces(design);
    expect(new Set(pieces.map((p) => p.side))).toEqual(new Set(["front", "corner", "right", "rear", "left"]));
  });

  it("cuts gates into the edge they name, measured along it", () => {
    const design = Design.parse(
      plan({ site: { boundary: { gates: [{ id: "g", side: "right", offset: 10, width: 4, kind: "pedestrian" }] } } }),
    );
    const right = boundaryPieces(design).filter((p) => p.side === "right");
    expect(right).toHaveLength(2);
    const length = (p: (typeof right)[number]) => Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]);
    expect(length(right[0])).toBeCloseTo(10 + design.site.boundary.thickness / 2, 6);
  });

  it("measures a gate against its edge, not the plot's width", () => {
    // The front edge is 50' long on this 60' wide plot
    const { errors } = checkDesign(plan({ site: { boundary: { gates: [{ id: "g", side: "front", offset: 45, width: 8, kind: "pedestrian" }] } } }));
    expect(errors.some((e) => e.element === 'gate "g"')).toBe(true);
  });
});

describe("Stairs", () => {
  it("lays a sideways dog-leg with a longer first flight beyond its outline", () => {
    const layout = stairLayout(stair({ type: "dog-leg", w: 11.375, d: 7.95, up: "right", firstFlight: "right", extraRun: 3.925 }), 12.5);
    // Every riser is the same, and it rises to the floor above
    expect(layout.riser * layout.risers).toBeCloseTo(12.5, 6);
    const tops = layout.steps.map((s) => s.top);
    expect(tops.at(-1)! + layout.riser).toBeCloseTo(12.5, 6);
    // The first tread starts before the outline, on the x side
    expect(Math.min(...layout.steps.map((s) => s.rect[0]))).toBeCloseTo(10 - 3.925, 6);
    expect(layout.outline).toBeDefined();
    expect(layout.tread).toBeGreaterThanOrEqual(10 / 12);
  });

  it("lays an L-shaped stair around one corner landing", () => {
    const layout = stairLayout(stair({ type: "l-shaped", w: 10, d: 8.3, up: "front", firstFlight: "right", flight: 2.2 }), 11.5);
    expect(layout.riser * layout.risers).toBeCloseTo(11.5, 6);
    expect(layout.tread).toBeGreaterThanOrEqual(10 / 12);
    // Climbing steadily, and stays inside its rectangle
    const tops = layout.steps.map((s) => s.top);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    for (const { rect: [x, y, w, d] } of layout.steps) {
      expect(x).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(y).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(x + w).toBeLessThanOrEqual(20 + 1e-6);
      expect(y + d).toBeLessThanOrEqual(18.3 + 1e-6);
    }
  });

  it("lays a spiral as wedges within its radius, climbing all the way", () => {
    const layout = stairLayout(stair({ type: "spiral", w: 4.4, d: 4.4, up: "rear" }), 24);
    expect(layout.steps).toEqual([]);
    expect(layout.wedges).toHaveLength(layout.risers - 1);
    expect(layout.wedges!.at(-1)!.top + layout.riser).toBeCloseTo(24, 6);
    for (const { outline } of layout.wedges!) {
      for (const [x, y] of outline) expect(Math.hypot(x - 12.2, y - 12.2)).toBeLessThanOrEqual(2.2 + 1e-6);
    }
  });
});

describe("Design vocabulary", () => {
  it("accepts a study, porch cars, a panel, a finish left off the plans and a pot", () => {
    const parsed = Design.parse(
      plan({
        site: {
          boundary: { gates: [{ id: "g", side: "front", offset: 2, width: 16, kind: "vehicle", open: true }] },
          porches: [{ id: "p", outline: [[5, 8], [25, 8], [25, 19], [5, 19]], cars: 2 }],
          planting: [{ id: "pot", kind: "pot", at: [30, 30], size: 2, level: "ground" }],
        },
        facade: [
          { id: "lit", type: "box", level: "ground", role: "sconce", x: 4, y: 25, w: 0.3, d: 0.5, z: 5, h: 1, material: "metal-dark", plan: false },
          { id: "band", type: "panel", level: "ground", role: "boundary", path: [[50.2, 0.2], [59.8, 10]], z: 0, h: 7, material: "stone-tile-grey" },
        ],
      }),
    );
    expect(computeFacts(parsed).porches[0].cars).toBe(2);
    expect(parsed.site.boundary.gates[0].open).toBe(true);
  });

  it("leaves an outdoor stair out of the checks for stairs under a slab", () => {
    const base = plan();
    const withStair = structuredClone(base);
    withStair.levels.push({
      id: "roof",
      name: "Roof",
      kind: "roof",
      elevation: 12.5,
      height: 1,
      slab: { outline: base.levels[0].slab.outline },
      parapets: [{ id: "parapet", path: [[5, 20], [25, 20], [25, 40], [5, 40]] }],
    });
    withStair.levels[0].stairs = [{ id: "spiral", type: "spiral", x: 30, y: 30, w: 4.4, d: 4.4, up: "rear", to: "roof", outdoor: true }];
    expect(checkDesign(withStair).errors).toEqual([]);
  });
});
