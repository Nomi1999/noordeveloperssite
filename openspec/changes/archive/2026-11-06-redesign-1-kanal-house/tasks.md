## 1. Model extensions

- [x] 1.1 Add optional `plot.outline` and `plot.label` with outline-based area, size and outside-plot checks, and verify with new unit tests for an irregular plot and an element in the bounding box but outside the outline
- [x] 1.2 Make `boundaryPieces` follow outline edges with mitred corners and edge-based gate offsets, and verify with a unit test plus `npm run designs:export` leaving `render/data/2-kanal.json`, `5-marla.json` and `10-marla.json` byte-identical
- [x] 1.3 Add the `study` room type, the new material tags, porch `cars`, the `panel` facade element, `face` on boxes and the `pot` planting kind, and verify with `npm test`
- [x] 1.4 Add `l-shaped` and `spiral` stairs to the model, geometry, export and plan drawing, check `dog-leg` with `up: "right"`, and verify with stair unit tests
- [x] 1.5 Draw the plot outline in `plan.ts` and add `plotDimensions(facts)`, then use it in `designs/index.astro`, `designs/[slug].astro`, `plans-review.astro` and `plan.ts`; verify the 2 Kanal still reads `75'-0" × 120'-0"`

## 2. The 1 Kanal plans

- [x] 2.1 Trace walls and openings from the PDF vectors into a scratchpad table, using the scales in design.md, and verify by overlaying the table on a raster of each sheet
- [x] 2.2 Rewrite `src/designs/1-kanal.ts` with the plot, ground and first floor walls, openings, rooms, fixtures and stairs, and verify that it validates with no errors
- [x] 2.3 Apply the renders-win changes (hollow pier, side-facing terrace door, set-back study, corner glazing, side terrace) and verify them on the generated first floor plan
- [x] 2.4 Add the inferred roof level (parapet, hidden tanks, outdoor stair arrival, no stair room) and site works, and verify `facts.roof` matches the spec
- [x] 2.5 Rewrite the 1 Kanal block of `program.test.ts` for the new program, including a table of every labelled room size with a 3" tolerance and the study exception, and verify with `npm test`
- [x] 2.6 Run `npm run designs:export` and verify only `render/data/1-kanal.json` and any additive `schema.json` lines change
- [x] 2.7 **Review stop:** generate the ground, first and roof plan sheets, place them beside the supplied plans, and wait for the maintainer's approval; record it in the approval table in `src/designs/README.md`

## 3. Facade data

- [x] 3.1 Add helpers for slat runs, tile grids with reveals, LED pairs and sconces to `helpers.ts`, and verify with unit tests on positions and counts
- [x] 3.2 Model the house facade in `1-kanal.ts` (upper slab and fascia, lower canopy, wood soffits, feature wall, porch marble and bronze tile, granite columns, entrance panel, pier, travertine walls, side stone mass, pergola, side slat panel, slot windows, glass railings), and verify it validates
- [x] 3.3 Model the boundary (stone tile, lit slat panels under dark hoods, lattice screen, timber pedestrian door, granite piers, white base) along all edges including the slanted one, and verify it validates

## 4. Renderer

- [x] 4.1 Make `site.py` use the plot outline for ground and boundary, and verify with a clay aerial still of the 1 Kanal under a time limit
- [x] 4.2 Add the side street and neighbour removal from `context.sideStreet`, and verify that the 2 Kanal's neighbour positions are unchanged and the 1 Kanal clay side view is open
- [x] 4.3 Add and fetch the CC0 textures, record them in `assets.lock.json`, map the new material tags in `materials.py`, and verify `npm run render:fetch` checksums pass and a material test still looks right
- [x] 4.4 Build `panel` elements, spiral treads and pots in `facade.py` and `site.py`, and verify them in a clay still
- [x] 4.5 Add LED strips, sconces and wash lights to `lighting.py` and `materials.py`, with the `time_of_day` fade, and verify with a day and a dusk EEVEE test still under `timeout`
- [x] 4.6 Add the new roles to the finish phase in `construction.py`, and verify with a clay still at `--build 4.5` that they don't appear early
- [x] 4.7 Add per-shot `hideBoundary` with a low kerb, and verify front-dusk shows the kerb while street shows the wall

## 5. Source renders

- [x] 5.1 Rewrite `render/shots/1-kanal.json` with the five shots and framings from design.md, and verify the camera positions with quick EEVEE previews under `timeout`
- [x] 5.2 Remove `1-kanal` from `CYCLES_FINAL`, move the old terrace edit to `HERO_EDIT`, and verify from a script dry run that `--design 1-kanal` selects five still jobs and no hero job
- [x] 5.3 Render all five sources with `node scripts/enhance-renders.mjs sources --design 1-kanal` under a time limit, and verify none is blank
- [x] 5.4 **Review stop:** place each source beside its elevation render, correct geometry, heights and study width from feedback, and wait for the maintainer's approval before any image call

## 6. AI stills

- [x] 6.1 Add `SHOT_NOTES["1-kanal"]` and the lighting and aerial overrides, and verify the assembled prompts by printing them; other designs' prompts must be unchanged
- [x] 6.2 Move `render/out/ai/1-kanal/` aside, keeping it, and run `generate --design 1-kanal --model bytedance-seed/seedream-5-0-flash`; verify five results exist with framing scores and report the cost
- [x] 6.3 **Review stop:** show each still beside its source, regenerate any that fail, and wait for the maintainer's approval before encoding
- [x] 6.4 Encode with `encode --design 1-kanal` and re-cut `public/og/1-kanal.jpg`; verify the sizes, and verify by checksum that `public/hero/` and the other designs' stills are unchanged

## 7. Site, docs and specs

- [x] 7.1 Add the `side` shot and rewrite the 1 Kanal alt text and captions in `renders.ts`, and verify `checkRenders` passes
- [x] 7.2 Rewrite the 1 Kanal entry in `building-types.ts` and the example in `styleguide.astro`, and verify `node scripts/audit-content.mjs` or the project's audit command passes
- [x] 7.3 Update `PRODUCT.md`, `openspec/config.yaml`, `render/README.md` and `src/designs/README.md`, including the temporary hero mismatch and the review results, and verify by re-reading
- [x] 7.4 Search the repository for the names on the reference's title block, and verify the only matches are the existing content rules that ban them and that no reference file is tracked by git
- [x] 7.5 Run `npm test` and `npm run build`, view the 1 Kanal page, designs index and home page in a browser, and verify the facts, plans, gallery and share image
- [x] 7.6 Run `openspec validate redesign-1-kanal-house --strict` and verify it passes
