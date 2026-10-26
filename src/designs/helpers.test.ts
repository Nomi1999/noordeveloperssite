import { describe, expect, it } from "vitest";
import { chain, door, EXT, INT, makeGrid, outset, rect, stack, wall, win } from "./helpers.ts";
import { dims, feetInches, plotSize, sqft } from "./units.ts";

describe("feetInches", () => {
  it.each([
    [16.5, `16'-6"`],
    [9.75, `9'-9"`],
    [0.5, `0'-6"`],
    [50, `50'-0"`],
    [13.4375, `13'-5"`],
    [11.99, `12'-0"`],
    [0, `0'-0"`],
  ])("%s ft → %s", (feet, shown) => {
    expect(feetInches(feet)).toBe(shown);
  });

  it("formats room sizes and areas", () => {
    expect(dims(12, 14.25)).toBe(`12'-0" × 14'-3"`);
    expect(sqft(1234.4)).toBe("1,234 sq ft");
  });

  it("names plot sizes in kanal and marla", () => {
    expect(plotSize(50 * 90)).toBe("1 Kanal");
    expect(plotSize(75 * 120)).toBe("2 Kanal");
    expect(plotSize(2250)).toBe("10 Marla");
  });
});

describe("authoring helpers", () => {
  const G = makeGrid([0, 14, 28], [10, 25]);

  it("resolves grid references, with nudges", () => {
    expect(G.g("B", 2)).toEqual([14, 25]);
    expect(G.g("C", 1, -2, 0.5)).toEqual([26, 10.5]);
    expect(() => G.g("D", 1)).toThrow(/No grid line D/);
  });

  it("gives walls standard thicknesses by kind", () => {
    expect(wall("w", G.g("A", 1), G.g("B", 1))).toMatchObject({ kind: "interior", thickness: INT });
    expect(wall("w", G.g("A", 1), G.g("B", 1), { kind: "exterior" }).thickness).toBe(EXT);
    expect(wall("w", G.g("A", 1), G.g("B", 1), { thickness: 1 }).thickness).toBe(1);
  });

  it("chains walls through points", () => {
    const walls = chain("out", [G.g("A", 1), G.g("C", 1), G.g("C", 2)], { closed: true, kind: "exterior" });
    expect(walls.map((w) => w.id)).toEqual(["out-1", "out-2", "out-3"]);
    expect(walls[2]).toMatchObject({ a: [28, 25], b: [0, 10] });
  });

  it("fills standard door and window sizes", () => {
    expect(door("d", "w", 2)).toMatchObject({ type: "door", width: 3, height: 8, offset: 2 });
    expect(win("x", "w", 2, 6)).toMatchObject({ type: "window", width: 6, sill: 3, height: 5 });
  });

  it("builds rectangles and grows them to wall faces", () => {
    expect(rect([5, 8], [1, 2])).toEqual([[1, 2], [5, 2], [5, 8], [1, 8]]);
    const grown = outset(rect([0, 0], [10, 10]), 0.375);
    expect(Math.min(...grown.map((p) => p[0]))).toBeCloseTo(-0.375);
    expect(Math.max(...grown.map((p) => p[1]))).toBeCloseTo(10.375);
  });

  it("stacks level elevations", () => {
    const slab = { outline: rect([0, 0], [10, 10]) };
    const levels = stack(2, [
      { id: "g", name: "G", kind: "floor", height: 11, slab },
      { id: "f", name: "F", kind: "floor", height: 10.5, slab },
      { id: "r", name: "R", kind: "roof", height: 9, slab },
    ]);
    expect(levels.map((l) => l.elevation)).toEqual([2, 13, 23.5]);
  });
});
