## Why

The site has no photos, so its imagery and its proof of capability both come from three concept designs: a 1 Kanal house, a 2 Kanal house and a commercial plaza. The floor plans, the 3D renders and the scroll-build hero must all show the same buildings. That only stays true if each design is defined once, as data, and everything else is generated from it.

## What Changes

- Define a typed data model for a building design: plot, structural grid, levels, walls, openings, rooms, fixed fixtures, stairs, slabs (including cantilevers and double-height voids), roof features, site works (boundary wall, gate, porch, driveway, lawn, planting positions) and facade elements with material tags.
- Author three concept designs in that model:
  - **1 Kanal house** (50′×90′ plot, double storey): the hero building.
  - **2 Kanal house** (75′×120′ plot, double storey with a double-height lounge).
  - **Commercial plaza** (50′×90′ commercial plot, ground plus three floors: shops below, offices above).
- Validate designs automatically (geometry inside the plot, openings within walls, closed and non-overlapping rooms, stairs aligned between levels, minimum room sizes) and compute summary facts (covered area, bedroom and bathroom counts, storeys) instead of typing them in.
- Export each design as versioned JSON for the Blender render pipeline.
- Generate architectural floor plans as SVG at build time in the site's drawing style, with an accessible text alternative.
- Produce a plan review sheet for maintainer approval before any rendering starts.

## Capabilities

### New Capabilities
- `building-designs`: the design data model, the three concept designs, validation, derived facts and JSON export.
- `floor-plans`: how floor plans are drawn, themed, made responsive and made accessible.

### Modified Capabilities
<!-- None -->

## Impact

- New `src/designs/` (model, validation, three design files, geometry helpers) and `src/components/FloorPlan.astro`.
- New `render/data/*.json` export output, consumed by `render-pipeline`.
- New dev dependencies: `zod` (schema and validation) and `vitest` (validation tests).
- The `/designs/*` stub pages can show plans, but full page layouts are delivered by `content-pages`.
- Depends on `site-foundation` (tokens, fonts).
