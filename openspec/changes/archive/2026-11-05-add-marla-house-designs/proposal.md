## Why

The site only shows 1 Kanal and 2 Kanal houses, so visitors with smaller plots see nothing that fits them. Adding 5 Marla and 10 Marla designs has been held back by render time: the current stills took 6.8 hours of CPU rendering, yet the image model only sees them at 2048px. A test on 2026-11-05 showed that fast EEVEE renders (about 1 minute for a day shot, about 3.5 minutes at dusk) restyle well, so new designs no longer need final-quality Cycles renders.

## What Changes

- Add a **5 Marla house** (25′×45′, attached on both sides) and a **10 Marla house** (35′×65′, attached on one side), each two storeys plus a roof with a stair room and water tanks.
- Give each new house its own facade, drawn from modern Pakistani houses. Neither reuses the look of the 1 Kanal and 2 Kanal houses (white plaster, dark metal fins, stone pier, glass-railed terrace) or the look of the other new house.
- Add two material tags for those facades: brick cladding and charcoal plaster.
- Apply smaller minimum room sizes to plots under 10 Marla, because the large-house minimums cannot fit a 25′ frontage.
- Add a fast path for AI-enhanced stills: EEVEE source renders at 2048px, restyled with the model named by `IMAGE_MODEL` in `.env`.
- Fix the enhancement script: it reads hard-coded designs, ignores `IMAGE_MODEL`, can restyle its own output and points at hero frames that no longer exist. It will only run on shots it is explicitly given.
- Make generated neighbouring houses fit small plots, with party walls flush on attached sides. Scenes for the 1 Kanal and 2 Kanal houses stay the same.
- Show all four designs on the designs index, the home page and What We Build, with detail pages, plans, facts, alt text and share images.

**Not changing:** the 8 existing stills, the hero video and its poster stay exactly as they are. The new designs are meant to look different from the old ones. Blender stays as the renderer: Three.js was considered and rejected (see design.md).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `building-designs`: the design program grows from two houses to four, with distinct facades for the new houses, and room-size minimums depend on plot size.
- `render-assets`: the still set adds the two new designs, and AI-enhanced stills may come from fast source renders using a configured model.
- `render-pipeline`: adds fast source renders for enhancement, and neighbouring context that fits the plot.
- `design-showcase`: the designs index stays full-width with any even number of designs.
- `home-page`: the houses section shows four cards, not two.
- `services-page`: What We Build has an entry for each of the four sizes.

## Impact

- **Design data:** new `src/designs/5-marla.ts` and `10-marla.ts`; `sources.ts`, `model.ts` (material tags), `validate.ts` (minimums), `program.test.ts`, `render/data/*` (re-exported).
- **Render pipeline:** `render/noor_render/materials.py`, `site.py`; new `render/shots/5-marla.json` and `10-marla.json`.
- **Scripts:** `scripts/enhance-renders.mjs`.
- **Site:** `src/designs/renders.ts`, `src/content/building-types.ts`, `src/pages/designs/index.astro`; new stills in `src/assets/renders/` and share images in `public/og/`.
- **Docs and config:** `render/README.md`, `src/designs/README.md`, `openspec/config.yaml`.
- **External cost:** OpenRouter image calls, about $0.018 each with `seedream-5-0-flash`. No new dependencies.
