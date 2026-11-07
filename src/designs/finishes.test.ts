import { describe, expect, it } from "vitest";
import { BOUNDARY_BASE, boundaryKit, cladding, downlightDots, facePoint, finishKit, ledLines, sconces, slatRun, stoneTile, tileJoints, washLights, withDots, type Face } from "./helpers.ts";

const wall: Face = { level: "ground", from: [0, 0], to: [10, 0], z: 0, h: 8 };
const side: Face = { level: "ground", from: [5, 0], to: [5, 10], z: 0, h: 8 };

const span = (p: { path: number[][] }) => [p.path[0][0], p.path[1][0]];

describe("finish helpers", () => {
  it("measures outward to the right of the face's direction", () => {
    expect(facePoint(wall, 3, 0.5)).toEqual([3, -0.5]);
    expect(facePoint(side, 3, 0.5)).toEqual([5.5, 3]);
    const slant: Face = { ...wall, to: [10, 10] };
    const [x, y] = facePoint(slant, Math.SQRT2 * 5, Math.SQRT2);
    expect(x).toBeCloseTo(6);
    expect(y).toBeCloseTo(4);
  });

  it("covers a whole face with one panel when it has no holes", () => {
    const [panel, ...rest] = cladding("c", wall, "travertine");
    expect(rest).toHaveLength(0);
    expect(span(panel)).toEqual([0, 10]);
    expect(panel).toMatchObject({ z: 0, h: 8, plan: false, role: "cladding", material: "travertine" });
  });

  it("leaves a window clear: sides, sill and head", () => {
    const panels = cladding("c", wall, "travertine", { holes: [{ s0: 2, s1: 6, z0: 3, z1: 7 }] });
    expect(panels).toHaveLength(4);
    const area = panels.reduce((sum, p) => sum + Math.abs(span(p)[1] - span(p)[0]) * p.h, 0);
    expect(area).toBeCloseTo(10 * 8 - 4 * 4);
  });

  it("spaces tile joints from the left end and base, and stops them at holes", () => {
    const plain = tileJoints("t", wall, { width: 3, height: 3 });
    expect(plain.filter((p) => p.h > 1)).toHaveLength(3); // at 3, 6 and 9 along
    expect(plain.filter((p) => p.h < 1)).toHaveLength(2); // at 3 and 6 up
    const holed = tileJoints("t", wall, { width: 3, height: 3, holes: [{ s0: 2, s1: 7, z0: 2, z1: 5 }] });
    // The joints at 3 and 6 along are split above and below the hole, and the one at 3 up either side of it
    expect(holed).toHaveLength(2 * 2 + 1 + 2 + 1);
    expect(holed.every((p) => p.role === "reveal")).toBe(true);
  });

  it("centres slats along the face on a backing board", () => {
    const [backing, ...slats] = slatRun("s", { ...wall, to: [4.2, 0] }, { width: 0.25, gap: 0.17 });
    expect(backing).toMatchObject({ id: "s-backing", role: "cladding" });
    expect(slats).toHaveLength(10);
    const [first, last] = [span(slats[0])[0], span(slats[9])[1]];
    expect(first).toBeCloseTo(4.2 - last);
    expect(slats.every((p) => p.material === "wood-slat" && p.role === "slat")).toBe(true);
  });

  it("places LED lines, sconces and wash lights where it is told", () => {
    const leds = ledLines("l", wall, [1, 2]);
    expect(leds.map((p) => span(p)[0])).toEqual([0.97, 1.97]);
    expect(leds[0]).toMatchObject({ h: 8, role: "led", material: "led-strip" });
    const [sconce] = sconces("s", wall, [[4, 6]]);
    expect(sconce.z).toBeCloseTo(6 - 0.35);
    expect(sconce).toMatchObject({ h: 0.7, role: "sconce" });
    expect(span(sconce)).toEqual([3.65, 4.35]);
    const [wash] = washLights("w", wall, [4], 7.5);
    expect(wash).toMatchObject({ z: 7.45, h: 0.05, role: "wash" });
  });

  it("measures a finish kit's heights above the road, from the design's plinth", () => {
    const { above, face, hole, box } = finishKit(2);
    expect(above(13)).toBe(11);
    expect(face([0, 0], [5, 0], 0, 13)).toMatchObject({ level: "ground", z: -2, h: 13 });
    expect(hole(1, 3, 3, 10)).toEqual({ s0: 1, s1: 3, z0: 1, z1: 8 });
    expect(box("b", "beam", "plaster-white", [1, 2], [4, 3], 10, 13)).toMatchObject({ x: 1, y: 2, w: 3, d: 1, z: 8, h: 3, plan: false });
  });

  it("puts tile joints on stone tile, stopping at holes", () => {
    const panels = stoneTile("t", wall, 3, 3, [{ s0: 2, s1: 7, z0: 2, z1: 5 }]);
    expect(panels.filter((p) => p.role === "cladding").every((p) => p.material === "stone-tile-grey")).toBe(true);
    expect(panels.some((p) => p.role === "reveal")).toBe(true);
  });

  it("spaces a soffit's dots as the renderer spaces its lights: one per 2.2 m", () => {
    const soffit = finishKit(2).box("s", "soffit", "wood-slat", [0, 0], [14.4, 7.2], 12, 12.1);
    const dots = downlightDots(soffit);
    expect(dots).toHaveLength(2 * 1);
    expect(dots[0]).toMatchObject({ id: "s-dot-1", role: "led", material: "led-strip", plan: false });
    expect(withDots(soffit)).toHaveLength(3);
  });

  it("stands boundary panels inside the plot line, on the base, along each edge", () => {
    const kit = boundaryKit<"front" | "right">(2, { front: [[0, 0], [75, 0]], right: [[75, 0], [75, 120]] });
    const front = kit.run("front", 0, 10, BOUNDARY_BASE, 7);
    expect(front.from[1]).toBeCloseTo(0.22);
    expect(front).toMatchObject({ z: BOUNDARY_BASE - 2, h: 7 - BOUNDARY_BASE });
    expect(kit.run("right", 0, 10, BOUNDARY_BASE, 7).from[0]).toBeCloseTo(74.78);

    const slats = kit.hoodedSlats("h", "front", 0, 7);
    expect(slats.map((p) => p.role)).toEqual(expect.arrayContaining(["slat", "cladding", "wash"]));
    expect(kit.stoneWall("w", "front", 7, 26).some((p) => p.role === "reveal")).toBe(true);
  });
});
