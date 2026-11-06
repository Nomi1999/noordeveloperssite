## Context

See `proposal.md` for why, and the delta specs for requirements. The maintainer chose an exact recreation over an adapted one.

**Reference set (outside the repo, never committed):**

- Two vector PDFs in the maintainer's Downloads folder, matching `*G.F FURNITURE LAYOUT PLAN.pdf` and `*F.F FURNITURE LAYOUT PLAN.pdf`. They have no text layer, about 26,000 and 17,000 vector paths, and are marked not to scale.
- Five JPEGs in `d:\side_projects\3d_floor_model\`: `front_elevation`, `front_elevation_2`, `front_elevation_3`, `left_side_elevation` and `left_side_full_elevation`.

**Current constraints:**

- `plot` is width × depth, assumed in `validate.ts`, `geometry.ts` (`boundaryPieces`), `plan.ts`, `facts.ts` and `site.py`.
- `_neighbours` and the road in `site.py` assume one street.
- Facade boxes are axis-aligned, and the only lights outside are soffit downlights.
- A boundary has one material.
- `BASE_PROMPT` and `NOTES.dusk` in `enhance-renders.mjs` forbid wall lights, and `NOTES.aerial` describes a stair room.
- The car calculation needs an 18' bay, so the 14' porch would compute 0 cars.

## Goals / Non-Goals

**Goals:**

- Trace the walls from the PDF vectors rather than estimating them, and check every labelled room size in a test.
- Extend the model additively, so the other three designs' exports and scenes stay byte-identical.
- Make the raw renders carry the lighting and the materials, because the hero will later use raw frames.

**Non-Goals:**

- Hero video, posters or sequence configs. Don't run `render:sequence` in this change.
- Restyling the 2 Kanal.
- Furniture, interiors or curtains as geometry. Curtains come from the backplates and the restyle note.
- Cycles finals for the new stills.

## Decisions

### D1. Tracing and measured geometry

Use PyMuPDF in the scratchpad, never as a project dependency. Plan scale comes from labelled dimensions, and the labels are authoritative over measured lengths.

| Sheet | Scale | Plot x (ft) | Plot y (ft) |
|---|---|---|---|
| Ground | 6.40 pt/ft | `(px - 110.3) / 6.40` | `(712.2 - py) / 6.40` |
| First | 8.50 pt/ft | `(px - 58.3) / 8.50` | `84.6 - (py - 139.2) / 8.50` |

**Plot outline**, counterclockwise from the front-left corner, about 5,017 sq ft:

`(0,0) → (52.8,0) → (59.2,7.0) → (52.25,90) → (0,90)`

The rear is dimensioned as 52'-3". The other edges are measured, so the tracing may refine them by a few inches.

**Starting positions**, confirmed by tracing:

| Element | x (ft) | y (ft) |
|---|---|---|
| Porch | 0–20.8 | 15–29 |
| Stair lobby | 20.8–34.6 | 22–45.6 |
| Powder room box (ground) and pier (first) | ≈29.5–36 | 15–22 |
| Drawing room | 35.3–52 | 17–37 |
| U-stair | 34.6–50.8 | 37–45.6 |
| TV lounge (ground) | 20.8–≈47 | 45.6–≈64 |
| Rear wall, outer face | | 84.6 |
| Left wall, outer face | 3.4 | |
| Upstairs bath and dressing block | 0–20.9 | front wall ≈22 |
| First-floor front terraces | 0–35.5, then to 52 | front edge 14.6, then 16.7 |

**Room types:**

- Stair lobby: `stair-hall`
- Raw kitchen: `back-kitchen`
- Upstairs lounge: `family-lounge`, named TV lounge
- Kitchenette and electrical room: `other`
- Study: new `study`, so it doesn't count as commercial `office` area
- Master bedroom: the first-floor 14'-9"×19' room with the dress/bath

### D2. Plan and render conflicts, resolved

- **Pier:** a hollow stone box rises through the first floor at x≈29.5–36, y≈15–21.4, directly above the powder room box. The passage runs forward inside it, and the terrace door sits on its right return, facing +x. This splits the plan's single terrace into a left one over the porch and a right one in front of the study.
- **Study corner:** the right wall moves in so a side terrace about 3' wide runs along x≈49.25–52, back to the side stone mass at y≈36. The corner is glazed on both faces.
- **Consequence:** the renders suggest about 4.5' of side terrace, but with the passage fixed by the void, that would leave the study about 7'-6" wide. A 3' terrace leaves the study about 9'-6" × 14'-3" instead of the plan's 12' × 14'-3". This is the only room excused from the 3" check. The final width is checked at the render review.
- **Labels against drawn walls:** the drawing's own labels contradict its walls in three places: first-floor front bedroom (labelled 16'-0" × 15'-8½", drawn 16' × 14'), first-floor front bath (labelled 13'-1½" × 7'-10½", drawn 10' × 7') and driveway (labelled 26'-6½" wide, drawn 28'-6"). The maintainer chose the drawn walls at the plan review, because they line up with the floor below.
- **Link to the pier:** the passage does not reach the pier's interior, so a floor notch of about 7 sq ft is cut from the corner of the void over the lobby, opening through the pier's rear wall.
- **Entrance:** the plan runs the left terrace and its slab across the front of the main door, but every front render shows the tall wood-and-glass entrance rising unbroken from the steps to the canopy, with the terrace stopping beside it. The maintainer chose the renders. The first-floor slab stops at x≈20.9, so the left terrace is about 20' wide, not 28'-11". The entrance is the plan's double door plus a strip window above it, about 4.5' wide, set in a beige tile panel at x≈21.7–29.5.
- **Everything else follows the plan.**

### D3. Plot outline: additive and optional

Add `plot.outline?: Polygon` and `plot.label?: string`. Width and depth become the outline's bounding extents. Export `outline` only when it's set, so the three other JSON files stay byte-identical and `SCHEMA_VERSION` stays 1.

Name the edges `front`, `corner`, `right`, `rear`, `left` in outline order, so existing gate `side` values keep working. Gate offsets are measured along the edge. `boundaryPieces` walks the edges, inset by half the thickness and mitred at the corners.

*Alternatives rejected:* a 57' × 90' rectangle, which the maintainer declined, and a schema bump, which would churn every export for no benefit.

`facts.plot.area` is the outline's area, and `facts.plot.size` is `label ?? plotSize(area)`. A new `plotDimensions(facts)` helper gives the text for the four places that print dimensions: `designs/index.astro`, `designs/[slug].astro`, `plans-review.astro` and `plan.ts`. The computed 22 marla is overridden by the label because the site sells this as a 1 Kanal.

### D4. Stairs

The main U-stair uses the existing `dog-leg` with `up: "right"`. If `stairGeometry` doesn't handle a sideways run correctly, fix it there, with a test.

Add `l-shaped` (the outdoor stair on the left, carried by the thick wall on the left boundary) and `spiral` (rear, ground to roof, with radial treads). The export gains an optional `treadPolygons` for the spiral, so existing stairs export unchanged.

### D5. Facade model

Add two things to the facade schema:

- A `panel` element: a path, thickness, z and height, exported as pieces like a railing but with no cap or shoe. It's needed for slats and tiles on the slanted right boundary.
- An optional `plan: false` on any element, for finishes a floor plan does not show, so joints and fittings can't clutter the approved plans.

Roles the renderer interprets:

| Role | Result |
|---|---|
| `soffit` | Existing downlights, density set per box |
| `led` | Emissive strip |
| `sconce` | Dark box with an up spot and a down spot |
| `wash` | Downlights aimed to scallop the wall below |
| `reveal` | Thin dark joint between tiles |

The boundary's real wall stops at the white base, about 1'-1" high. Everything above it is `panel` elements named `boundary-<edge>-...`, because a boundary has one material and this one changes every few feet. A shot that hides an edge skips those panels, and the base stays as the kerb.

*Alternative rejected:* texture-only tile joints, because joints would stretch or misalign across the varied panel sizes. Positions are data, generated by small helpers in `helpers.ts`.

**New material tags:**

| Tag | Use |
|---|---|
| `stone-tile-grey` | Pier, side mass, boundary |
| `travertine` | Upper walls under the soffit |
| `tile-beige` | Entrance panel |
| `tile-bronze` | Porch back wall |
| `marble-bronze` | Porch feature panel |
| `granite-black` | Columns and gate piers |
| `wood-slat` | Slats and soffits, darker than `wood-panel` |
| `plaster-sand` | Rear side wall |
| `led-strip` | LED lines |

`plaster-charcoal` covers the fascias. Textures come only from Poly Haven or ambientCG, CC0, locked by sha256 in `assets.lock.json`.

### D6. Lighting

Fittings are real spot lights with `use_shadow = False` and a `cutoff_distance`, like the soffits, plus emissive strips. Glow follows the same fade as interior lights, from `time_of_day` 0.6.

Construction reveals treat `led`, `sconce`, `wash` and `reveal` as finishes (phase 4–5), so a future hero render works without extra handling.

A dusk scene may have over 100 lights, so every dusk render runs under `timeout`, and `light.roomReach` is the first tool if EEVEE hangs.

### D7. Corner street and shots

`render/shots/1-kanal.json` gets `context.sideStreet: "right"`. `site.py` builds a road and footpaths parallel to the right edge, joined to the front street, and removes neighbour plots on that side and across it.

A shot's `hideBoundary: ["front","right"]` skips those walls and leaves a low white kerb. This is how the reference renders behave: `front_elevation_2` and `_3` show a low planter kerb, while `front_elevation` and `left_side_full` show the full wall. The plan and the data still carry the wall.

| Shot | Matches | Time | Boundary |
|---|---|---|---|
| `front-day` | `front_elevation_3` framing | Day | Hidden |
| `front-dusk` | `front_elevation_2` framing | Dusk | Hidden |
| `street` | `front_elevation` framing | Day | Shown |
| `aerial` | New | Day | Shown |
| `side` | `left_side_full_elevation` framing | Dusk | Shown |

The vehicle entrance has black granite piers and no gate leaves, as in the renders. Site copy and alt text must not mention black gates.

### D8. Heights, estimated from the renders

- Plinth about 1.5' (two steps on the plan)
- Ground floor 12'
- First floor 11.5'
- Top of fascia about 29–30' above the road

Upper slab: fascia about 2.5' deep, with an overhang of about 4' at the front and right over the study. It's a roof slab extending past the walls, inside the plot. A lower canopy with an LED edge sits over the entrance and pier. A thin parapet stands behind the fascia, so `facts.roof.parapet` stays true and tanks stay hidden.

The roof level has no stair room, so `facts.roof.stairRoom` is false for this design only.

### D9. Porch

`site.porches[].cars?: number` is used for the 19'-9"×14' porch. The plan parks two cars with their fronts on the driveway. The covered check is still computed.

### D10. Planting

Fan palms in pots stand on the terraces, and a planted bed sits behind the front kerb. Add a planting kind `pot` with an optional level, and use the existing palm asset. The restyle note says they are fan palms, because no CC0 palm model exists.

### D11. Restyle script

- Pass `--model bytedance-seed/seedream-5-0-flash`, the value of `PRIMARY_IMAGE_MODEL`. The script keeps reading `IMAGE_MODEL`.
- Remove `1-kanal` from `CYCLES_FINAL`.
- Move the old terrace-glass edit from `DESIGN_EDITS["1-kanal"]` to a `HERO_EDIT` constant used only by the hero poster jobs, so stills no longer get it and the hero's behaviour doesn't change.
- Add `SHOT_NOTES["1-kanal"]` for materials, one note per shot naming only what that shot's render shows (a whole-house note made the model draw parts the shot cannot see), plus a per-design override of the dusk lighting clause so these lights are preserved. Also override the aerial note's stair room wording.
- Hero jobs have no `design` field, so `--design 1-kanal` can't select them (verified).
- Move `render/out/ai/1-kanal/` aside before generating, keeping the old results. Leave `render/out/1-kanal/1-kanal-hero-*` alone: those frames are the only source of the current hero.

## Risks / Trade-offs

- **[Home page mismatch]** The hero shows the old house above new stills until the hero change. → Accepted by the maintainer. Note it in `render/README.md`, and raise it again before any deploy.
- **[EEVEE dusk hang or black frames with many lights]** → Time-limit every render, start with a small test, and use `roomReach`.
- **[AI drift on the marble, slats and lights]** → Hold the source review first, write a narrow note, score framing and compare side by side. A second model is a maintainer decision.
- **[Heights are estimates]** → Checked by eye against the elevations at the render review.
- **[Tracing errors from a not-to-scale drawing]** → The room-label test catches them, and the maintainer reviews the plan sheets.
- **[Rendered floor plan is close to a real home's]** → The maintainer has accepted this. The naming rule still applies everywhere.
- **[Sculpted facade adds hundreds of boxes]** → Union by role and material as today, and watch scene build time.

## Migration Plan

Nothing is deployed by this change. Rollback is a git revert plus re-encoding the old stills, since the old Cycles finals stay in `render/out/1-kanal/stills/` and the old AI results are kept. The new data, stills and copy land together, so the site's render registry check stays green.
