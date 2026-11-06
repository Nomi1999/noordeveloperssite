/** Facts about a design computed from its data, never typed in by hand */
import { AREA_EPS, asRegion, bounds, coveredArea, intersection, levelRooms, plotArea, regionArea, slabOutline } from "./geometry.ts";
import type { Design, RoomTypeName } from "./model.ts";
import { CAR_BAY } from "./validate.ts";
import { plotSize } from "./units.ts";

export interface LevelFacts {
  id: string;
  name: string;
  coveredArea: number;
}

export interface DesignFacts {
  /** `minWidth` is set when the plot is not a rectangle: its width runs from there to `width` */
  plot: { width: number; depth: number; minWidth?: number; area: number; size: string };
  storeys: number;
  /** Levels with covered area, from the ground up */
  levels: LevelFacts[];
  coveredArea: number;
  bedrooms: number;
  /** Bedrooms with a bathroom attached directly or through a dressing */
  bedroomsWithAttachedBath: number;
  bathrooms: number;
  shops: number;
  officeArea: number;
  roomCounts: Partial<Record<RoomTypeName, number>>;
  /** Names of rooms open to the level above through a double-height void */
  doubleHeightRooms: string[];
  /** Car capacity of each porch from 9' × 18' bays, and whether a slab covers it */
  porches: { id: string; cars: number; covered: boolean }[];
  lawnArea: number;
  roof: { parapet: boolean; stairRoom: boolean; tanks: number; machineRoom: boolean };
  /** Floor levels (storeys) with at least one bathroom or washroom */
  levelsWithWashrooms: number;
  /** Floor levels with a lift */
  levelsWithLift: number;
}

const BEDROOM: RoomTypeName[] = ["master-bedroom", "bedroom"];
const BATHROOM: RoomTypeName[] = ["bathroom", "powder-room", "washroom"];

export function computeFacts(design: Design): DesignFacts {
  const floors = design.levels.filter((l) => l.kind === "floor");
  const rooms = design.levels.flatMap((level) => level.rooms.map((room) => ({ level, room })));
  const geometry = new Map(design.levels.flatMap((level) => levelRooms(level).map((g) => [g.room, g] as const)));

  const roomCounts: DesignFacts["roomCounts"] = {};
  for (const { room } of rooms) roomCounts[room.type] = (roomCounts[room.type] ?? 0) + 1;

  // A bedroom has an attached bath if a bathroom points at it, or at a dressing that points at it
  const withBath = new Set<string>();
  for (const level of design.levels) {
    const byId = new Map(level.rooms.map((r) => [r.id, r]));
    for (const bath of level.rooms.filter((r) => r.type === "bathroom" && r.attachedTo)) {
      let target = byId.get(bath.attachedTo!);
      if (target?.type === "dressing" && target.attachedTo) target = byId.get(target.attachedTo);
      if (target && BEDROOM.includes(target.type)) withBath.add(`${level.id}/${target.id}`);
    }
  }

  const doubleHeightRooms: string[] = [];
  design.levels.forEach((level, i) => {
    const above = design.levels[i + 1];
    if (!above) return;
    const voids = above.slab.voids.filter((v) => v.kind === "double-height").map((v) => asRegion(v.outline));
    for (const room of level.rooms) {
      const area = regionArea(asRegion(room.outline));
      const open = voids.reduce((sum, v) => sum + regionArea(intersection(asRegion(room.outline), v)), 0);
      if (open > area / 2) doubleHeightRooms.push(room.name);
    }
  });

  const firstSlab = design.levels[1] ? slabOutline(design.levels[1].slab) : [];
  const porches = design.site.porches.map((p) => {
    const region = asRegion(p.outline);
    const b = bounds(region);
    const cars =
      p.cars ??
      Math.max(
        Math.floor(b.w / CAR_BAY.w) * Math.floor(b.d / CAR_BAY.d),
        Math.floor(b.d / CAR_BAY.w) * Math.floor(b.w / CAR_BAY.d),
      );
    const covered = regionArea(intersection(region, firstSlab)) >= 0.8 * regionArea(region) - AREA_EPS;
    return { id: p.id, cars, covered };
  });

  const levels = design.levels
    .map((level, i) => ({ id: level.id, name: level.name, coveredArea: coveredArea(design, i) }))
    .filter((l) => l.coveredArea > AREA_EPS);
  const roofLevels = design.levels.filter((l) => l.kind === "roof");
  const has = (types: RoomTypeName[], level: Design["levels"][number]) => level.rooms.some((r) => types.includes(r.type));
  const area = plotArea(design);
  // The narrowest the plot gets along its street-side corners: every corner off the left edge
  const minWidth = design.plot.outline && Math.min(...design.plot.outline.map(([x]) => x).filter((x) => x > 0));

  return {
    plot: {
      width: design.plot.width,
      depth: design.plot.depth,
      ...(minWidth ? { minWidth } : {}),
      area,
      size: design.plot.label ?? plotSize(area),
    },
    storeys: floors.length,
    levels,
    coveredArea: levels.reduce((sum, l) => sum + l.coveredArea, 0),
    bedrooms: rooms.filter(({ room }) => BEDROOM.includes(room.type)).length,
    bedroomsWithAttachedBath: withBath.size,
    bathrooms: rooms.filter(({ room }) => BATHROOM.includes(room.type)).length,
    shops: roomCounts.shop ?? 0,
    officeArea: rooms.filter(({ room }) => room.type === "office").reduce((sum, { room }) => sum + geometry.get(room)!.area, 0),
    roomCounts,
    doubleHeightRooms,
    porches,
    lawnArea: design.site.lawns.reduce((sum, l) => sum + regionArea(asRegion(l.outline)), 0),
    roof: {
      parapet: roofLevels.some((l) => l.parapets.length > 0),
      stairRoom: roofLevels.some((l) => has(["stair-room"], l)),
      tanks: roofLevels.reduce((sum, l) => sum + l.tanks.length, 0),
      machineRoom: roofLevels.some((l) => has(["machine-room"], l)),
    },
    levelsWithWashrooms: floors.filter((l) => has(BATHROOM, l)).length,
    levelsWithLift: floors.filter((l) => has(["lift"], l)).length,
  };
}
