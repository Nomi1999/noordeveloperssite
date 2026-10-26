/** Each concept design meets the program in the building-designs spec, checked from computed facts */
import { describe, expect, it } from "vitest";
import { designs, getDesign } from "./index.ts";
import { designSources } from "./sources.ts";
import { checkDesign, formatIssue } from "./validate.ts";

const has = (slug: string, type: string) =>
  getDesign(slug).design.levels.some((l) => l.rooms.some((r) => r.type === type));

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
    expect(slugs).toEqual(["1-kanal", "2-kanal", "commercial"]);
  });

  it("are flat-roofed with parapets", () => {
    for (const { facts } of designs) expect(facts.roof.parapet).toBe(true);
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

describe("Commercial plaza", () => {
  const { design, facts } = getDesign("commercial");

  it("is on a 50' × 90' plot with a ground floor and three upper floors", () => {
    expect([design.plot.width, design.plot.depth]).toEqual([50, 90]);
    expect(facts.storeys).toBe(4);
  });

  it("has street-facing shops on the ground floor", () => {
    const ground = design.levels[0];
    const shops = ground.rooms.filter((r) => r.type === "shop");
    expect(shops.length).toBeGreaterThanOrEqual(3);
    // Every shop reaches the front wall at y = 15
    for (const shop of shops) expect(Math.min(...shop.outline.map((p) => p[1]))).toBe(15);
    expect(facts.shops).toBe(shops.length);
  });

  it("has office space on all three upper floors", () => {
    const upper = design.levels.filter((l) => l.kind === "floor").slice(1);
    expect(upper).toHaveLength(3);
    for (const level of upper) expect(level.rooms.some((r) => r.type === "office"), level.id).toBe(true);
    expect(facts.officeArea).toBeGreaterThan(3 * 2000);
  });

  it("has a stair core with a lift shaft and washrooms on every floor", () => {
    expect(facts.levelsWithLift).toBe(facts.storeys);
    expect(facts.levelsWithWashrooms).toBe(facts.storeys);
    const floors = design.levels.filter((l) => l.kind === "floor");
    for (const level of floors.slice(0, -1)) expect(level.stairs, level.id).toHaveLength(1);
  });

  it("has a roof with parapet, water tanks and a lift machine room", () => {
    expect(facts.roof).toMatchObject({ parapet: true, stairRoom: true, machineRoom: true });
    expect(facts.roof.tanks).toBeGreaterThanOrEqual(1);
  });
});
