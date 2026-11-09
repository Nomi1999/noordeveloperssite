## Context

See `proposal.md` for why. This is what already exists and constrains the approach.

- **The model reaches the inside.** `src/designs/5-marla.ts` defines rooms (outline, type, floor), walls split into solid/sill/lintel pieces around each opening, openings, fixtures and stairs, exported to `render/data/5-marla.json` in feet and converted to metres by `render/noor_render/loader.py`. Wall outlines sit on wall **centrelines**; each wall is a brick core with a 12 mm finish skin on both faces.
- **The exterior pipeline is exterior-only.** `Scene` builds structure, facade, site and vegetation. Interior-facing faces carry the exterior plaster, windows get a "backplate" card behind them so they never read as voids, and nothing has a ceiling or floor finish. Interior room lights exist only for dusk.
- **Engines.** EEVEE ignores the panoramic camera in Blender 5.0.1 and its fast GI is blotchy in closed rooms. Cycles (CPU only, 12 threads) took 2.5–3 minutes for one 1024 px face of the prototype.
- **Prototype.** `render/interior_proto.py` built the drawing room by adding thin overlay objects over the existing scene, rendered six Cycles faces and stitched them in numpy. The maintainer approved its look on 2026-11-07. It is gitignored output, and its code is a throwaway.
- **Site.** Astro static site. Design pages are `src/pages/designs/[slug].astro`; floor plans come from `renderPlan` in `src/designs/plan.ts` (viewBox in feet, `X = x + 12`, `Y = depth − y + 12`); stills come from the registry in `src/designs/renders.ts`. Content rules are enforced at build time by `scripts/audit-content.mjs`.

## Goals / Non-Goals

**Goals:**
- One walkthrough data file drives the render, the markers, the map and the no-JS fallback, so a room cannot be missing from one and present in another.
- Finishes, lights and viewpoints are configuration, not edits to the model or to Blender files.
- A second house can get a walkthrough by adding content only.
- The existing exterior renders, floor plans and design exports stay byte-identical.

**Non-Goals:**
- Furniture, staging, people or day/night switching inside the tour.
- Interior renders for the 1 Kanal, 2 Kanal or 10 Marla.
- A real-time 3D model. Views are pre-rendered images.
- Translating the tour or adding voice/audio.
- AI restyling of the panoramas. It would break seams and direction, so panoramas come straight from Cycles.

## Decisions

### D1. Pannellum 2.5.6, vendored
Use Pannellum (MIT, 56 KB JS, 10 KB CSS) copied into `public/vendor/pannellum/`. It does equirectangular panoramas, hotspots, multi-scene tours, keyboard control, gyro, fullscreen and touch, with no build step and no dependencies.
Alternatives: Photo Sphere Viewer (adds three.js, several times larger), Marzipano (multi-resolution cube tiles, little recent maintenance), a hand-written WebGL viewer (the cost is touch, inertia, hotspots and accessibility we would reproduce). Pannellum's stock chrome is restyled with site tokens; its scenes API gives hotspot navigation for free.
Own-domain only: no CDN, so nothing leaves the site.

### D2. One data file per walkthrough, in the design source tree
`src/designs/walkthroughs/5-marla.json` lists viewpoints:

```
{ "id": "drawing", "room": "drawing", "level": "ground",
  "at": [17.6, 10.1],           // feet, plot coordinates, eye position
  "facing": 270,                // world angle (deg, counter-clockwise from +x) the viewer opens on
  "links": [ { "to": "lounge", "via": "drawing-door" } ] }
```

Read by Astro (import) and by Blender (`json.load`), with the same feet-to-metres conversion the exports use. Marker directions are not authored: the angle from a viewpoint to the opening it links through (or the stair) is computed from the design data, so moving a door moves its marker. A build-time check fails the build when a room has no viewpoint, a link names a missing viewpoint or opening, links are not reciprocal, or the opening is not on a wall that touches both rooms. This lives beside the other design checks (`validate.ts`) and gets tests.
Alternative: put viewpoints in `5-marla.ts` and in the export. Rejected because it changes `render/data/5-marla.json` and the schema, and the exports must stay identical; viewpoints are presentation, not design facts.

### D3. Interior built by a render module from configuration, as real geometry
A new `render/noor_render/interior.py` builds an interior for each room that has a configuration block, in `render/shots/5-marla-interior.json` (finishes and lights per room type; room-specific overrides, such as the drawing-room slat wall). It derives the finished room from the design data the same way the prototype did: the inner face of every wall is the centreline offset by half the wall thickness plus the 12 mm skin, openings stay open because paint panels follow the exported wall pieces, and reveals, window stools, door casings and leaves are placed from opening data.
It reuses the existing material tags where they exist and adds only CC0 textures or procedural materials. Furniture is not a feature: the module has no furniture path.
Interior objects live in an `interior` collection and are built only when the shot says so, which keeps exterior renders identical. Backplates are dropped when the camera is inside.
Alternatives: bake interior surfaces into the exported model (touches every design's data and the exterior pipeline); hand-edit a .blend (violates "no hand-edited Blender file is a source of truth").

### D4. Finishes per room type, with a small fixed palette
Palette of placeholders: warm white wall paint, large-format light porcelain floor, white ceiling with a dropped perimeter and a warm cove, recessed downlights, white skirting and casings, oak door leaves, black metal handles, stone sills. Bedrooms and lounges get a feature wall; kitchen and baths get fixed fittings (counter, hob, sink, WC, basin, shower) as modelled shapes from the fixture data with tile finishes on wet walls. The palette is named in one config block so the maintainer can approve or change it from the first full contact sheet before the site section goes live.

### D5. Panorama capture: try Cycles' panoramic camera, keep the six-face stitch as a fallback
Cycles supports an equirectangular camera natively, which gives a single image with uniform noise and no seams. The prototype used six faces because EEVEE cannot. The first task is a spike that renders the drawing room both ways at 4096 × 2048 and compares time, seams and noise. If native is as good it is used; the six-face path stays only as the EEVEE preview route.
**The prototype's stitch is mirrored left to right.** In `interior_proto.py` the longitude increases to the left while the image's x increases to the right, so the east wall appears on the wrong side. This did not matter for one room but it would put every marker on the wrong side. The spike must prove orientation with a test: a viewpoint with a door at a known angle, checking that the computed marker lands on it.

**Spike result (drawing room, Cycles, 4096 × 2048, 48-sample preview, OIDN, laptop CPU).** Native equirectangular: 1472 s (24.5 min) in one uninterruptible run, no seams, uniform noise. Six-face stitch: about 2.7 min per 1024 px face, about 16 min for six, with faces kept on disk between runs. The two images agree in content and noise; the native one is the reference for direction. Decision: **the six-face stitch is the production route** because it is cheaper and resumable per face (a `timeout` or a stop loses at most one face, not a whole panorama), and native stays available as `--method native` for checks. The prototype's stitch was confirmed mirrored against the native render (door and slats on swapped sides); `panorama.stitch` uses `ang = CENTRE - lon` and reproduces the native order (slats, window, beam, door) from the same position.
Direction convention: every panorama's centre faces the same world angle (+y, into the plot). A Pannellum yaw θ (degrees, clockwise) maps to world angle `90° − θ`. Per-room opening direction is the viewer's `yaw` start parameter, derived from `facing`. The convention is written into the pipeline README.
Eye height 1.55 m above the finished floor. Final quality is Cycles `high` at 4096 × 2048 (the prototype used the `preview` preset at 1024 px faces, equal to 4096 × 2048).

### D6. Lighting
Daylight only, at a fixed mid-day setting. Interiors use the prototype's split world: the camera and windows see the sky, but light bounced in from the sky is dimmer and warmer so closed rooms are lit by their own lights and by the sun. A low sun elevation that enters the windows is chosen per room to throw a visible sun patch on the floor, a fix for the prototype's missing patch; if the front facade shades it, the sun azimuth is allowed to differ from the exterior shots because nothing outside is visible to contradict it.
The prototype's lights were rebalanced by eye (cove 8 W, downlights 12 W, sky fill 0.15, sun 4.2). They are starting values in the config, not constants.

### D7. Structure and context faults found in the prototype are fixed in the builder
- Black patches where a painted beam overlay ends: clip overlay to inner wall faces and extend into the wall, and add a test that renders a clay view of the room and looks for pure black pixels (or use mesh checks of overlay-vs-wall overlap).
- A beam that crosses a room (the drawing room has one at x = 13 ft) is finished and kept; it is real structure.
- A dull window view: the view out shows the street and neighbours at haze distance. The glass tint is reduced inside, and the haze density for interior shots is lowered. We do not add scenery the design does not have.

### D8. Delivery to the site
Panoramas are encoded by a script from `render/out/…` into `public/walkthroughs/<slug>/<viewpoint>.jpg` (JPEG q85, 4096 × 2048, ~0.4–0.8 MB each) and a small `-thumb.jpg` (800 px) used for the no-JS fallback, the preload and the poster. Fallback stills are real renders from the same views, not stock images. Alt text per room comes from the walkthrough data (a `description` field per viewpoint), validated non-empty.
Alternative: multi-resolution tiles (cube tiles from Marzipano/Pannellum tools). Rejected for now: twelve 4K images are small enough, and it would add a tile-generation step.

### D9. Viewer component and map
`src/components/walkthrough/Walkthrough.astro` renders the section: intro copy, a poster image and "Start walkthrough" button (so no panorama is requested before the visitor starts it), the no-JS stills list, and a hidden viewer container. A script loads Pannellum on start, builds scenes from the walkthrough data (serialised into the page), and lazy-preloads the thumbnails and then the full images of the linked viewpoints with `Image()` while the visitor looks around.
The map reuses the design's plan SVG (`renderPlan`) for the current level, with an overlay `<svg>` using the same viewBox so dot positions are `x + 12, depth − y + 12` in feet. Each viewpoint is a button; a "you are here" wedge rotates with the viewer's yaw (updated by `requestAnimationFrame` while the viewer moves). The level control follows the existing level-switcher ARIA tabs pattern.
Layout: on desktop the map sits in a corner of the viewer; on a phone it collapses behind a "Map" button and opens as a sheet over the view. Hotspot markers are styled as floor discs with arrows plus a visible text label so the destination is readable and the control is large enough for touch.
Reduced motion: scene changes use no fade when `prefers-reduced-motion` is set.

### D10. Content rules
The new copy ("Walk through the house", "Finished and unfurnished. You bring your own furniture.") goes in a data file with the other shared copy and passes the content audit. The section shows "Concept design". No tracking: the page makes no requests to other origins and sets no cookies; the audit is extended with a check that the built walkthrough files contain no `http(s)://` URL to another host (except the XML namespace and MIT licence text in the vendored file).

## Risks / Trade-offs

- **Interior realism without furniture and without AI restyle** → The prototype is approved; reduce risk by rendering the whole set to a contact sheet and having the maintainer approve it before wiring it into the site. Palette changes are config-only and re-render only the rooms affected.
- **Render time (about 12 viewpoints × 25 minutes ≈ 5 hours of CPU)** → Resumable and `timeout`-limited, run overnight; the Cycles-native spike may cut this. EEVEE preview renders (12 s per face) are used while choosing viewpoints and lights.
- **Kitchen, bath and stair interiors have no prototype yet** → These are where the model is thinnest (fixtures are bare boxes, the dog-leg stair is concrete steps with no balustrade or finish). The plan builds them last and treats a poor look there as a reason to simplify the fittings, not to add detail the data does not hold.
- **The model was drawn for plans and exteriors** → Expect geometry that only shows at eye level (sliding-door frames, porch walls seen from inside, the sky court, window-to-slab junctions). Budget for a clay-render pass per room.
- **Irregular TV lounge and the open stair** → The lounge outline is an L-shape that wraps the stair, so it gets two viewpoints and the stair gets its own.
- **Ceiling height differs per storey** → The ground floor's ceiling is the first slab's underside (12.5 ft); the first floor's is the roof slab's underside (23.5 ft). The builder reads the next level's slab bottom rather than a constant, and the sky court and balcony have no ceiling at all.
- **Mirrored panoramas** (see D5) → Orientation test before any viewpoint is rendered.
- **Payload** → Twelve ~0.5 MB images only load after the visitor starts and the next rooms are preloaded, which the project accepts for polish.
- **Pannellum on phones** → Its hotspot and gyro behaviour varies; test on a real phone before launch. If its stock hotspots are too small, styling is done in CSS.
- **Fixed finishes are the render team's choices** → The maintainer approves them from the contact sheet. They are not claims about what Noor builds, and the page says the design is a concept.

## Migration Plan

1. Land the interior module, viewpoint file and render commands with no site changes. Exterior renders and exports must stay identical (checked by the existing tests and a diff of `render/data`).
2. Render the set overnight, review the contact sheet, adjust config and re-render only what changed.
3. Encode into `public/walkthroughs/5-marla/`, add the component and section, deploy.
Rollback is removing the walkthrough entry from the data (the section disappears) or reverting; no existing page depends on it.

## Open Questions

- Does the porch (open to the street under the first-floor balcony) get a viewpoint of its own, or is the main door's threshold enough? The proposal lists it as a room; the answer changes one viewpoint, not the structure.
- Should the sky court and balcony be rendered with their real sky (the view up is one of the most striking in the house) or with the same neutral sky as the interior views? It only changes lighting settings.

## Amendment 2026-11-08: movement by floor circles, more spots, stairs

Feedback from the maintainer after the first full set:
- **Floor circles replace arrow buttons.** A link's marker is a white circle at the floor point it leads to (the other spot's position, or the door or stair mid-point), drawn at pitch `-atan(eye height / distance)` so it sits on the floor, flattened by that pitch and smaller with distance. Four spots were added (`drawing-front`, `lounge-back`, `master-end`, `family-back`), each linked to the room's first spot, so the larger rooms can be seen from two places. Twenty viewpoints in all.
- **Opening direction.** Through a door the next view opens in the direction of travel; to another spot in the same room it opens on that spot's own facing, so the visitor looks into the room instead of at the near wall.
- **Fully zoomed out by default** (hfov 120, which is also the maximum) with a tilt of -8° so the circles are in view. Moving turns towards the circle, zooms in with a slight blur, loads the view and eases back out.
- **Map cone.** The facing cone on the map uses the viewer yaw directly as the plan bearing (plan up is +y and the image centre faces +y). It had used `180 - yaw`, which mirrored it vertically.
- **Stairs.** The exported stair is a solid mass of concrete under each step. On the first floor the upper flight's mass filled the stairwell and hid the flight arriving from below. `interior.py` now rebuilds interior stairs as sloping slabs (a 0.25 m waist, one soffit slope) and removes the exported mass, with a light in each stairwell.
- **Design data.** The kitchen counter no longer runs into the back door (the left run stops at y 37.5 and the sink moved under the rear window), and Bath 1's basin moved beside the WC so there is room to stand at it. These change `render/data/5-marla.json` and the floor plans.
- **Re-render.** The views that show the stair, the kitchen counter or Bath 1 (`kitchen`, `bath1`, `lounge`, `stair-foot`, `stair-head`, `family`) were rendered again with the four new ones.
