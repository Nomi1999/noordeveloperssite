## Why

All of the site's imagery will be our own renders: hero stills, design-page galleries, share images and later the scroll-build sequence. They need to look like high-end architectural visualization, not computer graphics, and they must be reproducible, because designs will change and every change means re-rendering. A scripted Blender pipeline driven by the exported design data gives both.

## What Changes

- Add a headless Blender 5.0 pipeline (Python, bundled interpreter only) that builds a full scene from a design's exported JSON: structure, walls with openings, slabs, roof features, facade elements, site works and a neutral street context.
- Map the design material tags to physically based materials made from CC0 textures (Poly Haven, ambientCG), with a fetch script and a lockfile recording every external asset, its source and license.
- Add lighting with a single **time-of-day** control from day to dusk. At dusk, interiors glow with warm light: the "Noor" look.
- Add a **construction-progress** control (0–6) that moves the whole scene through the six phases: blueprint lines on the plot, foundation, structure, walls, finishing, complete. It is driven by one scene property, so the hero only has to animate that property and the camera.
- Add shot definitions, engine and quality presets (EEVEE for iteration, Cycles for final quality), resumable frame rendering, and review contact sheets.
- Run an EEVEE vs Cycles comparison on a reference shot and record which engine is used for finals.
- Render and deliver the still set for all three designs, plus share images, and add the encoding tool and manifest format that the hero sequence will use.

## Capabilities

### New Capabilities
- `render-pipeline`: scene generation from design data, materials and assets, lighting and time of day, construction-progress phases, engines and presets, and resumable reproducible renders.
- `render-assets`: the rendered deliverables (stills, share images, encoded frame sequences and their manifest) and the rules they follow.

### Modified Capabilities
<!-- None -->

## Impact

- New `render/` directory: Python package, CLI entry, shot configs, asset lockfile, fetch script. Downloaded assets and raw renders are gitignored.
- New `scripts/encode-renders.mjs` (Node + `sharp`), plus encoded stills in `src/assets/renders/` and share images.
- Machine time: Cycles renders on CPU only (no GPU device on this machine); final stills take minutes each.
- Depends on `house-designs` (approved designs and the JSON export) and `brand-logo` (accent value for the dusk palette check).
