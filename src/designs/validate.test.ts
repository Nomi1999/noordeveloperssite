import { describe, expect, it } from "vitest";
import { testHouse } from "./fixtures/test-house.ts";
import { computeFacts } from "./facts.ts";
import { int, rect, room, win } from "./helpers.ts";
import type { DesignInput, LevelInput } from "./model.ts";
import { assertValid, checkDesign, formatIssue } from "./validate.ts";

/** The fixture with one change applied to a level */
function broken(levelId: string, change: (level: LevelInput, design: DesignInput) => void): DesignInput {
  const design = testHouse();
  change(design.levels.find((l) => l.id === levelId)!, design);
  return design;
}

const messages = (design: DesignInput) => checkDesign(design).errors.map(formatIssue);

describe("the fixture", () => {
  it("is valid with no warnings", () => {
    const result = checkDesign(testHouse());
    expect(result.errors.map(formatIssue)).toEqual([]);
    expect(result.warnings.map(formatIssue)).toEqual([]);
  });
});

describe("validation rules", () => {
  it("rejects schema errors and names where they are", () => {
    const design = broken("ground", (level) => {
      (level.walls![0] as { thickness: number }).thickness = -1;
    });
    expect(messages(design)).toEqual([expect.stringMatching(/^design "test-house", level "ground", wall "out-1": thickness: /)]);
  });

  it("rejects elements outside the plot", () => {
    const design = broken("ground", (level) => {
      level.fixtures!.push({ id: "bbq", type: "counter", x: 38, y: 60, w: 4, d: 2, back: "rear" });
    });
    expect(messages(design)).toEqual([`design "test-house", level "ground", fixture "bbq": extends outside the plot`]);
  });

  it("rejects a window that extends past the end of its wall", () => {
    const design = broken("ground", (level) => {
      level.openings!.push(win("win-wide", "out-1", 27, 6));
    });
    expect(messages(design)).toEqual([
      expect.stringMatching(/^design "test-house", level "ground", opening "win-wide": extends past the end of wall "out-1"/),
    ]);
  });

  it("rejects an opening taller than its wall", () => {
    const design = broken("ground", (level) => {
      level.openings!.push(win("win-high", "out-2", 3, 4, { sill: 8 }));
    });
    expect(messages(design)).toEqual([expect.stringMatching(/opening "win-high": top at 13'-0" is above wall "out-2" \(10'-6" high\)/)]);
  });

  it("rejects an opening that runs into a wall meeting its host", () => {
    const design = broken("ground", (level) => {
      level.openings!.push(win("win-t", "out-1", 13, 4));
    });
    expect(messages(design)).toEqual([expect.stringMatching(/opening "win-t": runs into wall "mid"/)]);
  });

  it("rejects a room outline that is not closed", () => {
    const design = broken("ground", (level) => {
      level.rooms!.push(room("store", "Store", "store", [[6, 23], [10, 23]]));
    });
    expect(messages(design)).toEqual([expect.stringMatching(/level "ground", room "store": outline is not closed/)]);
  });

  it("rejects rooms that overlap", () => {
    const design = broken("ground", (level) => {
      level.rooms!.push(room("dining", "Dining", "dining", rect([15, 30], [25, 40])));
    });
    expect(messages(design)).toEqual(
      expect.arrayContaining([expect.stringMatching(/level "ground", room "dining": overlaps room "bed"/)]),
    );
  });

  it("rejects a stair that does not line up between levels", () => {
    const design = broken("first", (level) => {
      level.stairs![0].x = 25;
    });
    expect(messages(design)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/level "ground", stair "stair": does not line up between levels: "first" has no stair/),
      ]),
    );
  });

  it("rejects walls with nothing under them, unless on a declared cantilever", () => {
    // The first floor reaches 3 ft past the ground floor on the right
    const overhang = rect([34.625, 21.625], [38.375, 40]);
    const extend = (level: LevelInput) => {
      level.slab.outline = [[4.625, 21.625], [38.375, 21.625], [38.375, 40], [35.375, 40], [35.375, 52.375], [4.625, 52.375]];
      level.walls!.push(int("bay", [35, 30], [38, 30]));
    };
    const unsupported = broken("first", extend);
    expect(messages(unsupported)).toEqual([
      expect.stringMatching(/level "first", slab: .* not over the ground floor slab and not declared as a cantilever/),
      `design "test-house", level "first", wall "bay": is not supported by the ground floor below and is not on a declared cantilever`,
    ]);
    // The roof slab above stays the same, so nothing else changes
    const cantilevered = broken("first", (level) => {
      extend(level);
      level.slab.cantilevers = [{ id: "bay", outline: overhang }];
    });
    expect(messages(cantilevered)).toEqual([]);
  });

  it("fails loudly through assertValid", () => {
    const design = broken("ground", (level) => {
      level.openings!.push(win("win-wide", "out-1", 27, 6));
    });
    expect(() => assertValid(design)).toThrow(/Invalid design:\n {2}- design "test-house", level "ground", opening "win-wide"/);
  });
});

describe("minimum room sizes", () => {
  it("warns about an undersized bedroom but stays valid", () => {
    const design = broken("ground", (level) => {
      level.rooms![0].outline = rect([5, 22], [16, 37]);
    });
    const result = checkDesign(design);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map(formatIssue)).toEqual([
      `design "test-house", level "ground", room "bed": bedroom "Bedroom" is 10'-8" × 14'-5" (153 sq ft); the minimum is 12'-0" on its smaller side and 168 sq ft`,
    ]);
    expect(() => assertValid(design)).not.toThrow();
  });
});

describe("derived facts", () => {
  it("counts storeys, rooms and areas from the data", () => {
    const facts = computeFacts(assertValid(testHouse()).design);
    expect(facts.storeys).toBe(2);
    expect(facts.bedrooms).toBe(2);
    expect(facts.plot.size).toBe("12 Marla");
    expect(facts.levels.map((l) => [l.id, l.coveredArea])).toEqual([
      ["ground", 30.75 * 30.75],
      ["first", 30.75 * 30.75],
      ["roof", 9 * 15.5],
    ]);
    expect(facts.coveredArea).toBeCloseTo(2 * 30.75 * 30.75 + 9 * 15.5);
    expect(facts.porches).toEqual([{ id: "porch", cars: 2, covered: false }]);
    expect(facts.roof).toEqual({ parapet: true, stairRoom: true, tanks: 1, machineRoom: false });
  });

  it("counts a new bedroom with no other edits", () => {
    const before = computeFacts(assertValid(testHouse()).design).bedrooms;
    const design = broken("first", (level) => {
      level.rooms!.push(room("bed-3", "Bedroom 3", "bedroom", rect([5, 37], [20, 52])));
    });
    expect(computeFacts(assertValid(design).design).bedrooms).toBe(before + 1);
  });

  it("counts attached bathrooms, directly or through a dressing", () => {
    const design = broken("first", (level) => {
      level.rooms![0].type = "master-bedroom";
      level.rooms!.push(
        room("dress", "Dressing", "dressing", rect([5, 37], [12, 44]), { attachedTo: "bed-2" }),
        room("bath", "Bath", "bathroom", rect([12, 37], [20, 44]), { attachedTo: "dress" }),
      );
    });
    const facts = computeFacts(assertValid(design).design);
    expect(facts.bedroomsWithAttachedBath).toBe(1);
    expect(facts.bathrooms).toBe(1);
  });
});
