# The 2 Kanal house

Plot 75 × 120 ft. The design lives in `src/designs/2-kanal.ts`, the export in `render/data/2-kanal.json`, and the exterior shots in `render/shots/2-kanal.json`. The exterior (approved 2026-11-07) shares the 1 Kanal's finishes: travertine, black fins, a charcoal beam, glass on the terrace's three open sides and an all-stone front wall. Nothing for its walkthrough exists yet: there is no `render/shots/2-kanal-interior.json`, no `src/designs/walkthroughs/2-kanal.json` and no `render/out/2-kanal/`. The change `openspec/changes/add-2-kanal-walkthrough/` (2026-11-14) plans it: the Stone Monolith style, the four exclusions, and about 200 spots.

Re-run the snippets in `references/files.md` before relying on the tables below. If someone has changed the design since 2026-11-14, the export wins.

## Rooms (feet; bounding boxes, and some outlines are L-shaped)

**Ground** (floor at elevation 2, storey height 11)

| id | type | name | box x / y | doors |
|---|---|---|---|---|
| drawing | drawing | Drawing room | 22–40 / 28–48 | `drawing-door` (double) → foyer; `powder-door` → powder |
| powder | powder-room | Guest bath | 22–28 / 41–48 | `powder-door` → drawing |
| foyer | foyer | Foyer | 40–48 / 28–48 | `main-door` (double, exterior); → drawing, → dining (`dining-door`, double); `foyer-arch` (opening) → lounge |
| dining | dining | Dining | 48–70 / 28–48 | `dining-door` → foyer; `kitchen-door` → kitchen |
| lounge | lounge | Lounge | 22–48 / 48–74 | **double height** (void above); `foyer-arch` → foyer; `lounge-hall` (opening) → hall |
| hall | stair-hall | Hall | L-shape, 40–56 / 48–106 | main stair; `back-door` (exterior); → lounge, kitchen (`kitchen-hall`), bed1, bed2, laundry, store |
| kitchen | kitchen | Kitchen | 56–70 / 48–64 | → dining, → hall, `back-kitchen-inner` → back-kitchen |
| back-kitchen | back-kitchen | Back kitchen | 56–70 / 64–74 | → kitchen; `back-kitchen-door` (exterior) |
| bed1 | bedroom | Bedroom 1 | 22–40 / 74–94 | → hall; `dressing1-door` → dressing1; `bath1-door` → bath1 |
| dressing1 | dressing | Dressing | 40–48 / 84–94 | → bed1 |
| bath1 | bathroom | Bath 1 | 22–32 / 94–106 | → bed1; **bathtub** `b1-tub` |
| store | store | Store | 32–48 / 94–106 | → hall |
| bed2 | bedroom | Bedroom 2 | 56–70 / 74–94 | → hall; `bath2-door` → bath2 |
| bath2 | bathroom | Bath 2 | 62–70 / 86–94 | → bed2 |
| laundry | laundry | Laundry | 56–62 / 94–98 | → hall |
| servant-bath | bathroom | Servant bath | 56–62 / 98–106 | → servant only |
| servant | servant-room | Servant room | 62–70 / 94–106 | **only `servant-door`, which is exterior**; → servant-bath |
| guard | guard-room | Guard room | 66.5–73.5 / 1.5–8.5 | **a separate cabin by the front gate; only `guard-door`, exterior** |

**First** (storey height 11)

| id | type | name | box x / y | doors |
|---|---|---|---|---|
| landing | stair-hall | Gallery | L-shape wrapping the void, 22–56 / 48–106 | stair (down to ground, up to the roof); → bed3, master, bed4, bed5; `family-opening` → family |
| bed3 | bedroom | Bedroom 3 | 22–40 / 25–48 | → landing; `bath3-door` → bath3 |
| bath3 | bathroom | Bath 3 | 22–29 / 40–48 | → bed3 |
| master | master-bedroom | Master bedroom | 48–70 / 28–48 | → landing; `dressing-door` → dressing; `terrace-door` (**sliding, glass**) → terrace |
| dressing | dressing | Dressing | 40–48 / 28–38 | → master; `master-bath-door` → master-bath |
| master-bath | bathroom | Master bath | 40–48 / 38–48 | → dressing; **bathtub** `mb-tub` |
| terrace | terrace | Terrace | 40.4–70 / 11–28 | → master (outdoors, glass on three sides) |
| bed4 | bedroom | Bedroom 4 | 56–70 / 48–66 | → landing; `bath4-door` → bath4 |
| bath4 | bathroom | Bath 4 | 56–70 / 66–74 | → bed4 |
| bed5 | bedroom | Bedroom 5 | 56–70 / 74–94 | → landing; → dressing5, → bath5 |
| dressing5 | dressing | Dressing 5 | 56–62 / 94–106 | → bed5 |
| bath5 | bathroom | Bath 5 | 62–70 / 94–106 | → bed5; **bathtub** `b5-tub` |
| family | family-lounge | Family lounge | 22–48 / 74–88.5 | `family-opening` → landing; `bed6-door` → bed6 |
| bed6 | bedroom | Bedroom 6 | 22–40 / 88.5–106 | → family; → bath6, → dressing6 |
| bath6 | bathroom | Bath 6 | 40–48 / 88.5–98 | → bed6 |
| dressing6 | dressing | Dressing 6 | 40–48 / 98–106 | → bed6 |

**Roof:** `stair-room` only. Exclude it ("The roof is not part of the tour."), as every other tour does. The export also carries a `top` level (elevation 33, 1 ft high, no rooms); the tour lists `levels: ["ground", "first"]` and ignores both.

**Floor holes on the first floor:** `lounge-void` (double height, x 21.6–44, y 52–74, over the ground lounge) and `stairwell` (x 48.25–55.75, y 58.5–72.5). The gallery (`landing`) runs round the void as a 4 ft strip along y 48–52 and x 44–48. Spots there look down into the lounge past the balustrade, which is the house's showpiece view, as the 1 Kanal passage was.

**Stair:** one dog-leg `stair` at x 48.25–55.75, y 58.5–72.5, 19 risers of 0.58 ft, `up: front`. It runs ground → first and, from the same footprint, first → roof. Both flights have `steps`, so the builder rebuilds them indoors. The flight up to the roof is seen from the gallery. Check in previews that its top (the roof stair room, excluded from the tour) reads as finished and not as raw structure. If it does not, follow the 10 Marla fix, which finished the shaft walls and excluded the shaft.

**Outdoor.** Plot 75 × 120 ft, boundary walls on all four sides. The front has a pedestrian gate at x 36–42.6 and a car gate at x 42.6–65.4, both in the wall at y 0.375. A front path (x 38–42) and the drive (x 44–64) cross the front yard to the porch, which is x 40–70.375, y 9.5–27.625; the first-floor terrace (x 40.4–70, y 11–28) sits over it at 13 ft. The guard cabin is x 66.5–73.5, y 1.5–8.5, and the lawn runs down the west side to the rear yard (y 106.375–119.25). Start the tour at `gate`, about [54, 2.2] facing 90 up the drive, and put `porch` at about [45, 14] facing 90 at the main door; both are settled against previews like every other spot.

## Known gaps in the builder for this house

1. **`bathtub` fixtures are not built.** `fixtures()` in `render/noor_render/interior.py` has no `bathtub` branch, so the three tubs (`b1-tub`, `mb-tub`, `b5-tub`, each 5.5 × 2.5 ft, back `rear`) would simply be missing. No other design has a bathtub, so a new `elif kind == "bathtub":` branch cannot change the other houses (still run the regression gate). A built-in tub: an apron box clad in the room's wall slab or tile (as `cistern` is clad), a slightly inset white ceramic basin top (`ceramic` part), a thin stone ledge on the wall side, and taps in `metal`. Keep it under about 0.55 m high. Verify with a perspective probe of the master bath.
2. **Room types.** The design uses 19: `back-kitchen`, `bathroom`, `bedroom`, `dining`, `drawing`, `dressing`, `family-lounge`, `foyer`, `guard-room`, `kitchen`, `laundry`, `lounge`, `master-bedroom`, `powder-room`, `servant-room`, `stair-hall`, `stair-room`, `store`, `terrace`. Only three have no entry in any existing config: `lounge` (the other houses call it `tv-lounge`), `servant-room` and `guard-room`. Merge the 1 Kanal and 10 Marla configs for the rest: the 1 Kanal has no `foyer`, `laundry`, `store` or `stair-room`, the 10 Marla has no `back-kitchen`, and both carry types this design does not use (`tv-lounge`, `study`, `corridor`, `other`). Excluded rooms are still built if their level is built, so give them entries too.
3. **The double-height lounge** needs `"voids": true` (as in the 1 Kanal). Check in previews: walls rising unbroken through both storeys, the slab-edge fascia, a continuous balustrade round the gallery with no gaps at corners, and the ceiling over the void. The 1 Kanal hall is the reference. A `pendant` is optional, and a style decision.
4. **The terrace sliding door is glass.** The 10 Marla and 1 Kanal fixes make glass sliding doors see-through in the walking viewer (commit `74641bf`). Check that the master-to-terrace link works both ways.
5. **Eye-level faults in the data** are expected: a column in a window, a fixture overlapping a door swing. Report each to the maintainer before changing `src/designs/2-kanal.ts`, because a change there alters the floor plans too. Then run `npm run designs:export` and `npm test`.

## Decisions to ask the maintainer (Phase 0, in one message)

Give each a recommendation:

1. **Interior style.** It must be clearly unlike the three existing looks (the table in `references/files.md`). Offer two or three named directions in one line each, with a recommendation. A natural one continues the exterior inside: travertine and stone, black or blackened-steel metal, pale oak, and warm plaster. That is close to the 1 Kanal, though, so distinguish it, for example with a darker stone floor, a limewash plaster wall, or a fluted travertine feature wall in place of oak. Let the maintainer choose.
2. **Servant room and servant bath.** Their only door opens outside. Recommend: exclude both ("Its only door opens to the outside."), as the 1 Kanal excluded its washroom. The alternative is an outdoor spot at the back.
3. **Guard room.** A cabin at the gate with an outside door. Recommend: exclude it ("A separate cabin at the gate, entered from outside.").
4. **Roof stair room.** Recommend: exclude.
5. **Outdoor spots.** Recommend `gate` (start) and `porch`, as on the 10 Marla. Ask whether the drive or the lawn deserves one, as the 1 Kanal had `drive-1` and `forecourt`.
6. **Spot density.** Report the `gen-walk-spots.py --dry` count and the cost. Measured on 2026-11-14 with the servant room, servant bath and guard room excluded: **186 generated spots** at the default spacing (6.5 ft, 29 of them in doorways), or **150** at `--spacing 8`, plus your 30 to 40 hand-placed hero spots. At about 1 minute per spot on a G4 or 3.5 minutes on an L4, 200 spots is about 3.5 hours on G4s or about 6 hours on L4s across two parallel sessions, plus a short depth pass. Offer `--spacing 8` if that is too much.
7. **Style gate views.** Recommend `lounge` (the double-height space), `master-bath` (tub and slab) and `kitchen`.

Record the answers, with the date, in the change's `design.md`.
