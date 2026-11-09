import { describe, expect, it } from "vitest";
import { getDesign } from "./index.ts";
import { planPoint } from "./plan.ts";
import {
  buildTour,
  markerYaw,
  normaliseAngle,
  parseWalkthrough,
  viewerYaw,
  walkthroughProblems,
  worldAngle,
  walkthroughSources,
} from "./walkthrough.ts";
import { getWalkthrough } from "./walkthroughs.ts";

const { design } = getDesign("5-marla");
const source = () => structuredClone(walkthroughSources[0]) as ReturnType<typeof parseWalkthrough>;
const check = (edit: (w: ReturnType<typeof source>) => void) => {
  const w = source();
  edit(w);
  return walkthroughProblems(design, parseWalkthrough(w));
};
const view = (w: ReturnType<typeof source>, id: string) => w.viewpoints.find((v) => v.id === id)!;

describe("the 5 Marla walkthrough", () => {
  it("is sound", () => {
    expect(walkthroughProblems(design, parseWalkthrough(source()))).toEqual([]);
    expect(getWalkthrough("5-marla")).toBeDefined();
  });

  it("covers every room on the ground and first floors", () => {
    const tour = getWalkthrough("5-marla")!;
    for (const level of design.levels.filter((l) => ["ground", "first"].includes(l.id))) {
      for (const room of level.rooms) {
        expect(tour.walkthrough.viewpoints.some((v) => v.level === level.id && v.room === room.id), room.id).toBe(true);
      }
    }
  });

  it("has no tour for a design without one", () => {
    expect(getWalkthrough("1-kanal")).toBeUndefined();
  });
});

describe("what is wrong with a walkthrough", () => {
  it("names a room with no viewpoint", () => {
    const found = check((w) => {
      w.viewpoints = w.viewpoints.filter((v) => v.id !== "laundry");
      view(w, "family").links = view(w, "family").links.filter((l) => l.to !== "laundry");
    });
    expect(found.join("\n")).toMatch(/room "laundry" has no viewpoint/);
  });

  it("names a link to a viewpoint that does not exist", () => {
    expect(check((w) => view(w, "kitchen").links.push({ to: "pantry" })).join("\n")).toMatch(/kitchen → pantry: no such viewpoint/);
  });

  it("wants links to go both ways", () => {
    const found = check((w) => (view(w, "kitchen").links = []));
    expect(found.join("\n")).toMatch(/lounge → kitchen: kitchen has no link back/);
  });

  it("wants a link's door to be on both rooms", () => {
    const found = check((w) => {
      view(w, "kitchen").links[0].via = "bed1-door";
      view(w, "lounge").links.find((l) => l.to === "kitchen")!.via = "bed1-door";
    });
    expect(found.join("\n")).toMatch(/"bed1-door" is not on the outline of "kitchen"/);
  });

  it("names a door that is not there", () => {
    const found = check((w) => {
      view(w, "kitchen").links[0].via = "nope";
      view(w, "lounge").links.find((l) => l.to === "kitchen")!.via = "nope";
    });
    expect(found.join("\n")).toMatch(/"nope" is not a door or stair/);
  });

  it("wants a viewpoint inside its room", () => {
    expect(check((w) => (view(w, "kitchen").at = [20, 5])).join("\n")).toMatch(/viewpoint "kitchen" is outside its room/);
  });

  it("only joins levels with a stair", () => {
    const found = check((w) => {
      view(w, "stair-foot").links.find((l) => l.to === "stair-head")!.via = "drawing-door";
      view(w, "stair-head").links.find((l) => l.to === "stair-foot")!.via = "drawing-door";
    });
    expect(found.join("\n")).toMatch(/views on different levels can only be joined by a stair/);
  });

  it("wants a doorless link to stay in one room", () => {
    const found = check((w) => {
      view(w, "kitchen").links.push({ to: "bed1" });
      view(w, "bed1").links.push({ to: "kitchen" });
    });
    expect(found.join("\n")).toMatch(/without a door, both views must be in the same room/);
  });

  it("names a view that cannot be reached", () => {
    const found = check((w) => {
      view(w, "master").links = view(w, "master").links.filter((l) => l.to !== "family");
      view(w, "family").links = view(w, "family").links.filter((l) => l.to !== "master");
    });
    expect(found.join("\n")).toMatch(/viewpoint "master" cannot be reached/);
  });

  it("wants a label for a space with no room", () => {
    expect(check((w) => delete (view(w, "porch") as { label?: string }).label).join("\n")).toMatch(/"porch" has no room, so it needs a label/);
  });
});

describe("directions", () => {
  it("turns world angles into viewer yaw", () => {
    // panorama centres face +y (world 90°); turning clockwise from there is positive yaw
    expect(viewerYaw(90)).toBe(0);
    expect(viewerYaw(0)).toBe(90); // east is to the right of +y
    expect(viewerYaw(180)).toBe(-90);
    expect(viewerYaw(270)).toBe(180);
    expect(normaliseAngle(-180)).toBe(180);
    expect(normaliseAngle(540)).toBe(180);
  });

  it("measures world angles counter-clockwise from +x", () => {
    expect(worldAngle([0, 0], [1, 0])).toBe(0);
    expect(worldAngle([0, 0], [0, 1])).toBe(90);
    expect(worldAngle([0, 0], [-1, 0])).toBe(180);
  });

  it("puts a marker on the door it names", () => {
    const wt = parseWalkthrough(source());
    const drawing = wt.viewpoints.find((v) => v.id === "drawing")!;
    const footView = wt.viewpoints.find((v) => v.id === "stair-foot")!;
    // the drawing-room door is at (12.25, 15.875), up and to the left of the room's middle on the plan
    const yaw = markerYaw(design, drawing, drawing.links[0], footView);
    expect(yaw).toBeCloseTo(viewerYaw(worldAngle(drawing.at, [12.25, 15.875])), 1);
    expect(yaw).toBeLessThan(0);
    expect(yaw).toBeGreaterThan(-90);
  });

  it("points the stair marker at the stair", () => {
    const wt = parseWalkthrough(source());
    const foot = wt.viewpoints.find((v) => v.id === "stair-foot")!;
    const head = wt.viewpoints.find((v) => v.id === "stair-head")!;
    const yaw = markerYaw(design, foot, foot.links.find((l) => l.via === "stair")!, head);
    // the stair's middle is east of the foot (yaw ≈ 90 minus a little)
    expect(yaw).toBeGreaterThan(60);
    expect(yaw).toBeLessThan(100);
  });
});

describe("the tour", () => {
  const tour = buildTour(design, parseWalkthrough(source()));

  it("lists the levels and views", () => {
    expect(tour.levels.map((l) => l.name)).toEqual(["Ground floor", "First floor"]);
    expect(tour.views).toHaveLength(20);
    expect(tour.start).toBe("drawing");
  });

  it("names views from rooms, with overrides", () => {
    const byId = Object.fromEntries(tour.views.map((v) => [v.id, v.label]));
    expect(byId.drawing).toBe("Drawing room");
    expect(byId.lounge).toBe("TV lounge");
    expect(byId["stair-head"]).toBe("Top of the stair");
    expect(byId.porch).toBe("Car porch");
  });

  it("marks level changes", () => {
    const foot = tour.views.find((v) => v.id === "stair-foot")!;
    expect(foot.links.find((l) => l.to === "stair-head")!.stair).toBe(true);
    expect(foot.links.find((l) => l.to === "lounge")!.stair).toBe(false);
  });

  it("marks climbs up and down", () => {
    const foot = tour.views.find((v) => v.id === "stair-foot")!;
    const head = tour.views.find((v) => v.id === "stair-head")!;
    expect(foot.links.find((l) => l.to === "stair-head")!.climb).toBe(1);
    expect(head.links.find((l) => l.to === "stair-foot")!.climb).toBe(-1);
    expect(foot.links.find((l) => l.to === "lounge")!.climb).toBe(0);
  });

  it("puts each marker on the floor, nearer the horizon the further away it is", () => {
    const drawing = tour.views.find((v) => v.id === "drawing")!;
    const front = drawing.links.find((l) => l.to === "drawing-front")!;
    // 5 ft away at 5.1 ft eye height: 45 degrees down; the other end of a room is flatter
    expect(front.distance).toBeCloseTo(5, 1);
    expect(front.pitch).toBeCloseTo(-45.5, 0);
    for (const v of tour.views) for (const l of v.links) expect(l.pitch).toBeLessThanOrEqual(-8);
    const lounge = tour.views.find((v) => v.id === "lounge")!;
    expect(lounge.links.find((l) => l.to === "kitchen")!.pitch).toBeGreaterThan(lounge.links.find((l) => l.to === "lounge-back")!.pitch);
  });

  it("puts map points on the plan's viewBox", () => {
    const drawing = tour.views.find((v) => v.id === "drawing")!;
    expect(drawing.point).toEqual(planPoint(design, [17.6, 10.6]));
    // x moves right by the plan's left margin; y runs down from the rear
    expect(drawing.point[0]).toBeCloseTo(17.6 + 12, 5);
    expect(drawing.point[1]).toBeCloseTo(design.plot.depth - 10.6 + 12, 5);
  });
});
