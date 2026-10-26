/**
 * A small, valid two-storey house used by the tests. Each test clones it and
 * breaks one rule.
 */
import { chain, defineDesign, door, fixture, int, makeGrid, outset, rect, room, stack, win } from "../helpers.ts";
import type { DesignInput } from "../model.ts";

export function testHouse(): DesignInput {
  const G = makeGrid([5, 20, 35], [22, 37, 52]);
  const { g } = G;
  const footprint = outset(rect(g("A", 1), g("C", 3)), 0.375);
  const stairRect = { x: 26, y: 37, w: 7.5, d: 14 };
  const stairOutline = rect([26, 37], [33.5, 51]);
  const mumty = rect([25.625, 36.625], [33.875, 51.375]);
  const perimeter = (prefix: string) => chain(prefix, [g("A", 1), g("C", 1), g("C", 3), g("A", 3)], { closed: true, kind: "exterior" });

  return defineDesign({
    slug: "test-house",
    name: "Test house",
    kind: "house",
    plot: { width: 40, depth: 70 },
    grid: { x: G.x, y: G.y },
    levels: stack(2, [
      {
        id: "ground",
        name: "Ground floor",
        kind: "floor",
        height: 11,
        slab: { outline: footprint },
        walls: [...perimeter("out"), int("mid", g("B", 1), g("B", 3)), int("split", g("A", 2), g("B", 2))],
        openings: [
          door("front-door", "out-1", 20, { width: 3.5 }),
          win("win-front", "out-1", 5, 6),
          win("win-kitchen", "out-4", 3, 4),
          door("bed-door", "mid", 5),
        ],
        rooms: [
          room("bed", "Bedroom", "bedroom", rect(g("A", 1), g("B", 2))),
          room("kitchen", "Kitchen", "kitchen", rect(g("A", 2), g("B", 3))),
          room("lounge", "Lounge", "lounge", rect(g("B", 1), g("C", 3))),
        ],
        fixtures: [fixture("counter", "counter", [5.375, 49.625], [14.25, 2], "rear")],
        stairs: [{ id: "stair", type: "dog-leg", ...stairRect, to: "first", up: "rear" }],
      },
      {
        id: "first",
        name: "First floor",
        kind: "floor",
        height: 11,
        slab: { outline: footprint, voids: [{ id: "stairwell", kind: "stair", outline: stairOutline }] },
        walls: [...perimeter("out"), int("mid", g("B", 1), g("B", 3)), int("split", g("A", 2), g("B", 2))],
        rooms: [
          room("bed-2", "Bedroom 2", "bedroom", rect(g("A", 1), g("B", 2))),
          room("family", "Family lounge", "family-lounge", rect(g("B", 1), g("C", 3))),
        ],
        stairs: [{ id: "stair", type: "dog-leg", ...stairRect, to: "roof", up: "rear" }],
      },
      {
        id: "roof",
        name: "Roof",
        kind: "roof",
        height: 9,
        slab: { outline: footprint, voids: [{ id: "stairwell", kind: "stair", outline: stairOutline }] },
        walls: chain("mumty", mumty, { closed: true, kind: "exterior" }),
        openings: [door("roof-door", "mumty-1", 1)],
        rooms: [room("stair-room", "Stair room", "stair-room", mumty)],
        parapets: [{ id: "parapet", path: rect(g("A", 1), g("C", 3)) }],
        tanks: [{ id: "tank", x: 8, y: 40, w: 6, d: 4, height: 4 }],
      },
      {
        id: "top",
        name: "Top roof",
        kind: "roof",
        height: 1,
        slab: { outline: outset(mumty, 0.375) },
      },
    ]),
    site: {
      boundary: { gates: [{ id: "gate", side: "front", offset: 5, width: 12, kind: "vehicle" }] },
      porches: [{ id: "porch", outline: rect([5, 1], [25, 21]) }],
      lawns: [{ id: "lawn", outline: rect([26, 1], [39, 21]) }],
    },
    facade: [{ id: "fin", type: "box", level: "first", role: "fin", x: 10, y: 21, w: 0.3, d: 0.6, z: 0, h: 10, material: "metal-dark" }],
  });
}
