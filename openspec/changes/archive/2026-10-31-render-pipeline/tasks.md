## 1. Setup

- [x] 1.1 Read the Blender 5.0 Python API notes for engine identifiers, EEVEE settings, material render methods, color management and command-line rendering; record differences from the design in `render/README.md`
- [x] 1.2 Create the `render/` layout, `.gitignore` entries for `render/assets/` and `render/out/`, and `run.py` argument parsing (design, shot, engine, quality, frames, build, time_of_day); verify `blender -b --factory-startup --python render/run.py -- --help` prints usage
- [x] 1.3 Add npm wrappers (`render:fetch`, `render:still`, `render:frames`, `render:sheet`) using `BLENDER_PATH` with the installed-path fallback; verify `npm run render:still -- --help` works from the repo root
- [x] 1.4 Implement `loader.py` (schemaVersion check, feet → meters, z up); verify a wrong schemaVersion stops with the expected/found message

## 2. Assets

- [x] 2.1 Select CC0 textures (plaster, stone, wood, board-formed concrete, red brick, paving, asphalt, grass, soil), day and dusk HDRIs, and plant and street-tree models; write `render/assets.lock.json` with source URL, license and sha256; verify every entry is CC0
- [x] 2.2 Write `fetch_assets.py` (stdlib only) to download and checksum locked assets; verify a fresh fetch succeeds, and that deleting one asset makes a render stop with the named-asset message

## 3. Scene building

- [x] 3.1 Implement `geometry.py` (wall pieces, lintels, sills, slabs with voids, columns, beams, parapets, stairs, stair room, tanks) with a shared bevel; verify an EEVEE clay render (single grey material) of all three designs from an aerial shot matches their floor plans
- [x] 3.2 Implement `facade.py` (fins, cladding panels, canopies, railings, window frames, glazing, interior backplates); verify with clay plus glass renders that facade elements sit on the correct walls
- [x] 3.3 Implement `site.py` (boundary wall and gate, porch, driveway, lawn, planters, street, kerb, footpath, generic neighbor massing); verify neighbors read as subdued in a preview render
- [x] 3.4 Implement `materials.py` with world-space box-projected PBR materials for every tag; verify a material test render shows no stretching on long walls or tall columns
- [x] 3.5 Implement `vegetation.py` (plant models at design planting positions, hedge and grass scatter); verify in preview that planting looks intentional and doesn't hide the facade

## 4. Lighting

- [x] 4.1 Implement `lighting.py` with the HDRI day/dusk mix, driven sun, fog and AgX color management on `time_of_day`; verify preview renders at 0, 0.5 and 1
- [x] 4.2 Add interior emitters and backplates ramping in from 0.6 to 1.0 in warm white tuned against the accent; verify that at 1.0 every camera-facing window glows and no light leaks at wall junctions

## 5. Shots and output

- [x] 5.1 Write `render/shots/<slug>.json` for all still shots in the spec (lens, position, target, sensor) and `shots.py` to load them; verify EEVEE preview renders of every shot frame the building well
- [x] 5.2 Implement `output.py` (EEVEE and Cycles preview/final presets, fixed seed, denoising passes, 16-bit PNG, atomic temp-then-rename writes, skip-existing frames); verify that interrupting a 10-frame range and re-running resumes without re-rendering or leaving partial files
- [x] 5.3 Implement contact sheets with labels (shot, frame, build, time of day); verify a sheet from a 10-frame preview range

## 6. Construction rig

- [x] 6.1 Implement `construction.py`: per-object phase, t0, t1 and mode assignment, the `build` driver, and the rise, form, draw, skin, grow and excavation reveals; verify a contact sheet at `build` 0, 0.5, 1 … 6 for the 1 Kanal design in EEVEE
- [x] 6.2 Verify the support-order rule by stepping `build` in 0.05 increments (low-res EEVEE) and checking the sheet for floating elements; fix ordering until clean
- [x] 6.3 Verify the rig in Cycles at `build` 1.5, 2.5, 3.5 and 4.5 (small crops) and confirm reveals and shadows match EEVEE

## 7. Engine decision

- [x] 7.1 Render `1-kanal / front-dusk` with EEVEE high and Cycles final, with timings; build a side-by-side and 100% crop comparison
- [x] 7.2 Review the comparison with the maintainer, choose the engine for stills and for sequences, set the AgX look and exposure, and record everything in `render/README.md`; verify the decision is recorded

## 8. Deliverables

- [x] 8.1 Write `scripts/encode-renders.mjs` (stills → JPEG masters, 1200×630 share crops, sequence → AVIF/WebP tiers plus manifest per the spec); verify on a 10-frame test sequence that manifest fields, byte totals and file layout match the spec
- [x] 8.2 Render all eleven final stills with the chosen engine and encode them into `src/assets/renders/`; verify each is at least 3200px wide and passes the pixel-level quality review at 100%
- [x] 8.3 Review every still against the content rules (no text, logos, people, plates, real places) and get maintainer approval; record approval in `render/README.md`
- [x] 8.4 Produce share images for the three designs; verify 1200×630 with the subject clear of the edges
