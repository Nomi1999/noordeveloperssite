## 1. Baseline

- [x] 1.1 On a Colab L4 with `NOOR_GPU_BACKEND=CUDA`, render the 5 Marla `drawing` and the 1 Kanal `drawing` and `master-bath` at `mid` from the current code, and keep them as the regression baseline under `render/out/<design>/baseline-10m/`. Verify the PNGs are local and `colab sessions` shows none active.

## 2. Builder: per-room wall finish and wallpaper

- [x] 2.1 Read an optional `wall` (a paint colour, or `{ "paper": key }`) from `roomTypes` and per-room overrides in `interior.py`, and use it for the `paint-<room>` panels. Reveals, casings, door returns, ceilings and soffits take the room's paint colour, or the paper's `ground` colour. With no `wall`, every code path is as before. Verify with a Python test that loading `5-marla-interior.json` and `1-kanal-interior.json` leaves every room on `pal.wall`, and a test that a configured room gets its own material.
- [x] 2.2 Add the wallpaper materials to `materials.py` (design D3): `fan`, `ribbed`, `geo`, `blush` as procedural patterns, and `grasscloth` as a CC0 texture or a procedural weave. Each is built per room, with the pattern origin at the room's lower-left corner, one repeat size for the whole room, and a clear failure naming the room if its walls are not axis-aligned. Verify with a swatch render of all five at the planned repeat sizes, with the pattern crisp, upright and square to the corner.
- [x] 2.3 (skipped: the papers, grasscloth included, are drawn as numpy tiles in `wallpaper.py`, so there is no download and no licence) If grasscloth uses a downloaded texture, add it to `render/assets.lock.json` with its source, CC0 licence and sha256. Verify that `npm run render:fetch` succeeds on a clean `render/assets` and the licence line is correct. Skip this task, noting why, if the procedural weave wins in 2.2.
- [x] 2.4 (skipped: the existing cove is already a tray ceiling, a dropped band with a brass lip and an LED cove) Add the tray-ceiling option (design D4) if the existing cove has no step, off by default. Verify with a clay panorama of the 10 Marla drawing room showing the step and cove, and with the 5 Marla `drawing` unchanged in 2.6.
- [x] 2.5 Add the feature kind `paper` (a headboard wall in wallpaper: a thin panel over the feature wall's whole solid span, framed in brass, with a concealed light line, from the palette's papers) for the master bedroom, and a `herringbone` floor kind drawn as a tiled image like the papers, for the bedrooms. Both off by default. Verify with a local preview of the herringbone tile, and Colab probes of the master bedroom and bedroom 2 showing the paper wall (aligned to the wall's corner) and the herringbone floor.
- [x] 2.6 Regression gate: re-render the three baseline views from 1.1 with `NOOR_GPU_BACKEND=CUDA` after all builder changes. Verify with a pixel diff against the baseline that the differences are within the one-level, repeat-render tolerance in the spec (the 1 Kanal change measured about 1,100 pixels at one level on the same views). Result on CUDA/L4: 5 Marla `drawing` 1,146 pixels, 1 Kanal `drawing` 1,185 and `master-bath` 845, all at most one level. (A first 5 Marla run landed on a G4 and differed in 193 scattered dark pixels by up to 7 levels: a different GPU, so a different sampling; the L4 re-run is the gate.)

Notes: wallpapers are numpy-drawn tiles (`render/noor_render/wallpaper.py`, tested in `render/tests/test_wallpaper.py`). Design data changed: the 10 Marla gains two unlabelled rooms, `ground/stair-hall` and `first/stair-tower`, so the stair's walls are finished; `render/data/10-marla.json` was re-exported. `first/stair-tower` joins `roof/stair-room` as an excluded room (no floor to stand on). The Colab driver gained a health check, session retirement and reopen-on-failure after connection drops.

## 3. 10 Marla configuration and viewpoints

- [x] 3.1 Write `render/shots/10-marla-interior.json` with the Midnight Atelier palette (design D1: ink, ivory, greige, satin champagne brass, smoked walnut), the `style` switches the look needs, `roomTypes` for all 15 types (including `foyer`, `laundry` and `store`, which the 1 Kanal config lacks), the five wallpapers under `palette.papers`, the per-room paint colours, and warm 2700 to 3000 K light. Verify that a build of every 10 Marla room logs no fallback to `default`.
- [x] 3.2 Write `src/designs/walkthroughs/10-marla.json` with about 27 viewpoints from design D5 (the gate first, `start: "gate"`), each with level, room, eye position, facing, links through real doors, openings or the stair, and a description, plus an `excluded` entry for `stair-room`. Verify that `npm test` passes: every room not excluded has a viewpoint, links are reciprocal, and positions lie inside their rooms.
- [x] 3.3 Pick each view's position, facing and sun with EEVEE previews and perspective probes, fixing eye-level geometry faults as they appear. Report any change to `src/designs/10-marla.ts` and its export. Verify with an EEVEE overview contact sheet of all views.
- [x] 3.4 Check every view on a Cycles `preview` panorama at 1280 px on an L4: wallpaper alignment at openings and corners, the dark rooms' brightness, no black pixels, no raw structure, no z-fighting. Fix what shows. Verify with the contact sheet, `render/out/10-marla/`.

## 4. Style gate

- [ ] 4.1 Render `drawing`, `master-bath` and `kitchen` at `mid` on Colab (G4 if available, else L4 with OptiX) and show them to the maintainer in the local viewer next to the matching 1 Kanal views. Verify with the maintainer's approval of the look, and adjust the config until they approve. (Approval is deferred to the maintainer's review of the finished walkthrough on the local site.)

## 5. Full render and review

- [x] 5.1 Render all views at `mid` with the Colab driver (G4 first, then L4), re-rendering at `high` only the views that smudge after denoising. Verify that every PNG is present locally, `colab sessions` shows none active, and no view has black pixels or visible noise at full size.
- [ ] 5.2 Make the overview contact sheet and review it with the maintainer in the local viewer. Re-render only the rooms affected by requested changes. Verify with the maintainer's approval recorded in this task.

Notes: all 28 views were rendered at `mid` (no view needed `high`); the colab driver recovered from several dropped connections and one hung session setup. 5.2 and 4.1 wait for the maintainer's review of the finished walkthrough on the local site.

## 6. Site

- [x] 6.1 Encode the panoramas and thumbnails into `public/walkthroughs/10-marla/` with `npm run walkthroughs:encode`. Verify that each panorama is 4096 × 2048 and under about 1 MB, and that every view has a thumbnail.
- [x] 6.2 Add a vitest case that the glob finds `5-marla`, `1-kanal` and `10-marla`, and verify `npm test` and `npm run build` pass.
- [x] 6.3 Check the 10 Marla page in a browser: the section follows the floor plans; no panorama loads before Start; markers, map, storey switch, keyboard and reduced motion work; the no-JavaScript list shows every room; a 360 px portrait width is usable. Verify the content audit passes.
- [x] 6.4 Confirm nothing else moved. Verify that `git diff --stat` shows no change to the 5 Marla or 1 Kanal walkthrough files or panoramas, none under `render/data/` other than an intended `10-marla.json` fix, and that their pages render as before.

## 7. Walking links and a 3D scan feel (added after the first review)

- [x] 7.1 Add `walking` to the walkthrough schema and the line-of-sight links (`canSee`, `sightLinks`, `walkLinks` in `src/designs/walkthrough.ts`), with the viewer keeping the heading when walking. Verify with a vitest case on the 10 Marla and that the 5 Marla tour is unchanged.
- [x] 7.2 Fix from the review: the kitchen counter off the back door, the foot of the stair seen head on (and its stair room excluded), the missing top tread of a flight rising along y, a fitted closet in bedroom 2, and the links in the corridor.
- [x] 7.3 Dense spots, generated: `scripts/gen-walk-spots.py` places a lattice of spots in every room and one in every inside doorway (10 Marla: 75 spots, up from 44). The inside doors are rendered open (`style.openDoors`, leaves swung against the wall); the front and back doors stay closed. Rendered at `mid` on Colab (G4, L4 fallback, three sessions at a time) with a depth image for every spot.
- [x] 7.4 A 3D viewer (`src/components/designs/depth-viewer.ts`): each spot is a panorama draped over its depth, the camera glides between spots with the two blended; a ring on the floor under the cursor and click-to-nearest-spot, arrow keys to walk forward and back, flat Pannellum viewer as the fallback. Encoder copies the depth images. Verify in a browser: walked gate, porch, lounge, kitchen doorway and kitchen with the arrow keys; every one of the 225 image and depth files loads; `npm test` and `npm run build` pass; 5 Marla files unchanged.
- [ ] 7.5 The maintainer's review of the feel on the local site, then the same for the 1 Kanal (generate its spots, render, encode).
