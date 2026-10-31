## Context

- Blender 5.0.1 is installed at `C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`.
- Cycles reports **no GPU devices** (HIP, CUDA, OptiX, oneAPI all empty), so Cycles is CPU-only on a Ryzen 5 7530U (6 cores / 12 threads, ~15 GB RAM). EEVEE runs on the integrated Radeon GPU.
- Input is `render/data/<slug>.json` from `house-designs`: walls already split at openings, slabs, grid, material tags.

See proposal.md for motivation and specs/ for requirements.

## Goals / Non-Goals

**Goals:**
- Renders that read as professional archviz: soft global illumination, crisp bevel highlights, believable materials, restrained vegetation, cinematic dusk.
- One scene with two continuous controls (`build`, `time_of_day`) that serves both stills and the hero sequence.
- Overnight renders that survive interruption.

**Non-Goals:**
- Interior renders or furniture.
- The hero's camera choreography and final sequence render (that's `scroll-build-hero`). This change builds and proves the machinery.
- People, cars, animated vegetation.

## Decisions

### Layout
```
render/
  run.py                  CLI entry: blender -b --factory-startup --python render/run.py -- <args>
  noor_render/
    loader.py             read + check schemaVersion, feet → meters (z up)
    geometry.py           extrude wall pieces, slabs, columns, beams, parapets, stairs, roof items
    facade.py             fins, cladding panels, canopies, railings, frames, glazing
    site.py               plot, boundary wall + gate, porch, driveway, lawn, planters, street context
    materials.py          tag → node material (PBR textures + reveal logic)
    vegetation.py         CC0 plant instances at design planting positions, hedge/grass scatter
    lighting.py           HDRI day/dusk blend, sun, fog volume, interior emitters
    construction.py       phase rig driven by scene["build"]
    shots.py              camera definitions loaded from render/shots/<slug>.json
    output.py             engine presets, atomic writes, frame skipping, contact sheets
  shots/<slug>.json       per-design camera positions, lens, sensor and look settings per shot
  assets.lock.json        CC0 assets: id, source URL, license, resolution, sha256
  fetch_assets.py         download via Poly Haven / ambientCG public APIs (urllib only)
  assets/  out/           gitignored
```
Only Blender's bundled Python and its standard library are used, so there is no pip and nothing to break in Blender's interpreter. npm wrappers: `render:fetch`, `render:still`, `render:frames`, `render:sheet`. The Blender path comes from `BLENDER_PATH`, falling back to the installed path above.

*Note for apply:* check the Blender 5.0 Python API docs for engine identifiers, EEVEE settings, material render-method and color-management names before writing code. They changed during 4.x.

### Geometry: boxes from pre-split data, then bevel
Every wall piece, lintel, sill, slab, column and beam is an axis-aligned or rotated box built from the export. No booleans are used, so there are no boolean artifacts or slow evaluation. A shared Bevel modifier (≈1 cm, 2 segments, angle-limited) gives the edge highlights that separate archviz from flat CG. Columns and beams sit inside walls (hidden once walls are built), but are visible in the structure phase.

### Materials
| Tag | Look |
|---|---|
| `plaster-white`, `plaster-warm-grey` | fine plaster texture, low-amplitude bump, slight macro variation via noise |
| `stone-cladding` | CC0 stone tiles, real displacement off (bump only, for speed) |
| `wood-panel` | CC0 wood planks, warm, with matte clear-coat |
| `exposed-concrete` | CC0 board-formed concrete |
| `metal-dark` | anodized dark bronze/charcoal, roughness 0.35 |
| `glass-clear`, `glass-tinted` | thin-wall glass with slight tint; interior backplate cards behind glass so windows aren't black voids |
| `brick-structure` | CC0 red clay brick, matching local construction |
| paving, grass, soil | CC0 textures, plus a grass scatter near camera-facing edges |

Textures use **world-space box projection** (triplanar) so scaling, building up or slicing never stretches them. This is required by the construction-phase rule.

### Construction rig: one property, shader reveals
A scene custom property `build` (0–6) drives everything through drivers:
- Each phase-able object gets custom properties `phase`, `t0` and `t1` (its local start and end within the phase, assigned by order: by level, then grid position) and a reveal `mode`.
- **Rise** (columns, walls, parapets, plinth): the material compares world Z with a driven cut height. Above the cut it is transparent, and at the cut a thin bright "fresh" line appears. Walls appear to build course by course with no stretching.
- **Form** (slabs, beams): a short drop-and-settle transform, with a cubic ease-out.
- **Draw** (phase 00 blueprint): curve objects made from wall centrelines and the plot outline, emissive in the accent color, animated with `bevel_factor_end`. They fade as the foundation rises.
- **Skin** (finishing): plaster, cladding and glazing are separate thin shells over the brick, revealed by a sweeping world-space mask, so the brick visibly turns into the finished facade.
- **Grow** (landscaping): scale from 0 with a slight overshoot.
- **Excavation**: a recessed soil patch that fills as footings appear.

Shadows respect the reveal because transparency is in the shader. EEVEE needs the material render method that supports alpha (dithered). Cycles handles it natively.

### Lighting and time of day
- A world shader mixes a CC0 daylight HDRI with a CC0 dusk HDRI using `time_of_day`.
- A sun lamp is driven by the same value: high and neutral at 0, low and warm at 1, with strength falling off.
- Interior emitters (area lights at ceiling height in rooms with exterior glazing, plus emissive backplates) ramp from 0 to full between 0.6 and 1.0, in warm white around 3000K, tuned against `--noor`.
- A light volumetric fog layer softens the subdued context.
- Color management uses the AgX view with a mild contrast look, chosen during the engine comparison.

### Context
The plot sits on a plain asphalt street with a kerb and footpath. Neighboring plots get boundary walls and low-detail generic massing in a muted plaster material, partly lost in the fog. There are a few street trees (CC0 models), placed by config. The design is always the brightest, most detailed object in frame.

### Engine decision by test, not assumption
Render the `1-kanal / front-dusk` reference shot in EEVEE (high preset, ray tracing on) and Cycles (final preset), and compare them side by side at 100% crop. Record the choice and timing in `render/README.md`.
- Expected: Cycles wins on soft GI and glass; EEVEE is 20–60× faster.
- If EEVEE is visually within reach, use it for sequences and Cycles for stills.

### Cycles final preset
Adaptive sampling (noise threshold ≈0.01, max ≈512), OpenImageDenoise with albedo and normal passes, light tree on, persistent data on, fixed seed (no per-frame seed animation; this reduces flicker), clamp indirect ≈10 to kill fireflies, and full global illumination bounces. Output is 16-bit PNG for encoding. Estimated time per 3200px still: a few minutes on this CPU.

### Encoding
`scripts/encode-renders.mjs` uses `sharp`:
- **Stills:** 16-bit PNG → high-quality JPEG (q≈90) masters in `src/assets/renders/<slug>/<shot>.jpg`. Astro's image pipeline produces responsive AVIF/WebP at build time.
- **Share images:** a 1200×630 crop per design.
- **Sequences** (used by the hero change): AVIF (quality tuned per sequence, starting at ~55) and WebP into `public/hero/<orientation>/<tier>/<nnnn>.<ext>`, plus `manifest.json` as specified. AVIF and WebP for both tiers are encoded from the same PNG source.

## Risks / Trade-offs

- [CPU-only Cycles makes iteration slow] → Develop in EEVEE preview, check with small Cycles crops, and run full Cycles only for approved shots. The resumable frames make overnight runs safe.
- [Procedural vegetation looks fake] → Use CC0 plant models (Poly Haven) with restrained placement. Prefer clipped hedges and planters (architectural planting is boxy and believable) over large trees near the camera.
- [Shader reveals behave differently in EEVEE and Cycles] → The rig is verified at fixed progress values in both engines (task 6.x) before the hero uses it.
- [Denoiser flicker in sequences] → Fixed seed, generous sample cap, albedo/normal guides. If flicker persists, increase samples for affected ranges only.
- [Asset sites change URLs] → Lockfile stores checksums. Assets are downloaded once and cached; a broken URL only affects fresh machines.
- [Blender 5.0 API differs from older examples] → Read the 5.0 docs first; pin the version in the README.

## Open Questions

- The final AgX look and exposure. Chosen visually during the engine comparison; doesn't affect structure.
