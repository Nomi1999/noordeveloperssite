## Context

See proposal.md for motivation. The 5 Marla is data in `src/designs/5-marla.ts`. Only `out-3`, `f-3` and the front parapet carry a material (`brick-cladding`); everything else falls back to `plaster-white`. Its facade list holds a porch soffit, a porch pier and the black jaali, and its boundary is a 5 ft `plaster-white` wall with one `wood-panel` gate. The finish helpers (`finishKit`, `boundaryKit`, `cladding`, `tileJoints`, `slatRun`, `sconces`, `washLights`) are already shared in `helpers.ts`. The material library already has everything needed.

The approved stills come from an AI restyle, which keeps what its prompt names and invents what it doesn't, so its notes matter as much as the geometry.

## Goals / Non-Goals

**Goals:**
- Make the exterior and boundary look modern and sophisticated with no brick.
- Keep the 5 Marla the light, warm house of the four, distinct from the dark 1 Kanal, 2 Kanal and 10 Marla.

**Non-Goals:**
- New materials, textures or renderer features.
- Changing the 5 Marla's rooms, openings or cameras.
- Cycles finals: the fast path is what the 1 Kanal, 2 Kanal and both Marla houses use.

## Decisions

### Palette: tonal and warm, black only as accent
The brick's replacement is refinement, not another statement material. One warm family (sand plaster, beige tile, timber) with grey stone piers and the black jaali, window frames and charcoal lines as the only contrast. The maintainer rejected bronze (tile and marble) after seeing it in the previews: it read as loud orange.

| Part | Finish |
|---|---|
| Street bay (`out-3`, `f-3`, front parapet) | Beige tile panels with joints; a thin charcoal reveal line at each slab edge |
| Balcony frame, side returns, other walls | Sand plaster |
| Balcony street-facing cheek | Timber slats, matching the porch soffit; the left flank stays sand plaster |
| Porch pier (under the balcony frame) | Sand plaster, the same as the frame and the wall opposite; the gate piers are grey stone |
| Roof edge, stair room | Thin charcoal cap; sand plaster |
| Balcony | Black jaali kept; soffit downlights and wall lights |

*Alternatives:* timber-forward (rejected: upkeep, and the soffit and gate are already timber) and natural stone with cream plaster (rejected: too near the Kanal houses' stone).

### Facade panels, as on the Kanal houses
Wall materials set the plain areas; detailed areas are panels on top, holed around openings with `cladding` and `tileJoints`. Windows and doors stay where they are, so plans and room facts are unaffected. Setting wall materials alone can't give tile joints, slats or a partial-height reveal.

### The boundary gets a panel material parameter
`boundaryKit` builds stone panels in `stone-tile-grey` only, to 7 ft. It gains an optional panel material, top and hood height that default to the current values, so the 1 Kanal and 2 Kanal exports stay byte-identical, which proves the change. *Alternative:* copying the helper into `5-marla.ts` would leave two copies to keep in step.

The 5 Marla's boundary is mostly its 9'-4" car gate and a 14 ft stub, so the gate and piers carry the design: a sand-plaster base, a solid beige tile wall above it with a thin charcoal reveal line and a charcoal cap, grey stone piers with charcoal caps, and a black gate with timber doors. A pier can't stand forward of the plot line, because the design checker refuses it, so panels stand inside the wall's thickness as on the 2 Kanal. Whether `boundaryKit` fits a rectangular plot's edges is confirmed in a spike (task 2.1), since it has so far been used with the Kanal plots.

### The wall is solid, and the gate has a wicket
The first preview used hooded timber slats beside the gate. The maintainer said it looked like a fence with gaps, and then that the timber board texture on a wall looked bad, so the wall is beige tile like the bay and timber stays on the gate only. The maintainer also noted that the gate had no small gate. A separate pedestrian gate cannot fit: the porch opening is only 9'-4", and the strip beside it has no walkable route to the door, so a second gate would leave the car gate too narrow. The wicket is a second, smaller timber door drawn in the same leaf, with the black leaf showing between and around the two doors as a frame.

### The gates run pier to pier
The sand base used to run under the piers, so its front face, flush with the piers' own, showed as a differently coloured strip at their foot. The car gate now spans from the first pier to the second, and a short open gap covers the last pier, so the base stops at each pier's outer face. This is how the 2 Kanal does it. A pier cannot stand forward of the plot line.

### Shrubs go in the front strip
The paved strip at the front holds `shrub-1` to `shrub-3`. They stay, with a planter edge in a finish from the same palette, so the strip reads as a deliberate planting bed.

### Fast sources, with lighting for a lighter palette
The 5 Marla stays on EEVEE sources. Its shots take exposure and look values from the 2 Kanal, since the defaults were set for white walls, and a `5-marla` dusk override allows the new lights, because the default dusk note forbids exterior lights. Every camera is kept.

### Restyle notes name the finishes
Each shot's note names the beige tile (with its joints), the sand plaster, the timber slats on the cheek and the gate, and the grey stone piers, and says that all timber is the same pale timber and that shade only darkens it a little. The notes also say there is no brick and no bronze. The model has coloured timber orange before, and flattened tile joints.

## Risks / Trade-offs

- [The restyle may turn the timber orange, flatten the tile joints or reintroduce brick] → Per-shot notes naming each material and forbidding brick, `--attempts 5`, and side-by-side review.
- [Beige tile overlaps the 2 Kanal's palette] → It is a small accent there and the main surface here. Review all four lead stills together against the distinct-facades requirement.
- [`boundaryKit` may not fit the 5 Marla's edges] → A spike comes first, and the fallback is placing the panels directly in `5-marla.ts` with the same primitives.
- [More lights make an EEVEE dusk hang more likely] → Every render runs under `timeout`. If needed, cap room-light reach with `light.roomReach`.
