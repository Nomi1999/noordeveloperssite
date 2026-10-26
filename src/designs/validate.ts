/**
 * Design validation. Errors stop the build; warnings (rooms under the minimum
 * sizes) are printed but the build goes on. Every message names the design,
 * the level and the element.
 */
import {
  AREA_EPS,
  EPS,
  asRegion,
  areaOutside,
  bounds,
  distToSegment,
  intersection,
  levelRooms,
  offset,
  outlineProblem,
  pathStrip,
  rectPoly,
  regionArea,
  slabOutline,
  slabRegion,
  stairLayout,
  union,
  wallFrames,
  wallHeight,
  wallPoly,
  wallsRegion,
  type Region,
} from "./geometry.ts";
import { Design, type Poly, type RoomTypeName } from "./model.ts";
import { dims, feetInches, sqft } from "./units.ts";

export interface Issue {
  severity: "error" | "warning";
  design: string;
  level?: string;
  element?: string;
  message: string;
}

export function formatIssue(issue: Issue): string {
  const where = [`design "${issue.design}"`];
  if (issue.level) where.push(`level "${issue.level}"`);
  if (issue.element) where.push(issue.element);
  return `${where.join(", ")}: ${issue.message}`;
}

export interface CheckResult {
  design?: Design;
  errors: Issue[];
  warnings: Issue[];
}

/** Minimum sizes from the design document: smallest side and area */
export const MIN_ROOM: Partial<Record<RoomTypeName, { side: number; area: number; label: string }>> = {
  "master-bedroom": { side: 14, area: 224, label: "master bedroom" },
  bedroom: { side: 12, area: 168, label: "bedroom" },
  kitchen: { side: 9, area: 100, label: "kitchen" },
  drawing: { side: 14, area: 224, label: "drawing room" },
  lounge: { side: 14, area: 224, label: "lounge" },
  "tv-lounge": { side: 14, area: 224, label: "lounge" },
  "family-lounge": { side: 14, area: 224, label: "lounge" },
};
export const MIN_ATTACHED_BATH = { side: 5, area: 40 };
export const CAR_BAY = { w: 9, d: 18 };
export const MIN_SHOP_FRONTAGE = 12;

/** Validates raw design data: the schema first, then the geometric rules */
export function checkDesign(input: unknown): CheckResult {
  const raw = input as { slug?: string; levels?: { id?: string; [k: string]: unknown }[] };
  const slug = typeof raw?.slug === "string" ? raw.slug : "(unnamed)";
  const parsed = Design.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue): Issue => {
      const [top, li, list, ei, ...rest] = issue.path;
      const level = top === "levels" && typeof li === "number" ? raw.levels?.[li]?.id : undefined;
      const items = level && typeof list === "string" ? (raw.levels?.[li as number]?.[list] as { id?: string }[]) : undefined;
      const element =
        typeof ei === "number" && items?.[ei]?.id ? `${String(list).replace(/s$/, "")} "${items[ei].id}"` : undefined;
      const field = (element ? rest : issue.path).join(".");
      return { severity: "error", design: slug, level, element, message: `${field ? `${field}: ` : ""}${issue.message}` };
    });
    return { errors, warnings: [] };
  }

  const design = parsed.data;
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const error = (level: string | undefined, element: string | undefined, message: string) =>
    errors.push({ severity: "error", design: design.slug, level, element, message });
  const warn = (level: string | undefined, element: string | undefined, message: string) =>
    warnings.push({ severity: "warning", design: design.slug, level, element, message });

  const plot = asRegion(rectPoly(0, 0, design.plot.width, design.plot.depth));
  const outsidePlot = (region: Region) => areaOutside(region, plot) > AREA_EPS;
  const outline = (level: string | undefined, element: string, poly: Poly): boolean => {
    const problem = outlineProblem(poly);
    if (problem) error(level, element, `outline is not closed: it ${problem}`);
    return !problem;
  };

  // ---- Identity and references ----
  const levelIndex = new Map<string, number>();
  design.levels.forEach((level, i) => {
    if (levelIndex.has(level.id)) error(level.id, undefined, "level id is used twice");
    levelIndex.set(level.id, i);
  });

  design.levels.forEach((level, i) => {
    const below = design.levels[i - 1];
    if (below && Math.abs(level.elevation - (below.elevation + below.height)) > EPS) {
      error(level.id, undefined, `elevation ${level.elevation} should be ${below.elevation + below.height} (the level below plus its height)`);
    }
    const seen = new Set<string>();
    for (const [kind, items] of [
      ["wall", level.walls],
      ["opening", level.openings],
      ["room", level.rooms],
      ["fixture", level.fixtures],
      ["stair", level.stairs],
      ["parapet", level.parapets],
      ["tank", level.tanks],
    ] as const) {
      for (const item of items) {
        if (seen.has(item.id)) error(level.id, `${kind} "${item.id}"`, "id is used twice on this level");
        seen.add(item.id);
      }
    }
  });

  // ---- Per level ----
  design.levels.forEach((level, li) => {
    const L = level.id;
    const frames = wallFrames(level);
    const below = design.levels[li - 1];
    const floor = slabRegion(level.slab);

    // Slab
    const slabOk =
      outline(L, "slab", level.slab.outline) &&
      level.slab.islands.every((island, i) => outline(L, `slab island ${i + 1}`, island));
    const slabArea = slabOutline(level.slab);
    if (slabOk && outsidePlot(slabArea)) error(L, "slab", "extends outside the plot");
    for (const v of level.slab.voids) {
      if (outline(L, `void "${v.id}"`, v.outline) && areaOutside(asRegion(v.outline), slabArea) > AREA_EPS) {
        error(L, `void "${v.id}"`, "is not inside the slab outline");
      }
    }
    for (const c of level.slab.cantilevers) {
      if (outline(L, `cantilever "${c.id}"`, c.outline) && areaOutside(asRegion(c.outline), slabArea) > AREA_EPS) {
        error(L, `cantilever "${c.id}"`, "is not inside the slab outline");
      }
    }
    const cantilevers = union(...level.slab.cantilevers.map((c) => asRegion(c.outline)));
    const support = below ? union(slabRegion(below.slab), cantilevers) : undefined;
    if (support && slabOk) {
      const loose = areaOutside(slabArea, union(slabOutline(below!.slab), cantilevers));
      if (loose > AREA_EPS) {
        error(L, "slab", `${sqft(loose)} of it is not over the ${below!.name.toLowerCase()} slab and not declared as a cantilever`);
      }
    }

    // Walls
    for (const f of frames.values()) {
      const name = `wall "${f.wall.id}"`;
      if (f.length < EPS) {
        error(L, name, "has zero length");
        continue;
      }
      const poly = asRegion(wallPoly(f));
      if (outsidePlot(poly)) error(L, name, "extends outside the plot");
      else if (areaOutside(poly, floor) > AREA_EPS) error(L, name, `does not stand on the ${level.name.toLowerCase()} slab`);
      else if (support && areaOutside(poly, support) > AREA_EPS) {
        error(L, name, `is not supported by the ${below!.name.toLowerCase()} below and is not on a declared cantilever`);
      }
    }

    // Openings
    const byWall = new Map<string, typeof level.openings>();
    for (const o of level.openings) {
      const name = `opening "${o.id}"`;
      const f = frames.get(o.wall);
      if (!f) {
        error(L, name, `host wall "${o.wall}" is not on this level`);
        continue;
      }
      byWall.set(o.wall, [...(byWall.get(o.wall) ?? []), o]);
      const start = f.extA;
      const end = f.length - f.extB;
      if (o.offset < start - EPS || o.offset + o.width > end + EPS) {
        error(
          L,
          name,
          `extends past the end of wall "${o.wall}": it spans ${feetInches(o.offset)} to ${feetInches(o.offset + o.width)} but the wall is clear from ${feetInches(start)} to ${feetInches(end)}`,
        );
      }
      const height = wallHeight(f.wall, design, li);
      if (o.sill + o.height > height + EPS) {
        error(L, name, `top at ${feetInches(o.sill + o.height)} is above wall "${o.wall}" (${feetInches(height)} high)`);
      }
      // Walls meeting the host part-way along it
      for (const other of level.walls) {
        if (other.id === o.wall) continue;
        for (const p of [other.a, other.b]) {
          if (distToSegment(p, f.wall.a, f.wall.b) > EPS) continue;
          const s = (p[0] - f.wall.a[0]) * f.u[0] + (p[1] - f.wall.a[1]) * f.u[1];
          if (s < EPS || s > f.length - EPS) continue;
          if (s - other.thickness / 2 < o.offset + o.width - EPS && s + other.thickness / 2 > o.offset + EPS) {
            error(L, name, `runs into wall "${other.id}", which meets wall "${o.wall}" at ${feetInches(s)}`);
          }
        }
      }
    }
    for (const [wallId, list] of byWall) {
      const sorted = [...list].sort((a, b) => a.offset - b.offset);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].offset < sorted[i - 1].offset + sorted[i - 1].width - EPS) {
          error(L, `opening "${sorted[i].id}"`, `overlaps opening "${sorted[i - 1].id}" on wall "${wallId}"`);
        }
      }
    }

    // Rooms
    const roomIds = new Set(level.rooms.map((r) => r.id));
    const closedRooms = level.rooms.filter((r) => outline(L, `room "${r.id}"`, r.outline));
    for (const r of closedRooms) {
      const region = asRegion(r.outline);
      if (outsidePlot(region)) error(L, `room "${r.id}"`, "extends outside the plot");
      else if (areaOutside(region, offset(slabArea, EPS * 10)) > AREA_EPS) error(L, `room "${r.id}"`, "is not on this level's slab");
      if (r.attachedTo && !roomIds.has(r.attachedTo)) error(L, `room "${r.id}"`, `attached to "${r.attachedTo}", which is not on this level`);
    }
    for (let i = 0; i < closedRooms.length; i++) {
      for (let j = i + 1; j < closedRooms.length; j++) {
        const overlap = regionArea(intersection(asRegion(closedRooms[i].outline), asRegion(closedRooms[j].outline)));
        if (overlap > AREA_EPS) {
          error(L, `room "${closedRooms[j].id}"`, `overlaps room "${closedRooms[i].id}" by ${sqft(overlap)}`);
        }
      }
    }

    // Fixtures, tanks, parapets
    for (const fx of level.fixtures) {
      if (outsidePlot(asRegion(rectPoly(fx.x, fx.y, fx.w, fx.d)))) error(L, `fixture "${fx.id}"`, "extends outside the plot");
    }
    for (const t of level.tanks) {
      const region = asRegion(rectPoly(t.x, t.y, t.w, t.d));
      if (outsidePlot(region)) error(L, `tank "${t.id}"`, "extends outside the plot");
      else if (areaOutside(region, floor) > AREA_EPS) error(L, `tank "${t.id}"`, "does not stand on the slab");
    }
    for (const p of level.parapets) {
      const region = pathStrip(p.path, p.closed, p.thickness);
      if (outsidePlot(region)) error(L, `parapet "${p.id}"`, "extends outside the plot");
      else if (areaOutside(region, slabArea) > AREA_EPS) error(L, `parapet "${p.id}"`, "does not stand on the slab");
    }

    // Stairs
    for (const s of level.stairs) {
      const name = `stair "${s.id}"`;
      const region = asRegion(rectPoly(s.x, s.y, s.w, s.d));
      // A stair may stand in the stairwell of the stair arriving from below, so only the outline counts
      if (outsidePlot(region)) error(L, name, "extends outside the plot");
      else if (areaOutside(region, slabArea) > AREA_EPS) error(L, name, "does not stand on the slab");
      const ti = levelIndex.get(s.to);
      if (ti === undefined || ti <= li) {
        error(L, name, `climbs to "${s.to}", which is not a level above`);
        continue;
      }
      const to = design.levels[ti];
      const voids = union(...to.slab.voids.map((v) => asRegion(v.outline)));
      if (areaOutside(region, voids) > AREA_EPS) {
        error(L, name, `does not line up with an opening in the ${to.name.toLowerCase()} slab above it`);
      }
      const same = (o: { x: number; y: number; w: number; d: number }) =>
        Math.abs(o.x - s.x) < EPS && Math.abs(o.y - s.y) < EPS && Math.abs(o.w - s.w) < EPS && Math.abs(o.d - s.d) < EPS;
      const continues = to.stairs.some(same);
      const arrives = to.rooms.some(
        (r) => (r.type === "stair-room" || r.type === "stair-hall") && areaOutside(region, asRegion(r.outline)) < AREA_EPS,
      );
      if (!continues && !arrives) {
        error(L, name, `does not line up between levels: "${to.id}" has no stair with the same outline and no stair room around it`);
      }
      const layout = stairLayout(s, to.elevation - level.elevation);
      if (layout.tread < 10 / 12 - EPS) {
        warn(L, name, `treads are only ${Math.round(layout.tread * 12 * 10) / 10}" deep for ${layout.risers} risers; make the stair longer`);
      }
    }

    // Minimum room sizes
    for (const geo of levelRooms(level, wallsRegion(level, frames))) {
      const { room } = geo;
      if (room.type === "shop" && geo.bounds.w < MIN_SHOP_FRONTAGE - EPS) {
        warn(L, `room "${room.id}"`, `shop "${room.name}" has ${feetInches(geo.bounds.w)} of frontage; the minimum is ${feetInches(MIN_SHOP_FRONTAGE)}`);
      }
      const min = room.type === "bathroom" && room.attachedTo ? { ...MIN_ATTACHED_BATH, label: "attached bathroom" } : MIN_ROOM[room.type];
      if (!min) continue;
      const side = Math.min(geo.bounds.w, geo.bounds.d);
      if (side < min.side - EPS || geo.area < min.area - AREA_EPS) {
        warn(
          L,
          `room "${room.id}"`,
          `${min.label} "${room.name}" is ${dims(geo.bounds.w, geo.bounds.d)} (${sqft(geo.area)}); the minimum is ${feetInches(min.side)} on its smaller side and ${sqft(min.area)}`,
        );
      }
    }
  });

  // ---- Site ----
  const { site } = design;
  const ground = design.levels[0];
  const footprint = slabOutline(ground.slab);
  for (const [kind, areas] of [
    ["porch", site.porches],
    ["driveway", site.driveways],
    ["lawn", site.lawns],
    ["paving", site.paving],
  ] as const) {
    for (const a of areas) {
      const name = `${kind} "${a.id}"`;
      if (!outline(undefined, name, a.outline)) continue;
      const region = asRegion(a.outline);
      if (outsidePlot(region)) error(undefined, name, "extends outside the plot");
      if (kind !== "paving" && regionArea(intersection(region, footprint)) > AREA_EPS) error(undefined, name, "overlaps the building");
    }
  }
  for (const p of site.porches) {
    const b = bounds(asRegion(p.outline));
    if (Math.min(b.w, b.d) < CAR_BAY.w - EPS || Math.max(b.w, b.d) < CAR_BAY.d - EPS) {
      warn(undefined, `porch "${p.id}"`, `is ${dims(b.w, b.d)}; one car needs ${dims(CAR_BAY.w, CAR_BAY.d)}`);
    }
  }
  for (const t of site.planting) {
    const region = asRegion(rectPoly(t.at[0] - t.size / 2, t.at[1] - t.size / 2, t.size, t.size));
    if (outsidePlot(region)) error(undefined, `planting "${t.id}"`, "extends outside the plot");
  }
  for (const gate of site.boundary.gates) {
    const length = gate.side === "front" || gate.side === "rear" ? design.plot.width : design.plot.depth;
    if (gate.offset < 0 || gate.offset + gate.width > length + EPS) error(undefined, `gate "${gate.id}"`, `is not within the ${gate.side} boundary`);
  }

  // ---- Facade ----
  const facadeIds = new Set<string>();
  for (const el of design.facade) {
    const name = `facade "${el.id}"`;
    if (facadeIds.has(el.id)) error(undefined, name, "id is used twice");
    facadeIds.add(el.id);
    if (!levelIndex.has(el.level)) error(undefined, name, `level "${el.level}" does not exist`);
    const region = el.type === "box" ? asRegion(rectPoly(el.x, el.y, el.w, el.d)) : pathStrip(el.path, false, el.thickness);
    if (outsidePlot(region)) error(el.level, name, "extends outside the plot");
  }

  return { design, errors, warnings };
}

/** Throws one error listing every problem, so a broken design fails the build */
export function assertValid(input: unknown): CheckResult & { design: Design } {
  const result = checkDesign(input);
  if (result.errors.length || !result.design) {
    throw new Error(`Invalid design:\n${result.errors.map((e) => `  - ${formatIssue(e)}`).join("\n")}`);
  }
  return result as CheckResult & { design: Design };
}
