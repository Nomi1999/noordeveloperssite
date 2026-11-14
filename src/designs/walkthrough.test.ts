import { describe, expect, it } from "vitest";
import { getDesign } from "./index.ts";
import { planPoint } from "./plan.ts";
import {
  buildTour,
  canSee,
  sightLinks,
  linkPoint,
  markerYaw,
  normaliseAngle,
  openStretch,
  parseWalkthrough,
  viewerYaw,
  walkthroughProblems,
  worldAngle,
  walkthroughSources,
} from "./walkthrough.ts";
import { getWalkthrough } from "./walkthroughs.ts";

const { design } = getDesign("5-marla");
const fiveMarla = walkthroughSources.find((s) => (s as { design: string }).design === "5-marla");
const source = () => structuredClone(fiveMarla) as ReturnType<typeof parseWalkthrough>;
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
    expect(getWalkthrough("2-kanal")).toBeUndefined();
  });
});

describe("the 1 Kanal walkthrough", () => {
  const kanal = getDesign("1-kanal").design;
  const source = walkthroughSources.find((s) => (s as { design: string }).design === "1-kanal");

  it("is found beside the 5 Marla's", () => {
    expect(walkthroughSources.map((s) => (s as { design: string }).design).sort()).toEqual(["1-kanal", "10-marla", "5-marla"]);
    expect(getWalkthrough("1-kanal")).toBeDefined();
  });

  it("is sound", () => {
    expect(walkthroughProblems(kanal, parseWalkthrough(source))).toEqual([]);
  });

  it("has 115 views and leaves out only the two rooms with no way in", () => {
    const wt = parseWalkthrough(source);
    expect(wt.viewpoints).toHaveLength(115);
    expect(wt.excluded.map((x) => `${x.level}/${x.room}`).sort()).toEqual(["first/terrace-left", "ground/washroom"]);
    for (const level of kanal.levels.filter((l) => ["ground", "first"].includes(l.id))) {
      for (const room of level.rooms) {
        const seen = wt.viewpoints.some((v) => v.level === level.id && v.room === room.id);
        const out = wt.excluded.some((x) => x.level === level.id && x.room === room.id);
        expect(seen !== out, `${level.id}/${room.id}`).toBe(true);
      }
    }
  });
});

describe("the 10 Marla walkthrough", () => {
  const house = getDesign("10-marla").design;
  const source = walkthroughSources.find((s) => (s as { design: string }).design === "10-marla");

  it("is found and sound", () => {
    expect(walkthroughProblems(house, parseWalkthrough(source))).toEqual([]);
    expect(getWalkthrough("10-marla")).toBeDefined();
  });

  it("opens outside at the car gate and enters the TV lounge through the main door", () => {
    const wt = parseWalkthrough(source);
    expect(wt.start).toBe("gate");
    const gate = wt.viewpoints.find((v) => v.id === "gate")!;
    expect(gate.room).toBeNull();
    expect(gate.links).toEqual([{ to: "lounge", via: "main-door" }]);
  });

  it("covers every ground and first floor room and leaves out only the stair's own rooms and the roof's stair room", () => {
    const wt = parseWalkthrough(source);
    expect(wt.excluded.map((x) => `${x.level}/${x.room}`)).toEqual(["first/stair-tower", "roof/stair-room"]);
    for (const level of house.levels.filter((l) => ["ground", "first"].includes(l.id))) {
      for (const room of level.rooms) {
        if (wt.excluded.some((x) => x.level === level.id && x.room === room.id)) continue;
        expect(wt.viewpoints.some((v) => v.level === level.id && v.room === room.id), `${level.id}/${room.id}`).toBe(true);
      }
    }
  });

  it("joins the corridor to the family lounge through an open boundary", () => {
    const wt = parseWalkthrough(source);
    const corridor = wt.viewpoints.find((v) => v.id === "corridor")!;
    expect(corridor.links).toContainEqual({ to: "family", via: "open" });
  });
});

describe("open boundaries and rooms left out", () => {
  const kanal = getDesign("1-kanal").design;
  const first = kanal.levels.find((l) => l.id === "first")!;
  const room = (id: string) => first.rooms.find((r) => r.id === id)!;
  // a two-view tour of the 1 Kanal first floor: the lounge and the kitchenette it opens onto, every other room left out
  const tour = () => ({
    design: "1-kanal",
    levels: ["first"],
    start: "lounge",
    viewpoints: [
      { id: "lounge", room: "lounge", level: "first", at: [30, 55], facing: 90, description: "The lounge.", links: [{ to: "kitchenette", via: "open" }] },
      { id: "kitchenette", room: "kitchenette", level: "first", at: [15, 48], facing: 0, description: "The kitchenette.", links: [{ to: "lounge", via: "open" }] },
    ],
    excluded: first.rooms.filter((r) => !["lounge", "kitchenette"].includes(r.id)).map((r) => ({ level: "first", room: r.id, reason: "test" })),
  });
  const problems = (edit: (w: ReturnType<typeof tour>) => void = () => {}) => {
    const w = tour();
    edit(w);
    return walkthroughProblems(kanal, parseWalkthrough(w)).join("\n");
  };

  it("finds where two rooms meet with no wall, and nowhere a wall stands", () => {
    const open = openStretch(first, room("lounge"), room("kitchenette"))!;
    // the longer of the two open sides: along y 52, from x 10.8 to 21.3
    expect(open.length).toBeCloseTo(10.5, 1);
    expect(open.mid[0]).toBeCloseTo(16.05, 2);
    expect(open.mid[1]).toBeCloseTo(52, 2);
    expect(openStretch(first, room("lounge"), room("master"))).toBeUndefined();
  });

  it("accepts an open link and puts its marker in the middle of the open stretch", () => {
    expect(problems()).toBe("");
    const w = parseWalkthrough(tour());
    expect(linkPoint(kanal, w.viewpoints[0], w.viewpoints[0].links[0], w.viewpoints[1])).toEqual([16.05, 52]);
  });

  it("rejects an open link through a wall", () => {
    const found = problems((w) => {
      w.viewpoints[1] = { ...w.viewpoints[1], id: "master", room: "master", at: [30, 75] };
      w.viewpoints[0].links = [{ to: "master", via: "open" }];
      w.viewpoints[1].links = [{ to: "lounge", via: "open" }];
      w.excluded = w.excluded.filter((x) => x.room !== "master").concat({ level: "first", room: "kitchenette", reason: "test" });
    });
    expect(found).toMatch(/"lounge" and "master" do not meet without a wall/);
  });

  it("wants every room it does not leave out", () => {
    expect(problems((w) => (w.excluded = w.excluded.filter((x) => x.room !== "study")))).toMatch(/room "study" has no viewpoint/);
  });

  it("names a room it leaves out that is not there", () => {
    expect(problems((w) => w.excluded.push({ level: "first", room: "cellar", reason: "test" }))).toMatch(/excludes room "cellar"/);
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

  it("lets a viewpoint on a stair stand outside its room", () => {
    expect(check((w) => Object.assign(view(w, "kitchen"), { at: [20, 5], rise: 3 })).join("\n")).not.toMatch(/viewpoint "kitchen" is outside its room/);
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
    expect(check((w) => delete (view(w, "gate") as { label?: string }).label).join("\n")).toMatch(/"gate" has no room, so it needs a label/);
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
    expect(tour.start).toBe("gate");
  });

  it("names views from rooms, with overrides", () => {
    const byId = Object.fromEntries(tour.views.map((v) => [v.id, v.label]));
    expect(byId.drawing).toBe("Drawing room");
    expect(byId.lounge).toBe("TV lounge");
    expect(byId["stair-head"]).toBe("Top of the stair");
    expect(byId.gate).toBe("Front gate");
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

describe("the walking rules", () => {
  const kanalDesign = getDesign("1-kanal").design;
  const kanalTour = parseWalkthrough(walkthroughSources.find((s) => (s as { design: string }).design === "1-kanal"));
  const at = (id: string) => kanalTour.viewpoints.find((v) => v.id === id)!;
  const seen = (id: string) => sightLinks(kanalDesign, kanalTour, at(id)).map((v) => v.id);

  it("links only spots at the same height", () => {
    const landing = at("stair-turn");
    expect(landing.rise).toBeGreaterThan(0);
    for (const v of sightLinks(kanalDesign, kanalTour, landing)) expect(v.rise).toBe(landing.rise);
    expect(seen("stair-turn")).not.toContain("d-electrical-door");
    expect(seen("d-electrical-door")).not.toContain("stair-turn");
  });

  it("does not see through a closed door in an exterior wall", () => {
    const tenMarla = getDesign("10-marla").design;
    const tour = parseWalkthrough(walkthroughSources.find((s) => (s as { design: string }).design === "10-marla"));
    const exterior = tenMarla.levels.flatMap((l) => l.walls.filter((w) => w.kind === "exterior").map((w) => ({ l, w })));
    const door = exterior.flatMap(({ l, w }) => l.openings.filter((o) => o.wall === w.id && o.type !== "window" && o.type !== "opening").map((o) => ({ l, o })))[0];
    expect(door).toBeDefined();
    // no sight link crosses such a door, though the authored link through it stays
    for (const v of tour.viewpoints) for (const to of sightLinks(tenMarla, tour, v)) {
      const level = tenMarla.levels.find((l) => l.id === v.level)!;
      expect(canSee(level, v.at, to.at)).toBe(true);
    }
    const noDoors = (l: (typeof tenMarla.levels)[number]) => ({ ...l, openings: l.openings.filter((o) => !(o.id === door.o.id)) });
    const wall = door.l.walls.find((w) => w.id === door.o.wall)!;
    const mid: [number, number] = [(wall.a[0] + wall.b[0]) / 2, (wall.a[1] + wall.b[1]) / 2];
    const nx = -(wall.b[1] - wall.a[1]);
    const ny = wall.b[0] - wall.a[0];
    const len = Math.hypot(nx, ny);
    const near = (k: number): [number, number] => [mid[0] + (nx / len) * k, mid[1] + (ny / len) * k];
    expect(canSee(door.l, near(3), near(-3))).toBe(false);
    expect(canSee(noDoors(door.l), near(3), near(-3))).toBe(false);
    const archWall = { ...door.l, walls: door.l.walls.map((w) => (w.id === wall.id ? { ...w, kind: "interior" as const } : w)) };
    expect(canSee(archWall, near(3), near(-3))).toBe(true);
  });

  it("does not see across a hole in the floor, but along its edge", () => {
    const first = kanalDesign.levels.find((l) => l.id === "first")!;
    const lobby = first.slab.voids.find((v) => v.id === "lobby-void")!;
    const xs = lobby.outline.map((p) => p[0]);
    const ys = lobby.outline.map((p) => p[1]);
    const mid: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const bare = { ...first, walls: [], openings: [] };
    const across: [[number, number], [number, number]] = [[mid[0], Math.min(...ys) - 1], [mid[0], Math.max(...ys) + 1]];
    expect(canSee({ ...bare, slab: { ...first.slab, voids: [] } }, ...across)).toBe(true);
    expect(canSee(bare, ...across)).toBe(false);
    const x = Math.min(...xs) + 0.1;
    expect(canSee(bare, [x, Math.min(...ys) + 2], [x, Math.max(...ys) - 2])).toBe(true);
    // g1 and passage, both on the gallery south of the void, still see each other
    expect(seen("g1")).toContain("passage");
    expect(seen("g1")).not.toContain("passage-side");
  });
});
