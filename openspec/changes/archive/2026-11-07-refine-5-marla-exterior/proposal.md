## Why

The maintainer finds the 5 Marla's exterior and boundary wall bland. One bay is flat terracotta brick, which the maintainer doesn't find modern or sophisticated, and the rest of the house falls back to the schema's `plaster-white`. The boundary is a 5 ft white plaster wall and a timber gate between plain grey block piers, with none of the finish panels, lights or planting that the 1 Kanal and 2 Kanal now have.

## What Changes

- Drop the brick. The street bay (`out-3`, `f-3`, and the front parapet) becomes large-format beige tile with fine joints, with a thin charcoal reveal line at each floor.
- Re-clad the rest of the exterior in warm sand plaster, with timber slats on the balcony's street-facing cheek that continue the porch soffit, a sand plaster porch pier and a thin charcoal roof cap. No exterior wall or parapet stays `plaster-white`.
- Keep the black metal jaali across the balcony, which the maintainer likes. Add wall lights and soffit downlights so the dusk still reads warm.
- Rebuild the boundary as a solid wall: a sand-plaster base, beige tile above it to a charcoal cap, grey stone piers with charcoal caps and wall lights. The car gate is black with timber doors, and has a wicket door beside its main leaf. The planter strip in the front paving gets shrubs.
- Let the shared boundary helper take its panel material, top height and hood height, because it builds grey stone to 7 ft only today.
- Give the 5 Marla's shots lighting values for the lighter palette, keeping every camera.
- Replace the four 5 Marla stills and its share image, from EEVEE sources through the existing restyle, with two maintainer reviews. Rewrite their alt text, which names the brick and white plaster.

The palette is deliberately the light, warm one. The 1 Kanal, 2 Kanal and 10 Marla are all dark and stone or concrete heavy, so this keeps the 5 Marla distinct without reusing their combinations.

**Not changing:** the 1 Kanal, 2 Kanal and 10 Marla designs, exports and stills, the hero video and posters, and the 5 Marla's rooms, openings and cameras. Floor plans change only by the pier's material, not by any drawn element.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `building-designs`: the 5 Marla's facade requirement changes (no brick, light warm palette), and it gains boundary finish requirements.
- `render-assets`: the 5 Marla's stills are replaced from fast sources, without changing any other design's stills or the hero.

## Impact

- **Design data:** `src/designs/5-marla.ts`, the design tests, `render/data/5-marla.json`.
- **Shared helpers:** `src/designs/helpers.ts` (boundary panel material and height), with the 1 Kanal and 2 Kanal exports staying byte-identical.
- **Render config:** `render/shots/5-marla.json`.
- **Scripts:** `scripts/enhance-renders.mjs` (per-shot notes for `5-marla`).
- **Site:** `src/designs/renders.ts`, the 5 Marla stills and `public/og/5-marla.jpg`. The designs index, What We Build and the home page's dusk band change without edits, because they use those stills.
- **Docs:** `render/README.md` and `src/designs/README.md`.
- **External cost:** OpenRouter image calls, about $0.02 each, at most about $0.40. No new textures or package dependencies.
