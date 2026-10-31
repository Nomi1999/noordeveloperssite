import { describe, expect, it } from "vitest";
import { designs } from "./index.ts";
import { checkRenders, getRenders, renderRegistry, type DesignRenderEntry } from "./renders.ts";

const entry: DesignRenderEntry = {
  lead: "front",
  gallery: ["side"],
  share: "/og/test.jpg",
  shots: { front: { alt: "Front", caption: "Front" }, side: { alt: "Side", caption: "Side" } },
};

describe("render registry", () => {
  it("has every image for every design", () => {
    expect(checkRenders()).toEqual([]);
    for (const { design } of designs) {
      const renders = getRenders(design.slug);
      expect(renders.lead.alt.length).toBeGreaterThan(20);
      expect(renders.gallery.map((r) => r.shot)).not.toContain(renders.lead.shot);
    }
  });

  it("reports a design without an entry", () => {
    expect(checkRenders({}, ["new-design"])).toEqual([
      'design "new-design" has no entry in the render registry (src/designs/renders.ts)',
    ]);
  });

  it("reports missing stills, shot copy and share images", () => {
    const problems = checkRenders(
      { test: { ...entry, gallery: ["side", "aerial"] } },
      ["test"],
      (_slug, shot) => shot !== "side",
      () => false,
    );
    expect(problems).toEqual([
      'design "test": missing still src/assets/renders/test/side.jpg',
      'design "test": shot "aerial" has no alt text and caption',
      'design "test": missing share image public/og/test.jpg',
    ]);
  });

  it("lists only designs that exist", () => {
    expect(Object.keys(renderRegistry).sort()).toEqual(designs.map((d) => d.design.slug).sort());
  });
});
