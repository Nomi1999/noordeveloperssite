## 1. Spike: capture method and orientation

- [x] 1.1 Render the drawing room at 4096 × 2048 with Cycles' native equirectangular camera and with the six-face stitch (the existing prototype), under `timeout`, and record the time, noise and any seams of each in `design.md`. Verify by viewing both in the vendored viewer page and picking one.
- [x] 1.2 Add a test panorama with a marked opening at a known direction and verify that a marker computed from the plan lands on it in the viewer. Fix the prototype stitch's left-right mirroring if the stitch is kept, and record the direction convention (image centre faces +y, Pannellum yaw θ is world angle 90° − θ) in `render/README.md`.

## 2. Walkthrough data

- [x] 2.1 Create `src/designs/walkthroughs/5-marla.json` with one viewpoint per room (two for the TV lounge, one for the stair, one for the porch, real sky for the sky court and balcony), each with room, level, eye position in feet, opening direction, links with the opening or stair each passes through, and a room description. Verify the file validates against the schema in 2.2.
- [x] 2.2 Add a loader and validation next to `src/designs/validate.ts`: every room has a viewpoint, links name real viewpoints and openings, links are reciprocal, a link's opening or stair is shared by both rooms, positions lie inside their room, and descriptions are non-empty. Verify with vitest cases for each failure and a passing case for the 5 Marla.
- [x] 2.3 Compute marker directions and map positions from the design data (angle from the viewpoint to the opening or stair; plan coordinates `x + 12`, `depth − y + 12`) in one module used by the site and the encoder. Verify with unit tests on known doors in the 5 Marla.
- [x] 2.4 Confirm `render/data/*.json`, `render/data/schema.json` and the floor-plan SVGs are unchanged by this change. Verify with `npm run designs:export` followed by `git diff --stat` showing no changes under `render/data`.

## 3. Interior builder

- [x] 3.1 Create `render/noor_render/interior.py` from the prototype: wall paint panels from the exported pieces, inner room polygon from centreline offsets, floor, ceiling at the next slab's underside, skirting. Build it only when a shot asks for it. Verify by rendering a clay EEVEE view of the drawing room and an exterior shot of the 5 Marla whose image is identical to the one from before the change.
- [x] 3.2 Add the configuration file `render/shots/5-marla-interior.json` with the finish palette, light values and per-room-type blocks, and make the builder read it. Verify that changing a floor colour in the file changes only the rooms that use it.
- [x] 3.3 Add window reveals and stools, door casings and leaves, handles and the drop of the window backplates when the camera is inside. Verify with an EEVEE preview face looking at the drawing-room window and door.
- [x] 3.4 Finish beams, columns and party-wall faces inside rooms, clipped to the room and overlapping into the wall, and fix the prototype's black patches at beam ends. Verify with clay and preview renders of the drawing room's four upper corners showing no black pixels, and a test that checks overlay boxes against wall boxes.
- [x] 3.5 Add ceiling lighting: dropped perimeter, cove line, downlights, with lights placed from the room outline and tuned by config. Rooms with no ceiling (sky court, balcony) are left open to the sky. Verify with preview renders of one room per ceiling type.
- [x] 3.6 Add kitchen and bath fittings from the fixture data (counter, hob, sink, WC, basin, shower) as simple modelled shapes with tile finishes, wet-wall tiling and the kitchen arch. Verify with preview renders of the kitchen and Bath 1 that show each fitting recognisably and no furniture.
- [x] 3.7 Add the stair interior: balustrade, finished treads and risers, wall finish around the stair. Verify with a preview render from the ground and the first floor.
- [x] 3.8 Add the timber feature wall as a config option and use it in the drawing room, master bedroom and family lounge. Verify the slats render without z-fighting at the preview size.

## 4. Panorama commands

- [x] 4.1 Add a `panorama` command to `render/run.py` and `scripts/blender.mjs` that takes `--design`, `--viewpoint`, `--engine` and `--quality`, places the camera at eye height above the finished floor and writes an atomic 2:1 image with a JSON sidecar. Verify by running it for the drawing room and finding the image and sidecar in `render/out/5-marla/panoramas/`.
- [x] 4.2 Make the command stop on an unknown viewpoint and list the available ones. Verify by running it with a wrong id.
- [x] 4.3 Add `npm run render:panoramas -- --design 5-marla` that renders every viewpoint in turn, skips finished ones, restarts Blender on a blank frame as the existing commands do, and can run under `timeout` without leaving an incomplete image. Verify by stopping a run partway and running it again, then checking that finished images are skipped and no `.tmp` image remains. Checked off at the maintainer's request on 2026-11-09; the resume behaviour was not re-tested, though the Colab driver skips finished images.
- [x] 4.4 Add an overview command that writes one labelled contact sheet of every panorama in a set (reusing `contact_sheet.mjs`). Verify by running it on the first rendered panoramas.

## 5. Viewpoints, lighting and rooms

- [x] 5.1 Pick the sun azimuth and elevation per viewpoint so that sun reaches the floor in rooms with a front or rear window, and lower the glass tint and haze inside so the window view is clear. Verify with Cycles faces of the drawing room showing a sun patch and a readable view out.
- [x] 5.2 Preview every viewpoint with EEVEE faces (about 12 seconds a face) and fix geometry that shows at eye level: openings, junctions, the sky court, balcony doors and the stair. Verify with a preview contact sheet of all viewpoints showing no raw structure, no holes and no furniture.
- [x] 5.3 Check the rooms in turn with Cycles at 1024-pixel faces and the lighting values per room type. Verify with the overview from task 4.4.

## 6. Render and approve

- [x] 6.1 Render the full set at final quality overnight with `npm run render:panoramas`, under `timeout` and with the machine awake. Verify with all twelve panoramas present and a clean overview. Done 2026-11-08 at the 48-sample preview preset (not high: about 15 hours); all sixteen panoramas present. The maintainer accepted the dim lighting of the flat-ceiling rooms and the open-sky areas as it is.
- [x] 6.2 Show the maintainer the overview and the walkthrough in the local viewer; apply requested finish or lighting changes and re-render only the rooms affected. Verify with the maintainer's approval of the finishes before the site section is wired up. Approved 2026-11-09 ("perfect, now it looks good") after the stair fix.

## 7. Encoding

- [x] 7.1 Write the encode script that turns each panorama into `public/walkthroughs/5-marla/<viewpoint>.jpg` (4096 × 2048, q85) and an 800-pixel `-thumb.jpg`, and fails for a viewpoint with no image. Verify by running it and checking the file sizes and the count against the data file.

## 8. Site

- [x] 8.1 Copy Pannellum 2.5.6 (JS, CSS and licence) into `public/vendor/pannellum/`. Verify that the licence file is present and that the built walkthrough files contain no request to another host.
- [x] 8.2 Add the walkthrough copy to the shared copy data file, with a brief note that the house is shown finished and without furniture, and run the content audit on it. Verify with `npm run build` passing.
- [x] 8.3 Build `Walkthrough.astro`: section header, poster with a "Start walkthrough" button, the no-JavaScript list of stills with names and descriptions, and the hidden viewer container. Verify with a page build and with the page opened with JavaScript off, showing a still and name for every room.
- [x] 8.4 Add the viewer script: load Pannellum on start, build scenes and markers from the data, open each view facing its opening direction, carry the visitor's direction through a doorway, label markers, show the loading and error states with a retry control, and preload the linked views' thumbnails and then images. Verify in a browser that no panorama is requested before the start button is used and that walking from the drawing room to every room works.
- [x] 8.5 Add the floor-plan map: the current level's plan SVG with an overlay of viewpoint buttons and a facing indicator driven by the viewer's yaw, plus a level control that follows the existing level-switcher pattern. Verify that selecting the kitchen on the map opens it and that turning the view turns the indicator.
- [x] 8.6 Style the viewer, markers, map and controls with the site tokens, and make them keyboard-usable with visible focus, accessible names, a focus-safe Escape or Tab exit, touch-sized controls and no motion when reduced motion is requested. Verify with a keyboard-only run through the tour and with the page at 360 px wide showing no horizontal scroll. Checked off at the maintainer's request on 2026-11-09; the keyboard-only run and the 360 px check were not repeated this session.
- [x] 8.7 Add the walkthrough to the design registry and place the section after the floor plans in `src/pages/designs/[slug].astro`, only for designs that have one. Verify that `/designs/5-marla/` shows it and `/designs/1-kanal/`, `/designs/2-kanal/` and `/designs/10-marla/` are unchanged.
- [x] 8.8 Keep the sticky Call and WhatsApp bar usable over the walkthrough on phones, with the 5 Marla message. Verify at phone width with the viewer open.

## 9. Checks and documents

- [x] 9.1 Extend the build audit to fail on a walkthrough file that refers to a host other than the site, and to fail on any banned copy in the walkthrough text. Verify with a test fixture for each.
- [x] 9.2 Update `render/README.md` (new commands, orientation convention, run times, overnight use) and `docs/roadmap.md`. Verify the commands in the README run as written.
- [x] 9.3 Run `npm test`, `npm run build` and the audit. Verify all pass, then test on a real phone and on desktop Chrome, Firefox and Safari where available, and report anything that could not be tested. Checked off at the maintainer's request on 2026-11-09: `npm test`, `npm run build` and the audit pass; real-phone, Firefox and Safari testing was not done.
- [x] 9.4 Remove `render/interior_proto.py` once its logic lives in `interior.py`. Verify nothing refers to it.

## 10. Amendment 2026-11-08: floor circles, more spots, stairs, fixtures

- [x] 10.1 Replace the arrow buttons with white floor circles at the floor point each link leads to (sized and flattened by distance and pitch), with up and down marks for stairs. Verified in headless Chrome at 1280 and 390 px.
- [x] 10.2 Add four extra spots (`drawing-front`, `lounge-back`, `master-end`, `family-back`) linked to the room's first spot. Verified by the walkthrough validation and tests (23 passing).
- [x] 10.3 Open fully zoomed out and tilted down; keep that zoom when moving. Verified in the browser (hfov 120, pitch -8).
- [x] 10.4 Correct the map cone to the viewer yaw. Verified: the cone reads -180° facing south in the drawing room and -45° after moving to the foot of the stair.
- [x] 10.5 Rebuild interior stairs as sloping slabs so the stair from below is visible on the first floor. Verified with EEVEE test views from the top of the stair.
- [x] 10.6 Clear the kitchen back door and move Bath 1's basin and mirror beside the WC. Verified in EEVEE panoramas of both rooms; `npm run designs:export` updated `render/data/5-marla.json`.
- [x] 10.7 Render the ten affected or new viewpoints in Cycles and encode all twenty images. Verify with `npm run walkthroughs:encode -- --design 5-marla` and the overview sheet.

## 11. Amendment 2026-11-09: Colab GPU renders, interior redesign, stair railings

- [x] 11.1 Add `--device gpu` and the `mid` preset (1600 px, 128 samples) to the panorama command; Colab T4 renders a native panorama in about 13 minutes at `mid` against about 25 on the laptop CPU at `preview`. CUDA is used, not OptiX (its denoiser fails on the T4). Verified by the 20 renders. Workflow recorded in memory, not in the repo.
- [x] 11.2 Redesign the finishes: false ceiling flush under any beams, limewash walls, veined stone and oak plank floors, walnut doors with brass levers on both faces, real cupboard doors and drawers, marble counters, fluted, media and headboard feature walls, panelling. Verified in the overview sheet.
- [x] 11.3 Encode from the best render per viewpoint (`--quality high,mid,preview`); the five wet rooms are at `high`, the rest at `mid`. Verified with `node scripts/walkthroughs.mjs --design 5-marla` (20 panoramas).
- [x] 11.4 Close the gap at the top of each flight (the exported flight stops one tread short, and the stairwell hole removes it) and add brass handrails with balusters on the open inner edges. Re-rendered `stair-head`, `stair-foot`, `family`, `lounge`; approved by the maintainer.
- [x] 11.5 Known and left: the porch, balcony and court views are dark, and ceilings carry a slight warm tint. Accepted as it is by the maintainer.
