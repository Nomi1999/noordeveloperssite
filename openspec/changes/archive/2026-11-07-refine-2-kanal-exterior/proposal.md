## Why

The maintainer wants the 2 Kanal's exterior and boundary wall to look as modern and sophisticated as the redesigned 1 Kanal, whose combination of materials and textures now makes the 2 Kanal look plain: nearly every surface is white plaster, with one thin stone pier and plain plaster boundary walls. The maintainer also found that the terrace's glass railing leaves its third side open.

## What Changes

- Re-clad the 2 Kanal's exterior in the 1 Kanal's family of materials (grey stone tile, travertine, timber slats, charcoal plaster, bronze tile and marble, black granite, sand plaster) with tile joints, LED lines, wall lights and downlights, composed for its own massing rather than copied from the 1 Kanal.
- Add a charcoal roof overhang with a timber soffit above the terrace, a deep white porch beam and black granite porch columns. Room layouts stay the same. Floor plans gain only the columns, gate piers and the completed railing.
- Rebuild the boundary as a white base with finished panels above: stone tile, hooded timber slats, a lattice screen and a bronze plate on the front, granite gate piers and plain plaster on the sides and rear.
- Keep the car gate closed, in black metal, at 7 ft. The pedestrian gate becomes timber.
- Add an optional height to a gate, because a closed gate otherwise takes the height of the low boundary base.
- Close the terrace's open third side with real glass in the design data. Remove the AI edit pass that tried to paint it in.
- Move the generic finish helpers out of the 1 Kanal's file so both houses share them, with the 1 Kanal's export staying byte-identical.
- Give the 2 Kanal's shots the 1 Kanal's lighting values, keeping every camera.
- Replace the four 2 Kanal stills and its share image, from EEVEE sources through the existing restyle, with two maintainer reviews.

**Not changing:** the 1 Kanal, 5 Marla and 10 Marla designs, exports and stills, the hero video and posters, and the 2 Kanal's rooms and cameras.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `building-designs`: the 2 Kanal gains exterior finish and terrace requirements, and a gate may declare its own height.
- `render-assets`: the 2 Kanal's stills are replaced from fast sources, without changing any other design's stills or the hero.

## Impact

- **Design data and model:** `src/designs/2-kanal.ts`, `1-kanal.ts`, `helpers.ts`, `model.ts`, `export.ts`, the design tests, `render/data/2-kanal.json`.
- **Render config:** `render/shots/2-kanal.json`.
- **Scripts:** `scripts/enhance-renders.mjs`.
- **Site:** `src/designs/renders.ts`, the 2 Kanal stills and `public/og/2-kanal.jpg`. The designs index, What We Build and the home page's dusk band change without edits, because they use those stills.
- **Docs and config:** `render/README.md`, `src/designs/README.md`, `openspec/config.yaml`.
- **External cost:** OpenRouter image calls, about $0.02 each, at most about $0.40. No new textures or package dependencies.
