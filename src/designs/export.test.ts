import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designs } from "./index.ts";
import { buildExport, ExportDesign, exportJsonSchema, serializeExport } from "./export.ts";

const exports = designs.map(({ design, facts }) => ({ design, data: buildExport(design, facts) }));
const committed = (name: string) => readFileSync(new URL(`../../render/data/${name}`, import.meta.url), "utf8");
const length = ([a, b]: [number, number][]) => Math.hypot(b[0] - a[0], b[1] - a[1]);

describe("render export", () => {
  it("serializes the same design to the same bytes", () => {
    for (const { data } of exports) expect(serializeExport(data)).toBe(serializeExport(structuredClone(data)));
  });

  it("matches the committed files in render/data (run `npm run designs:export` after changing a design)", () => {
    for (const { design, data } of exports) expect(committed(`${design.slug}.json`), design.slug).toBe(serializeExport(data));
    expect(committed("schema.json")).toBe(exportJsonSchema());
  });

  it("keeps numbers to four decimal places", () => {
    for (const { data } of exports) {
      for (const [, digits] of serializeExport(data).matchAll(/-?\d+\.(\d+)/g)) expect(digits.length).toBeLessThanOrEqual(4);
    }
  });

  it("gives a gate the boundary's height and posts unless it declares otherwise", () => {
    for (const { design, data } of exports) {
      for (const [i, gate] of data.site.boundary.gates.entries()) {
        const declared = design.site.boundary.gates[i];
        expect(gate.top).toBe(declared.height ?? design.site.boundary.height);
        expect(gate.posts).toBe(declared.posts ? undefined : false);
      }
    }
    const [plain] = exports.filter(({ design }) => design.slug === "5-marla");
    expect(plain.data.site.boundary.gates.every((g) => g.top === plain.design.site.boundary.height && !("posts" in g))).toBe(true);
    const [tall] = exports.filter(({ design }) => design.slug === "2-kanal");
    expect(tall.data.site.boundary.gates.every((g) => g.top === 7)).toBe(true);
    expect(tall.data.site.boundary.walls.every((w) => w.top === 1.1)).toBe(true);
  });

  it("refuses another schema version", () => {
    const { data } = exports[0];
    expect(ExportDesign.safeParse({ ...data, schemaVersion: 2 }).success).toBe(false);
  });

  it("splits every wall into pieces that cover its whole length around its openings", () => {
    for (const { data } of exports) {
      for (const level of data.levels) {
        const walls = Map.groupBy(level.walls, (p) => p.wall);
        for (const [id, pieces] of walls) {
          const runs = pieces.filter((p) => p.part === "solid").map((p) => length([p.from, p.to]));
          const holes = level.openings.filter((o) => o.wall === id).map((o) => length([o.from, o.to]));
          // The pieces are collinear, so the wall's full length is the widest pair of endpoints
          const ends = pieces.flatMap((p) => [p.from, p.to]);
          const span = Math.max(...ends.flatMap((a) => ends.map((b) => length([a, b]))));
          const covered = runs.reduce((a, b) => a + b, 0) + holes.reduce((a, b) => a + b, 0);
          expect(covered, `${data.slug} ${level.id} ${id}`).toBeCloseTo(span, 6);
        }
      }
    }
  });

  it("puts every opening between its wall's floor and top", () => {
    for (const { data } of exports) {
      for (const level of data.levels) {
        for (const o of level.openings) {
          const pieces = level.walls.filter((p) => p.wall === o.wall);
          expect(o.bottom).toBeGreaterThanOrEqual(Math.min(...pieces.map((p) => p.bottom)) - 1e-9);
          expect(o.top).toBeLessThanOrEqual(Math.max(...pieces.map((p) => p.top)) + 1e-9);
        }
      }
    }
  });
});
