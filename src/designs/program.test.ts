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
  const level = (id: string) => design.levels.find((l) => l.id === id)!;

  /** The clear size at a point inside a room, measured from wall face to wall face along each axis, and stopping at the room's outline where no wall stands */
  function clearSize(levelId: string, [x, y]: [number, number]) {
    const { walls, rooms } = level(levelId);
    const inRoom = rooms.filter((r) => {
      const xs = r.outline.map((p) => p[0]);
      const ys = r.outline.map((p) => p[1]);
      return x > Math.min(...xs) && x < Math.max(...xs) && y > Math.min(...ys) && y < Math.max(...ys);
    });
    expect(inRoom.length, `a room at ${x}, ${y}`).toBeGreaterThan(0);
    const xs = inRoom[0].outline.map((p) => p[0]);
    const ys = inRoom[0].outline.map((p) => p[1]);
    const [lo, hi] = [{ x: Math.min(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.max(...ys) }];
    for (const w of walls) {
      const half = w.thickness / 2;
      if (w.a[0] === w.b[0] && y >= Math.min(w.a[1], w.b[1]) && y <= Math.max(w.a[1], w.b[1])) {
        if (w.a[0] < x) lo.x = Math.max(lo.x, w.a[0] + half);
        else hi.x = Math.min(hi.x, w.a[0] - half);
      }
      if (w.a[1] === w.b[1] && x >= Math.min(w.a[0], w.b[0]) && x <= Math.max(w.a[0], w.b[0])) {
        if (w.a[1] < y) lo.y = Math.max(lo.y, w.a[1] + half);
        else hi.y = Math.min(hi.y, w.a[1] - half);
      }
    }
    return [hi.x - lo.x, hi.y - lo.y];
  }

  it("is on a five-sided corner plot of about 5,000 sq ft, labelled 1 Kanal", () => {
    expect(design.plot.outline).toHaveLength(5);
    expect(facts.plot.size).toBe("1 Kanal");
    expect(facts.plot.area).toBeGreaterThan(4900);
    expect(facts.plot.area).toBeLessThan(5100);
    expect(facts.storeys).toBe(2);
  });

  it("has tanks behind a parapet and no stair room, with an outdoor stair to the roof", () => {
    expect(facts.roof.parapet).toBe(true);
    expect(facts.roof.stairRoom).toBe(false);
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
    const toRoof = design.levels.flatMap((l) => l.stairs).filter((s) => s.to === "roof");
    expect(toRoof.map((s) => s.type).sort()).toEqual(["l-shaped", "spiral"]);
    expect(toRoof.every((s) => s.outdoor)).toBe(true);
    // The parapet stands open where each stair arrives
    expect(level("roof").parapets.every((p) => !p.closed)).toBe(true);
  });

  it("has five bedrooms, each with an attached bathroom", () => {
    expect(facts.bedrooms).toBe(5);
    expect(facts.bedroomsWithAttachedBath).toBe(5);
  });

  it("has every room of its program, with no service rooms", () => {
    for (const type of ["drawing", "powder-room", "dining", "tv-lounge", "kitchen", "back-kitchen", "family-lounge", "study", "master-bedroom"]) {
      expect(has("1-kanal", type), type).toBe(true);
    }
    for (const type of ["servant-room", "laundry", "store"]) expect(has("1-kanal", type), type).toBe(false);
    expect(level("first").rooms.filter((r) => r.type === "terrace").length).toBeGreaterThanOrEqual(3);
    expect(facts.doubleHeightRooms).toContain("Stair lobby");
  });

  it("has a covered porch for two cars and a front lawn", () => {
    expect(facts.porches).toEqual([{ id: "porch", cars: 2, covered: true }]);
    expect(facts.lawnArea).toBeGreaterThan(0);
  });

  // Room sizes as labelled on the reference plans, in feet, with a point inside each
  const INCH = 1 / 12;
  it.each([
    ["ground", "Stair lobby", [28, 33], 13.75, 23],
    ["ground", "Drawing room", [43, 27], 16, 19],
    ["ground", "Powder", [32, 18.5], 5, 6],
    ["ground", "Dining room", [12, 35], 16, 11.75],
    ["ground", "Kitchen", [10, 48], 13.125, 11.75],
    ["ground", "Raw kitchen", [10, 57.5], 13.125, 6],
    ["ground", "TV lounge", [30, 55], 27, 18],
    ["ground", "Bath 1", [10, 65], 13.125, 8],
    ["ground", "Bedroom 1", [12, 76], 19.375, 14],
    ["ground", "Bedroom 2", [30, 75], 14.75, 19],
    ["ground", "Bath 2", [41, 78], 7.5, 10.75],
    ["ground", "Dress", [43, 70], 8.417, 8.25],
    ["first", "Bedroom 4", [12, 76], 19.375, 14],
    ["first", "Bath 4", [10, 63], 13.125, 8],
    ["first", "Master bedroom", [30, 75], 14.75, 19],
    ["first", "Dress and bath", [43, 70], 8.417, 19],
    ["first", "TV lounge", [30, 55], 28.833, 18],
    ["first", "Dress", [15, 28], 9, 7],
    ["first", "Stair terrace", [6, 53], 10, 14.625],
    ["first", "Side terrace", [44, 55], 6.625, 18],
  ] as const)("%s: %s measures its labelled size within 3 inches", (levelId, _name, probe, w, d) => {
    const [cw, cd] = clearSize(levelId, probe as unknown as [number, number]);
    expect(Math.abs(cw - w)).toBeLessThanOrEqual(3 * INCH + 1e-6);
    expect(Math.abs(cd - d)).toBeLessThanOrEqual(3 * INCH + 1e-6);
  });

  it("gives the study's width to the side terrace, keeping its depth", () => {
    const [w, d] = clearSize("first", [44, 30]);
    expect(w).toBeCloseTo(9.35, 2);
    expect(Math.abs(d - 14.25)).toBeLessThanOrEqual(3 * INCH);
  });

  // Where the reference's own label disagrees with its drawn walls, the drawn walls are kept: they line up with the floor below
  it.each([
    ["first", "Bedroom 3 (labelled 16'-0\" × 15'-8½\")", [12, 38], 16, 14],
    ["first", "Bath 3 (labelled 13'-1½\" × 7'-10½\")", [8, 28], 10, 7],
  ] as const)("%s: %s follows the drawn walls", (levelId, _name, probe, w, d) => {
    const [cw, cd] = clearSize(levelId, probe as unknown as [number, number]);
    expect(Math.abs(cw - w)).toBeLessThanOrEqual(3 * INCH + 1e-6);
    expect(Math.abs(cd - d)).toBeLessThanOrEqual(3 * INCH + 1e-6);
  });

  it("has the porch, driveway and lawn at their traced sizes", () => {
    const size = (poly: [number, number][]) => {
      const [xs, ys] = [poly.map((p) => p[0]), poly.map((p) => p[1])];
      return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    };
    const [pw, pd] = size(design.site.porches[0].outline);
    expect(Math.abs(pw - 19.75)).toBeLessThanOrEqual(3 * INCH);
    expect(Math.abs(pd - 14)).toBeLessThanOrEqual(3 * INCH);
    // The reference labels the driveway 26'-6½" wide, but draws it 28'-6"; the drawn width is kept
    const [dw, dd] = size(design.site.driveways[0].outline);
    expect(Math.abs(dw - 28.5)).toBeLessThanOrEqual(3 * INCH);
    expect(Math.abs(dd - 14.625)).toBeLessThanOrEqual(3 * INCH);
    const [lw] = size(design.site.lawns[0].outline);
    expect(Math.abs(lw - 30)).toBeLessThanOrEqual(3 * INCH);
  });
});

describe("2 Kanal house", () => {
  const { design, facts } = getDesign("2-kanal");

  it("is on a 75' × 120' plot with a ground and first floor, stair room and tanks on the roof", () => {
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
