/** Each concept design meets the program in the building-designs spec, checked from computed facts */
import { describe, expect, it } from "vitest";
import { buildExport } from "./export.ts";
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
    // the room whose outline holds the point (outlines need not be rectangles: the 1 Kanal lobby is an L)
    const inRoom = rooms.filter((r) => {
      let hit = false;
      for (let i = 0, j = r.outline.length - 1; i < r.outline.length; j = i++) {
        const [xi, yi] = r.outline[i];
        const [xj, yj] = r.outline[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
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

  describe("exterior", () => {
    const data = buildExport(design, facts);
    const exterior = data.levels.flatMap((l) => l.walls.filter((w) => w.kind === "exterior"));
    const panels = design.facade.map((f) => f.material);

    it("has no white exterior walls or parapets", () => {
      expect(exterior.length).toBeGreaterThan(0);
      expect(exterior.filter((w) => w.material === "plaster-white")).toEqual([]);
      expect(data.levels.flatMap((l) => l.parapets).filter((p) => p.material === "plaster-white")).toEqual([]);
    });

    it("uses the full set of finishes, and no white on the house", () => {
      for (const material of ["stone-tile-grey", "travertine", "wood-slat", "plaster-charcoal", "tile-beige", "granite-black", "metal-dark", "led-strip"] as const) {
        expect(panels, material).toContain(material);
      }
      // The maintainer's choices: travertine rather than bronze behind the porch and the terrace, and black fins on both faces
      for (const material of ["tile-bronze", "marble-bronze"] as const) expect(panels, material).not.toContain(material);
      expect(new Set(design.facade.filter((f) => f.role === "fin").map((f) => f.material))).toEqual(new Set(["metal-dark"]));
      expect(design.facade.filter((f) => f.role === "fin")).toHaveLength(20);
      expect(design.facade.filter((f) => f.material === "plaster-white")).toEqual([]);
      expect(new Set(design.facade.filter((f) => f.role === "beam").map((f) => f.material))).toEqual(new Set(["plaster-charcoal"]));
    });

    it("closes every open side of the terrace with glass, from wall to wall", () => {
      const rail = design.facade.find((f) => f.id === "terrace-rail");
      if (rail?.type !== "railing") throw new Error("terrace-rail is not a railing");
      expect(rail.material).toBe("glass-tinted");
      const first = design.levels.find((l) => l.id === "first")!;
      const terrace = first.rooms.find((r) => r.id === "terrace")!.outline;
      const [left, right] = [Math.min(...terrace.map((p) => p[0])), Math.max(...terrace.map((p) => p[0]))];
      const front = Math.min(...terrace.map((p) => p[1]));
      const [start, cornerA, cornerB, end] = rail.path;
      // Up the left side, across the front and back along the right, all within a foot of the edges
      expect(start[0]).toBeCloseTo(cornerA[0]);
      expect(Math.abs(cornerA[0] - left)).toBeLessThan(1);
      expect(Math.abs(cornerA[1] - front)).toBeLessThan(1);
      expect(cornerB[1]).toBeCloseTo(cornerA[1]);
      expect(Math.abs(cornerB[0] - right)).toBeLessThan(1);
      expect(end[0]).toBeCloseTo(cornerB[0]);
      // The left end reaches the bedroom box's side wall and the right end the house wall's face
      expect(start[1]).toBeGreaterThanOrEqual(24.625);
      expect(end[1]).toBe(27.625);
    });

    it("has no column standing in a window or door", () => {
      for (const level of data.levels) {
        const walls = new Set(level.walls.filter((w) => w.kind === "exterior").map((w) => w.wall));
        for (const op of level.openings.filter((o) => walls.has(o.wall) && o.type !== "opening")) {
          const [x0, x1] = [Math.min(op.from[0], op.to[0]), Math.max(op.from[0], op.to[0])];
          const [y0, y1] = [Math.min(op.from[1], op.to[1]), Math.max(op.from[1], op.to[1])];
          const inside = level.columns.filter((c) => c.x < x1 + 0.1 && c.x + c.w > x0 - 0.1 && c.y < y1 + 0.1 && c.y + c.d > y0 - 0.1);
          expect(inside.map((c) => c.ref), `${level.id} ${op.id}`).toEqual([]);
        }
      }
    });

    it("keeps its columns inside the walls, so none stands proud of the cladding", () => {
      expect(design.grid.column).toEqual([0.75, 0.75]);
    });

    it("has a low white boundary base and closed gates 7 ft high with piers drawn in the design", () => {
      const { walls, gates } = data.site.boundary;
      expect(new Set(walls.map((w) => w.top))).toEqual(new Set([1.1]));
      expect(data.site.boundary.material).toBe("plaster-white");
      expect(gates.map((g) => [g.id, g.top, g.posts])).toEqual([["car-gate", 7, false], ["front-gate", 7, false]]);
      expect(gates.map((g) => g.material)).toEqual(["metal-dark", "metal-dark"]);
      expect(gates.some((g) => g.open)).toBe(false);
      expect(design.facade.filter((f) => f.role === "pier" && f.material === "granite-black")).toHaveLength(3);
      // The front wall is grey stone throughout, with no timber
      const front = design.facade.filter((f) => f.id.startsWith("boundary-front-"));
      expect(front.filter((f) => f.material === "wood-slat" || f.material === "wood-panel")).toEqual([]);
    });
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

  describe("exterior finishes", () => {
    const materials = new Set(design.facade.map((f) => f.material));

    it("has no brick and no white plaster on any exterior wall or parapet", () => {
      const walls = design.levels.flatMap((l) => l.walls.filter((w) => w.kind === "exterior"));
      const parapets = design.levels.flatMap((l) => l.parapets);
      expect(walls.length).toBeGreaterThan(0);
      for (const { id, material } of [...walls, ...parapets]) {
        expect(["brick-cladding", "plaster-white"], id).not.toContain(material);
      }
      expect(design.levels.flatMap((l) => l.tanks).every((t) => t.material !== "brick-cladding")).toBe(true);
      expect([...materials]).not.toContain("brick-cladding");
    });

    it("is beige tile, sand plaster, timber slats and grey stone, with the black jaali kept", () => {
      for (const material of ["tile-beige", "wood-slat", "stone-tile-grey", "metal-dark"] as const) expect(materials.has(material), material).toBe(true);
      expect(design.levels.some((l) => l.walls.some((w) => w.material === "plaster-sand"))).toBe(true);
      expect(design.levels.some((l) => l.slab.material === "plaster-charcoal")).toBe(true);
      // Ten uprights and ten rails, as before
      expect(design.facade.filter((f) => f.id.startsWith("jaali-")).map((f) => f.material)).toEqual(Array(20).fill("metal-dark"));
    });

    it("has wall lights and downlights", () => {
      const roles = new Set(design.facade.map((f) => (f.type === "panel" || f.type === "box" ? f.role : undefined)));
      expect(roles.has("sconce")).toBe(true);
      expect(roles.has("wash")).toBe(true);
      expect(design.facade.some((f) => f.id.startsWith("porch-soffit-dot-"))).toBe(true);
    });
  });

  describe("boundary", () => {
    const front = design.facade.filter((f) => f.id.startsWith("boundary-front-"));

    it("is a solid sand base, beige tile wall with a charcoal line under a charcoal cap, grey stone piers, and a black gate with timber doors", () => {
      expect(design.site.boundary.material).toBe("plaster-sand");
      expect(design.site.boundary.height).toBeCloseTo(1.1);
      // Solid and with no timber on the wall: the only slats are on the gate
      const wall = front.filter((f) => f.type === "panel" && f.id.startsWith("boundary-front-tile") && f.role === "cladding");
      expect(wall.length).toBeGreaterThan(0);
      expect(wall.every((p) => p.material === "tile-beige")).toBe(true);
      expect(front.filter((f) => f.type === "panel" && f.role === "slat").every((f) => f.id.startsWith("boundary-front-gate"))).toBe(true);
      expect(front.some((f) => f.id.startsWith("boundary-front-cap") && f.material === "plaster-charcoal")).toBe(true);
      const piers = front.filter((f) => f.type === "box" && f.role === "pier");
      expect(piers.filter((p) => p.material === "stone-tile-grey")).toHaveLength(3);
      expect(piers.filter((p) => p.material === "plaster-charcoal")).toHaveLength(3);
      expect(front.some((f) => f.type === "panel" && f.role === "sconce")).toBe(true);
      const [gate] = design.site.boundary.gates;
      expect(gate).toMatchObject({ kind: "vehicle", material: "metal-dark", height: 5, posts: false });
    });

    it("has a wicket door beside the car gate's main leaf, inside the same opening", () => {
      const doors = ["boundary-front-gate-a", "boundary-front-gate-b"].map((id) => front.filter((f) => f.id.startsWith(`${id}-`) && f.material === "wood-slat"));
      for (const slats of doors) expect(slats.length).toBeGreaterThan(0);
      // The wicket's slats lie to the right of the main leaf's, and both are within the gate's opening
      const x = (f: (typeof front)[number]) => (f.type === "panel" ? f.path[0][0] : -1);
      expect(Math.min(...doors[1].map(x))).toBeGreaterThan(Math.max(...doors[0].map(x)));
      const [gate] = design.site.boundary.gates;
      for (const f of doors.flat()) expect(x(f)).toBeGreaterThan(gate.offset);
      expect(Math.max(...doors.flat().map(x))).toBeLessThan(gate.offset + gate.width);
      expect(front.some((f) => f.id === "boundary-front-gate-handle")).toBe(true);
    });

    it("keeps the planting strip and the shrubs in it", () => {
      const planter = design.facade.find((f) => f.id === "front-planter")!;
      expect(planter.type === "box" && planter.y).toBeGreaterThan(0.75);
      expect(design.site.planting.filter((p) => p.kind === "shrub")).toHaveLength(3);
      expect(design.site.paving.find((p) => p.id === "front-strip")!.outline).toEqual([[10.125, 0.75], [24.25, 0.75], [24.25, 2.875], [10.125, 2.875]]);
    });

    it("stands every facade element inside the plot", () => {
      const eps = 0.02;
      const [W, D] = [design.plot.width, design.plot.depth];
      const inside = (x: number, y: number) => x >= -eps && x <= W + eps && y >= -eps && y <= D + eps;
      for (const f of design.facade) {
        if (f.type === "box") {
          expect(inside(f.x, f.y) && inside(f.x + f.w, f.y + f.d), f.id).toBe(true);
        } else if (f.type === "panel") {
          // The thickness is across each segment, not along it
          const half = f.thickness / 2;
          f.path.slice(1).forEach(([x1, y1], i) => {
            const [x0, y0] = f.path[i];
            const len = Math.hypot(x1 - x0, y1 - y0);
            const [nx, ny] = [((y1 - y0) / len) * half, (-(x1 - x0) / len) * half];
            for (const [x, y] of [[x0, y0], [x1, y1]]) {
              expect(inside(x + nx, y + ny) && inside(x - nx, y - ny), f.id).toBe(true);
            }
          });
        }
      }
    });
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
