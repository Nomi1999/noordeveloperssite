## Why

The home page hero video and its posters still show the earlier 1 Kanal house, while the rest of the site now shows the redrawn one. A visitor sees one house build itself and a different house in the stills straight below it. The docs flag this mismatch as something to raise before any deploy, and this change removes it.

## What Changes

- Render the construction sequence again for the redrawn 1 Kanal, in both orientations. It stays the same kind of video: 192 frames, 8 s at 24 fps, six build phases from blueprint to finished house, a continuous camera orbit, dusk to day to dusk.
- New camera paths, starting from the side-street side, which suits the new plot. The landscape video ends exactly on the approved front-dusk still's camera. The portrait video ends from the same spot, with a wider lens so the whole house fits.
- Leave the boundary wall out on the front, corner and right sides for the whole video, as the approved still does.
- Let a sequence name hidden boundary sides and context settings such as the front road's width. Today only still shots can.
- Light the sequence with the approved dusk still's settings, so the last frame matches that still, while the opening keeps its dark blue hour.
- Restyle both rendered videos with the video model `black-forest-labs/flux-video-edit` for more realism, at the maintainer's request after reviewing the renders. The restyles are what ship, and they differ from the render and the stills in ways the maintainer has accepted.
- Replace both posters with each video's own last frame, as the maintainer asked, so no image model is used.
- Re-encode the videos, first-frame images, posters and manifest under `public/hero/`.
- Remove the temporary mismatch notes from the docs, and update the record of the hero's camera and approval.
- Upscale the landscape restyle to 1920×1080 with `black-forest-labs/flux-video-upscale`, because the maintainer found 960×540 soft on a laptop, and add a 1080p landscape poster. The portrait video stays 540×960.
- EEVEE preview stays the restyle's source. No Cycles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hero-sequence`: the camera ends on the approved dusk view, the boundary stays open on the sides that view hides, and review happens in stages.
- `render-pipeline`: sequences can hide boundary sides and override scene context, as still shots can.
- `render-assets`: rebuilding the hero must leave every still untouched, hero posters follow the facade lighting rule, and a new requirement makes each poster match its last frame.

## Impact

- **Render configs and code:** `render/shots/1-kanal-hero-landscape.json`, `render/shots/1-kanal-hero-portrait.json`, `render/noor_render/shots.py`, `render/noor_render/lighting.py` (an optional `dawn` setting for the sequence opening; stills do not use it), `render/noor_render/construction.py` and `render/noor_render/geometry.py` (build order of the porch columns and spiral stair).
- **Scripts:** none changed. `enhance-renders.mjs encode` writes the posters from the last frames. Prompts for every still stay byte-identical.
- **Shipped assets:** every file under `public/hero/` is replaced at the same paths. Page code and hero copy should not need changes, and that is checked in the browser.
- **Docs:** `render/README.md`, `src/designs/README.md`, `PRODUCT.md`.
- **Local files:** the old frames in `render/out/1-kanal/` and the old raw posters in `render/out/ai/hero/` are moved aside and kept, because the renderer skips frames that already exist. `render/out/` is git-ignored.
- **Cost:** about 5 hours of unattended rendering, and four FLUX runs at $0.24 each ($0.95). One Runway Aleph run was also submitted and then dropped at the maintainer's request; it may cost about $2.24 if it completed.
- **Unchanged:** all stills and share images of every design.
