import { describe, expect, it } from "vitest";
import { Design, MATERIALS, type DesignInput } from "./model.ts";

/** A one-room, single-storey design written out by hand, without helpers */
const minimal: DesignInput = {
  slug: "test-box",
  name: "Test box",
  kind: "house",
  plot: { width: 30, depth: 40 },
  grid: { x: [5, 25], y: [10, 30] },
  levels: [
    {
      id: "ground",
      name: "Ground floor",
      kind: "floor",
      elevation: 1.5,
      height: 11,
      slab: { outline: [[4.625, 9.625], [25.375, 9.625], [25.375, 30.375], [4.625, 30.375]] },
      walls: [
        { id: "w1", a: [5, 10], b: [25, 10], thickness: 0.75, kind: "exterior" },
        { id: "w2", a: [25, 10], b: [25, 30], thickness: 0.75, kind: "exterior" },
        { id: "w3", a: [25, 30], b: [5, 30], thickness: 0.75, kind: "exterior" },
        { id: "w4", a: [5, 30], b: [5, 10], thickness: 0.75, kind: "exterior" },
      ],
      openings: [{ id: "d1", wall: "w1", type: "door", offset: 8, width: 3.5, height: 7 }],
      rooms: [{ id: "hall", name: "Hall", type: "lounge", outline: [[5, 10], [25, 10], [25, 30], [5, 30]] }],
    },
  ],
  site: { boundary: {} },
};

describe("Design schema", () => {
  it("parses a minimal hand-written design and fills defaults", () => {
    const design = Design.parse(minimal);
    expect(design.levels[0].slab.thickness).toBe(0.5);
    expect(design.levels[0].walls[0].material).toBe("plaster-white");
    expect(design.levels[0].openings[0].sill).toBe(0);
    expect(design.site.boundary.height).toBe(7);
    expect(design.facade).toEqual([]);
  });

  it("rejects a material outside the vocabulary", () => {
    const bad = structuredClone(minimal);
    (bad.levels[0].walls![0] as { material: string }).material = "marble-gold";
    const result = Design.safeParse(bad);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["levels", 0, "walls", 0, "material"]);
  });

  it("rejects missing required fields and bad ids", () => {
    const bad = structuredClone(minimal) as Record<string, unknown>;
    delete bad.plot;
    expect(Design.safeParse(bad).success).toBe(false);
    const badId = structuredClone(minimal);
    badId.levels[0].id = "Ground Floor";
    expect(Design.safeParse(badId).success).toBe(false);
  });

  it("keeps the material vocabulary fixed", () => {
    expect(MATERIALS).toHaveLength(24);
    expect(MATERIALS).toContain("brick-cladding");
    expect(MATERIALS).toContain("plaster-charcoal");
  });
});
