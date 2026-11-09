## Why

The site shows each house as a handful of exterior stills and flat floor plans. A visitor can see what the house looks like from the street but not what it is like to stand inside it, which is what an apartment-complex site shows with its interior tour. Noor Developers delivers every house fully finished, so a finished interior is a real part of the offer and the site has nothing that shows it. The 5 Marla is the smallest design and has the fewest rooms, so it is the cheapest place to prove the experience before repeating it for the other houses.

A one-room prototype (the drawing room) was rendered and approved by the maintainer on 2026-11-07. It showed that the existing 3D model can be walked into and that a finished empty room looks good in Cycles on the maintainer's CPU. This change turns that prototype into the full walkthrough.

## What Changes

- **A 360° walkthrough of the 5 Marla house.** The visitor stands in a room, drags to look around, and moves by clicking white circles on the floor (other spots in the same room, and the doors and stairs to the next one) or a room on a small floor-plan map. It covers every room on the ground and first floors from about twenty viewpoints (the exact set is fixed in the design).
- **Interiors built from the design data.** The renderer gains an interior builder that reads the 5 Marla's room, wall, opening and fixture data and adds what a finished room needs: painted walls, floor finish, ceiling with a lit perimeter and downlights, skirting, window and door trim, door leaves, and kitchen and bath fittings. The result is a finished, unfurnished house, consistent with the offer that the client brings only furniture.
- **Panoramas rendered with Cycles.** EEVEE has no panoramic camera and its indirect light is blotchy indoors, so each panorama is a Cycles render, run under `timeout` and resumable. The prototype rendered six 90° faces and stitched them (about 25 minutes per room on the maintainer's laptop); the design settles whether Cycles' own panoramic camera replaces the stitch. Either way a full run is meant to be left overnight.
- **Fixes to the prototype's known faults.** Black patches where beams meet walls, no sun patch on the floor, and a flat grey view out of the window.
- **A viewer on the site.** A "Walk through the house" section on the 5 Marla page opens the walkthrough. The viewer library is vendored into the repo, with no CDN and no analytics. Panoramas load one at a time, with the next rooms preloaded, and the page works on phones and with the keyboard.
- **A no-JavaScript fallback.** Without JavaScript the section shows a still of each room with its name, in the same order as the tour.
- **Walkthroughs are optional per design.** A design with no walkthrough shows nothing new, so the other three houses are unaffected and can get theirs later as new content.
- **Placeholder finishes.** The wall, floor, ceiling and feature-wall finishes are the render team's choices, not Noor's. The maintainer approves them from the first full set of renders before the section goes live.

## Capabilities

### New Capabilities
- `interior-walkthrough`: the walkthrough experience on a design page: which rooms are visited, how the visitor moves between them, the floor-plan map, loading, input methods, accessibility, the no-JavaScript fallback and the content rules that apply to it.

### Modified Capabilities
- `render-pipeline`: gains interior panorama rendering, meaning an interior build from design data, a cube-face Cycles render stitched to equirectangular, and resumable, time-limited runs.
- `design-showcase`: a design detail page SHALL show a walkthrough section when the design has one, and SHALL be unchanged when it has none.

## Impact

- **Render code:** new interior module in `render/noor_render/`, a panorama command in `render/run.py` and `scripts/blender.mjs`, a viewpoint file `render/shots/5-marla-interior.json`, and the new `npm` scripts. `render/interior_proto.py` is replaced by this module.
- **Design data:** `src/designs/5-marla.ts` and the export gain what the interior builder needs (finish choices per room, light positions, viewpoints). Existing exports and floor plans must stay identical.
- **Site:** a new component for the viewer and its map, a section on `src/pages/designs/[slug].astro`, a walkthrough entry in the design registry (`src/designs/renders.ts`), and the panorama JPEGs under `public/`.
- **Dependency:** Pannellum 2.5.6 (MIT), copied into the repo rather than loaded from a CDN. No new npm runtime dependency.
- **Payload:** about twelve panoramas at roughly 0.5–1 MB each, loaded only when the visitor starts the walkthrough. The project already puts polish ahead of payload size.
- **Rendering time:** about 5 hours of Cycles for the full set, unattended.
- **Not affected:** the other three designs, the hero, content rules (no prices, no analytics, concept wording) and the GitHub Pages deploy.
