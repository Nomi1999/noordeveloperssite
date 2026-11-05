/** Each concept design meets the program in the building-designs spec, checked from computed facts */
import { describe, expect, it } from "vitest";
import { designs, getDesign } from "./index.ts";
import { designSources } from "./sources.ts";
import { checkDesign, formatIssue } from "./validate.ts";

const has = (slug: string, type: string) =>
  getDesign(slug).design.levels.some((l) => l.rooms.some((r) => r.type === type));

/** The centreline of a 9" wall whose outer face is on the plot line */
const w0 = (width: number, side: "left" | "right") => (side === "left" ? 0.375 : width - 0.375);

/** Shoelace area of a closed polygon */
const polygonArea = (poly: [number, number][]) =>
  Math.abs(poly.reduce((sum, [x, y], i) => {
    const [nx, ny] = poly[(i + 1) % poly.length];
    return sum + x * ny - nx * y;
  }, 0)) / 2;

describe("all designs", () => {
  it("validate with no errors or warnings", () => {
    for (const source of designSources) {
      const { errors, warnings } = checkDesign(source);
      expect([...errors, ...warnings].map(formatIssue)).toEqual([]);
    }
  });

  it("have unique slugs", () => {
    const slugs = designs.map((d) => d.design.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(["1-kanal", "2-kanal", "5-marla", "10-marla"]);
  });

  it("are flat-roofed with parapets", () => {
    for (const { facts } of designs) expect(facts.roof.parapet).toBe(true);
  });

  it("are at most two storeys", () => {
    for (const { facts } of designs) expect(facts.storeys).toBeLessThanOrEqual(2);
  });
});

describe("1 Kanal house", () => {
  const { design, facts } = getDesign("1-kanal");

  it("is on a 50' × 90' plot with a ground and first floor, stair room and tanks on the roof", () => {
    expect([design.plot.width, design.plot.depth]).toEqual([50, 90]);
    expect(facts.plot.size).toBe("1 Kanal");
    expect(facts.storeys).toBe(2);
    expect(facts.roof.stairRoom).toBe(true);
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
  });

  it("has at least five bedrooms, each with an attached bathroom", () => {
    expect(facts.bedrooms).toBeGreaterThanOrEqual(5);
    expect(facts.bedroomsWithAttachedBath).toBe(facts.bedrooms);
  });

  it("has a drawing room, dining, TV lounge, kitchen, back kitchen and a servant room with bath", () => {
    for (const type of ["drawing", "dining", "tv-lounge", "kitchen", "back-kitchen", "servant-room"]) {
      expect(has("1-kanal", type), type).toBe(true);
    }
    const servantBath = design.levels.flatMap((l) => l.rooms).find((r) => r.type === "bathroom" && r.attachedTo === "servant");
    expect(servantBath).toBeDefined();
  });

  it("has a covered porch for at least two cars and a front lawn", () => {
    expect(facts.porches.some((p) => p.covered && p.cars >= 2)).toBe(true);
    expect(facts.lawnArea).toBeGreaterThan(0);
  });
});

describe("2 Kanal house", () => {
  const { design, facts } = getDesign("2-kanal");

  it("is on a 75' × 120' plot with the same levels as the 1 Kanal", () => {
    expect([design.plot.width, design.plot.depth]).toEqual([75, 120]);
    expect(facts.plot.size).toBe("2 Kanal");
    expect(facts.storeys).toBe(2);
    expect(facts.roof.stairRoom).toBe(true);
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
  });

  it("has at least six bedrooms, each with an attached bathroom", () => {
    expect(facts.bedrooms).toBeGreaterThanOrEqual(6);
    expect(facts.bedroomsWithAttachedBath).toBe(facts.bedrooms);
  });

  it("has a double-height lounge and an upstairs family lounge", () => {
    expect(facts.doubleHeightRooms).toContain("Lounge");
    const first = design.levels.find((l) => l.id === "first")!;
    expect(first.rooms.some((r) => r.type === "family-lounge")).toBe(true);
  });

  it("has a covered porch for at least three cars, a larger lawn than the 1 Kanal and a guard room", () => {
    expect(facts.porches.some((p) => p.covered && p.cars >= 3)).toBe(true);
    expect(facts.lawnArea).toBeGreaterThan(getDesign("1-kanal").facts.lawnArea);
    expect(has("2-kanal", "guard-room")).toBe(true);
  });
});

describe("5 Marla house", () => {
  const { design, facts } = getDesign("5-marla");

  it("is on a 25' × 45' plot with a ground and first floor, stair room and tanks on the roof", () => {
    expect([design.plot.width, design.plot.depth]).toEqual([25, 45]);
    expect(facts.plot.size).toBe("5 Marla");
    expect(facts.storeys).toBe(2);
    expect(facts.roof.stairRoom).toBe(true);
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
  });

  it("stands on the plot line on both sides", () => {
    expect(design.site.boundary.sides).not.toContain("left");
    expect(design.site.boundary.sides).not.toContain("right");
    const walls = design.levels[0].walls.filter((w) => w.kind === "exterior");
    for (const x of [w0(design.plot.width, "left"), w0(design.plot.width, "right")]) {
      expect(walls.some((w) => w.a[0] === x && w.b[0] === x)).toBe(true);
    }
  });

  it("has at least three bedrooms, each with an attached bathroom", () => {
    expect(facts.bedrooms).toBeGreaterThanOrEqual(3);
    expect(facts.bedroomsWithAttachedBath).toBe(facts.bedrooms);
  });

  it("has a drawing room, TV lounge, upstairs family lounge and kitchen", () => {
    for (const type of ["drawing", "tv-lounge", "kitchen"]) expect(has("5-marla", type), type).toBe(true);
    const first = design.levels.find((l) => l.id === "first")!;
    expect(first.rooms.some((r) => r.type === "family-lounge")).toBe(true);
  });

  it("has a covered porch for at least one car", () => {
    expect(facts.porches.some((p) => p.covered && p.cars >= 1)).toBe(true);
  });

  it("leaves the sky court out of the covered area", () => {
    const court = design.levels.find((l) => l.id === "roof")!.slab.voids.find((v) => v.kind === "open");
    expect(court).toBeDefined();
    const first = facts.levels.find((l) => l.id === "first")!;
    const whole = getDesign("5-marla").design.levels.find((l) => l.id === "first")!.slab.outline;
    expect(first.coveredArea).toBeLessThan(polygonArea(whole));
  });
});

describe("10 Marla house", () => {
  const { design, facts } = getDesign("10-marla");

  it("is on a 35' × 65' plot with a ground and first floor, stair room and tanks on the roof", () => {
    expect([design.plot.width, design.plot.depth]).toEqual([35, 65]);
    expect(facts.plot.size).toBe("10 Marla");
    expect(facts.storeys).toBe(2);
    expect(facts.roof.stairRoom).toBe(true);
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
  });

  it("stands on the plot line on its left, with a side passage on its right", () => {
    expect(design.site.boundary.sides).not.toContain("left");
    expect(design.site.boundary.sides).toContain("right");
    expect(design.site.paving.some((p) => p.id === "side-passage")).toBe(true);
  });

  it("has at least four bedrooms, each with an attached bathroom", () => {
    expect(facts.bedrooms).toBeGreaterThanOrEqual(4);
    expect(facts.bedroomsWithAttachedBath).toBe(facts.bedrooms);
  });

  it("has a drawing room, dining, TV lounge, upstairs family lounge and kitchen", () => {
    for (const type of ["drawing", "dining", "tv-lounge", "kitchen"]) expect(has("10-marla", type), type).toBe(true);
    const first = design.levels.find((l) => l.id === "first")!;
    expect(first.rooms.some((r) => r.type === "family-lounge")).toBe(true);
  });

  it("has a covered porch for at least two cars and a front lawn", () => {
    expect(facts.porches.some((p) => p.covered && p.cars >= 2)).toBe(true);
    expect(facts.lawnArea).toBeGreaterThan(0);
  });
});
