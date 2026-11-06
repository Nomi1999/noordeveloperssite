## Why

The maintainer wants the 1 Kanal design on the site to be a specific, resolved house rather than the generic white-and-fins concept: a contemporary corner house with a double-height entrance, stone, timber slats and a strong dusk lighting scheme. They have supplied its ground and first floor plans and five elevation renders as the reference. The current model cannot draw it: plots must be rectangles, there is one street, and the scene has no facade lighting beyond soffit downlights.

## What Changes

- **BREAKING (design data):** replace the 1 Kanal design with the referenced house, on its real five-sided corner plot, keeping the `1-kanal` slug and the "1 Kanal" label. Covered area, measured the site's way, rises from about 4,685 to about 5,296 sq ft. The reference's title blocks state 5,926 sq ft, and the maintainer accepted the site's figure so that all designs are measured alike.
- The new 1 Kanal has no servant room, laundry, store or stair room. This applies to this design only. It adds a double-height stair lobby, an upstairs kitchenette, a study, an outdoor stair to the roof and a spiral stair at the rear.
- Where the plan and renders disagree, the renders decide the stone pier, the terrace door and the study corner window with its side terrace. The plan decides everything else. No roof plan exists, so the roof is inferred, and no drawing gives heights, so they are estimated from the renders.
- Add to the design model: non-rectangular plot outlines, a plot size label, spiral and L-shaped stairs, a declared porch car count, free-angled facade panels, a study room type, and new material tags.
- Add to the renderer: plot outlines, a corner street, emissive LED strips, up-and-down wall lights and wall-wash downlights at dusk, per-shot hiding of boundary walls, and new CC0 textures.
- Render the design from five shots: the existing front-day, front-dusk, street and aerial plus a new side-street view. Restyle them with the model in `PRIMARY_IMAGE_MODEL` (`bytedance-seed/seedream-5-0-flash`) through the existing fast path.
- Update the site copy, alt text, specs, tests and docs that describe the old house.
- The cars and the house number in the reference renders are left out, furniture is not modelled, and the supplied renders are never used as site images.

**Not changing:** the hero video, its posters and its sequence configs, which get their own change later. Until then the home page hero shows the old house. The 2 Kanal, 5 Marla and 10 Marla designs, exports and stills stay exactly as they are.

**Naming rule:** the real project, its client and the firm that drew the reference are never named in the site, the repo or these artifacts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `building-designs`: the 1 Kanal program changes, and designs may have a non-rectangular plot, a size label and more stair types. The 1 Kanal must match its reference.
- `floor-plans`: plans draw the real plot outline and the new stair types.
- `render-pipeline`: scenes support plot outlines, corner streets, dusk facade lighting and shot-level boundary hiding. The rule that the 1 Kanal's neighbours stay unchanged is dropped.
- `render-assets`: the 1 Kanal still set gains a side-street view and comes from fast sources, and AI stills keep the facade lighting.
- `design-showcase`: a non-rectangular plot is described in words rather than as width × depth.

## Impact

- **Design data and model:** `src/designs/1-kanal.ts`, `model.ts`, `helpers.ts`, `geometry.ts`, `validate.ts`, `facts.ts`, `plan.ts`, `export.ts`, `program.test.ts`, `render/data/1-kanal.json`, `render/data/schema.json`.
- **Render pipeline:** `render/noor_render/` (`site.py`, `facade.py`, `lighting.py`, `materials.py`, `construction.py`, `loader.py`), `render/assets.lock.json`, `render/shots/1-kanal.json`.
- **Scripts:** `scripts/enhance-renders.mjs`.
- **Site:** `src/designs/renders.ts`, `src/content/building-types.ts`, the pages that print plot dimensions, `src/pages/styleguide.astro`, the 1 Kanal stills and `public/og/1-kanal.jpg`.
- **Docs and config:** `render/README.md`, `src/designs/README.md`, `PRODUCT.md`, `openspec/config.yaml`.
- **Pages that change without edits:** home, about and What We Build use 1 Kanal stills, so they show the new house.
- **External cost:** OpenRouter image calls, about $0.018 each, expected under $1. New CC0 texture downloads. No new package dependencies.
