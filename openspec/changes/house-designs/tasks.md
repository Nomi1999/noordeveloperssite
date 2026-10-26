## 1. Model and geometry

- [x] 1.1 Add exact-pinned `zod` and `vitest` dev dependencies and an npm `test` script; verify `npm test` runs (empty suite passes)
- [x] 1.2 Write the zod schema in `src/designs/model.ts` (identity, plot, grid, levels, walls, openings, rooms, fixtures, stairs, slabs with voids and cantilevers, roof, site, facade elements, material-tag enum) and export inferred types; verify a minimal hand-written fixture parses and an invalid one fails
- [x] 1.3 Write authoring helpers (grid references, `wall`, `opening`, `room`, defaults for thickness and heights) and the feet-inches formatter; verify unit tests including `16.5 → 16'-6"`, `9.75 → 9'-9"` and `0.5 → 0'-6"`
- [x] 1.4 Write `src/designs/geometry.ts` (wall splitting at openings with lintel and sill pieces, room area and bounds, slab minus voids, covered area, pole of inaccessibility); verify unit tests for a wall with two windows and a door, and an L-shaped room

## 2. Validation and facts

- [x] 2.1 Implement the validation rules from the spec (inside plot, opening within wall, closed and non-overlapping rooms, stair alignment, wall support with cantilever exceptions) with errors naming design, level and element; verify one failing fixture per rule
- [x] 2.2 Implement minimum-room-size warnings from the design table; verify an undersized bedroom fixture produces a warning and still builds
- [x] 2.3 Implement derived facts (covered area per level and total, storeys, bedrooms, bathrooms, shops, office area); verify that adding a bedroom to a fixture increments the count
- [x] 2.4 Run validation as part of the Astro build (integration hook or import-time check); verify a broken design makes `npm run build` fail

## 3. Designs

- [x] 3.1 Author `src/designs/1-kanal.ts` from the brief (grid, ground, first, roof, site works, facade); verify it validates and the program check passes (≥5 bedrooms with attached baths, back kitchen, servant room, 2-car porch, lawn, stair room, tanks)
- [x] 3.2 Author `src/designs/2-kanal.ts` from the brief including the double-height void; verify it validates and passes its program check (≥6 bedrooms, double-height lounge, family lounge, 3-car porch)
- [x] 3.3 Author `src/designs/commercial.ts` (slug `commercial`, to match the `/designs/commercial/` URL; shops, three office floors, core with lift shaft, washrooms each floor, roof); verify it validates and passes its program check
- [x] 3.4 Add a program-check test per design asserting its spec program from computed facts; verify `npm test` passes

## 4. Floor plans

- [x] 4.1 Build `FloorPlan.astro` drawing walls (filled), doors with swings, windows, fixtures, stairs with arrow, room labels with dimensions, overall dimension strings, north arrow, scale bar and title block with "Concept design. Indicative only."; verify on a `/plans-preview/` page (noindex, not in the sitemap) for every level of every design
- [x] 4.2 Add dark and light themes using design tokens only; verify label contrast meets AA in both
- [x] 4.3 Add the small-screen wrapper (min drawing width, horizontal scroll, scroll hint) and emit standalone full-size SVGs for "View full size"; verify on a 390px viewport that labels are at least 11px and the link opens the full plan
- [x] 4.4 Add the room schedule table and accessible name per plan; verify with the accessibility tree that each plan is named and the table lists every room
- [x] 4.5 Verify plans render with JavaScript disabled

## 5. Export

- [x] 5.1 Implement `npm run designs:export` writing `render/data/<slug>.json` and `render/data/schema.json` (stable key order, fixed precision, `schemaVersion: 1`, pre-split wall segments, facts); verify that two consecutive runs produce byte-identical files
- [x] 5.2 Commit the exported JSON so the render pipeline can run without Node; verify `render/data/` holds three design files plus the schema

## 6. Review

- [x] 6.1 Build a plan review sheet (all levels of all designs, light theme, with facts) rendered to PDF or PNG with headless Chrome; verify it is complete and legible
- [x] 6.2 Get maintainer approval of the plans (apply any requested changes, re-validate, re-export) and record it in `src/designs/README.md`; verify approval is recorded before `render-pipeline` begins
