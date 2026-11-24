## Context

See `proposal.md` for why. The machinery already exists from the three earlier walkthroughs (archived changes `2026-11-09-add-5-marla-walkthrough`, `2026-11-10-add-1-kanal-walkthrough` and `2026-11-14-add-10-marla-walkthrough`):

- **Interior builder.** `render/noor_render/interior.py` builds finished rooms from `render/data/<design>.json`, driven by `render/shots/<design>-interior.json`. Style switches (`render/noor_render/style.py`) default to the 5 Marla and are turned on per design. Per-room wall finishes (paint or wallpaper), feature-wall kinds (`travertine`, `fluted-tight`, `oak-panel`, `paper`), the `voids` switch, glass balustrades, `stairRails`, `openDoors` and per-view `exposure` all exist.
- **Walkthrough data and validation.** `src/designs/walkthroughs/<slug>.json` lists the spots. `walkthrough.ts` discovers files by glob, validates rooms, links, `excluded` rooms and open boundaries, derives walking sight links, and fails the site build on a fault. `walking: true` adds "walk to anything you can see within 30 ft" spots on top of the authored links.
- **Dense spots.** `scripts/gen-walk-spots.py --design <slug> [--spacing 8] [--dry]` adds `w-<room>-<n>` room spots on a lattice and `d-<opening>` doorway spots, keeps hand-placed hero spots, and replaces its own. `check_spots.py` reports floating spots (over a slab void or a stair), spots inside fixtures, spots too close to walls, and missing rooms.
- **Rendering.** Colab L4 with OptiX, about 3.2 minutes per `mid` panorama, driven by `scripts/colab/panoramas.mjs`. 165.63 compute units available and no session running on 2026-11-14.

The 2 Kanal (`render/data/2-kanal.json`, exported 2026-11-13, design unchanged since 2026-11-07):

- **Ground**, floor at elevation 2: `drawing` 298 sq ft (L-shaped, wrapping the powder room), `powder` 36, `foyer` 148, `dining` 417, `lounge` **653** (double height), `hall` 516 (L-shaped stair hall, the spine), `kitchen` 210, `back-kitchen` 129, `bed1` 342, `dressing1` 73, `bath1` 108, `store` 179, `bed2` 201 (L-shaped), `bath2` 57, `laundry` 20, `servant-bath` 42, `servant` 85, `guard` 39 (a separate cabin at the gate).
- **First**, elevation 13: `bed3` 336, `bath3` 49, `dressing` 72, `master-bath` 73, `master` 417, `terrace` 493 (outdoors, over the porch), `landing` **630** (the gallery, L-shaped round the void), `bed4` 237, `bath4` 102, `bed5` 264, `dressing5` 64, `bath5` 85, `family` 364, `bed6` 295, `bath6` 70, `dressing6` 57.
- **Roof**, elevation 24: `stair-room` 131. A `top` level exists at elevation 33, 1 ft high, with no rooms.
- **Voids**, named on the first-floor slab: `lounge-void` (x 21.625–44, y 52–74, 22.4 × 22 ft, `double-height`) and `stairwell` (x 48.25–55.75, y 58.5–72.5, `stair`). The first-floor slab keeps a 4 ft walkway along the void's north edge (y 48–52) and east edge (x 44–48), so the gallery is an L. The lounge's ceiling is the roof slab at 24, so the void is 22 ft tall; the 1 Kanal's `lobby-void` tops out at its roof the same way, so the void code already handles this case.
- **Stair.** One dog-leg `stair` at x 48.25–55.75, y 58.5–72.5, 19 risers of 0.5789 ft, `up: front`, ground → first and first → roof from the same footprint. The half landing is at riser 10, **5.79 ft** above its floor. It climbs beside the gallery, and the stair head arrives at the void's south-east corner.
- **Fixtures:** basins, vanities, WCs, showers, kitchen counters, hob, sink, wardrobes — and **three bathtubs** (`b1-tub`, `mb-tub`, `b5-tub`, 5.5 × 2.5 ft, back `rear`), which `fixtures()` has no branch for and silently skips.
- **Site:** plot 75 × 120. Car gate x 42.6–65.4, pedestrian gate x 36–42.6; drive x 44–64, y 0.75–9.5; porch x 40–70.375, y 9.5–27.625; the guard cabin x 66.5–73.5, y 1.5–8.5; lawn down the west side and rear yard.
- **Room types in use:** 19 — `back-kitchen`, `bathroom`, `bedroom`, `dining`, `drawing`, `dressing`, `family-lounge`, `foyer`, `guard-room`, `kitchen`, `laundry`, `lounge`, `master-bedroom`, `powder-room`, `servant-room`, `stair-hall`, `stair-room`, `store`, `terrace`. Merging the 1 Kanal and 10 Marla configs covers every type except `lounge`, `servant-room` and `guard-room`.

## Goals / Non-Goals

**Goals:**
- A fourth look that is clearly its own and holds together across 34 rooms, defined in `render/shots/2-kanal-interior.json` and nowhere else.
- The double-height lounge read as the house's showpiece, from below and from the gallery.
- A walking tour dense enough for a 7,160 sq ft plan, with the big spaces hand-filled.
- The 5 Marla, 1 Kanal and 10 Marla unchanged, checked with the same CUDA gate as before.

**Non-Goals:**
- Furniture, loose decor, textiles, plants indoors, or anything else the finished-and-unfurnished rule excludes. Fixed joinery and wall finishes stay in scope.
- The roof, its stair room, the servant suite and the guard cabin.
- Re-styling or re-rendering any other design.
- Any change to the 2 Kanal plan (`src/designs/2-kanal.ts`) unless an eye-level fault forces one, which is reported first.

## Decisions

### D1. The 2 Kanal style: "Stone Monolith"

The exterior (approved 2026-11-07) is travertine, black fins, a charcoal beam, glass on the terrace's three sides and an all-stone front wall. This carries it inside, but must not become "the 1 Kanal, darker".

```
                    1 Kanal (warm minimal)          2 Kanal (Stone Monolith)
  walls             warm white mineral paint        limewash plaster, warm grey-sand;
                                                    trowel texture, deeper graphite in a few rooms
  doors / skirt     flush, no casing                pale oak leaf in a stone-coloured casing;
                                                    shadow-gap skirting
  ceiling light     floating edge, linear slots      flat plaster, calm; the feature wall's own
                                                    wash slot grazes the stone; slots only in the
                                                    hall, stair and gallery
  floors            honed pale stone, wide oak      honed graphite stone 1.2 × 2.4; pale oak
                                                    plank in the bedrooms
  metal             dark bronze / black              blackened steel, the only metal
  features          flat travertine, fluted oak      fluted travertine, full height; flat vein-cut
                                                    travertine in the dining, echoing the exterior
  baths             warm or dark slab                full-height graphite slab; stone-clad tub
  kitchen           greige / oak two-tone            graphite lowers, black steel, stone waterfall,
                                                    no timber
```

Per-room treatment (which material leads):

```
  ROOM            WALL / FLOOR                                   LEADS
  foyer           grey-sand plaster, graphite stone               full-height fluted travertine pier
                                                                  opposite the main door
  drawing         plaster; fluted travertine on the north wall    the fluted wall; graphite stone floor
  powder          graphite slab to full height                    backlit mirror, black steel fittings
  dining          flat vein-cut travertine on one wall            the stone, as outside; stone floor
  lounge          plaster; a freestanding fluted travertine         the 22 ft chimney, lit by the void
                  chimney against the glass wall, floor to roof     ceiling's edge glow; the gallery
                                                                   balustrade
  hall / stair    plaster, stone treads                           a slot following the flight
  kitchen         plaster; graphite lowers                       stone island, black steel, waterfall end
  back-kitchen    plaster; plain stone                           service, quiet
  bedrooms        plaster; pale oak floor                        flat travertine headboard panel (not oak)
  master          plaster; fluted travertine headboard wall       oak floor, terrace door
  dressings       plaster; oak joinery                            plain, warm
  baths           graphite slab to full height                    the tub on its stone plinth
  family          plaster; fluted travertine media wall           oak floor
  terrace         real sky; stone paving and glass outside        exterior finish, pergola none
```

Alternative considered: "Gallery Light" (chalk plaster, terrazzo, pale travertine, no wood), rejected as too thin against a charcoal exterior seen through the terrace glass; "Ember Modern" (sand limewash, terracotta stone, walnut, copper), rejected as sitting too close to the 1 Kanal and 10 Marla. The maintainer chose Stone Monolith on 2026-11-14.

### D2. Fluted travertine: a builder element for the chimney, none for the wall features

The **wall features** need no builder code. `_modern_feature` resolves `featureMaterial` through `Palette.named()`, which looks in **both** `palette.woods` and `palette.stones`. So `{"featureKind": "fluted-tight", "featureMaterial": "<travertine stone key>"}` produces stone flutes on a dark backer — exactly the monolith motif — without a new material or a new feature kind. The flute geometry is the existing 0.022 m face on a 0.032 m pitch, within what the 1 Kanal already builds per wall. The drawing, master bedroom and family lounge use it.

The **22 ft chimney** cannot be wall cladding. The plan has no solid lounge wall that rises two storeys: the west wall is the full-height glass window to the lawn (`lounge-glass`, y 49–73, 2–23 ft), and the south, east and rear walls stop at the first-floor slab (12.5 ft), with the gallery walkway or the family lounge's open overlook above them. So the chimney is a **freestanding fluted stone mass**, 0.55 m deep and 1.5 m wide, standing on the lounge floor against the west glass and rising to the roof slab at 23.5 ft (about 21.5 ft of stone, the full double-height volume). It is the one builder addition besides the bathtub: an off-by-default `chimney` block in the interior config (`level`, `room`, the wall it stands against, its centre along that wall, its size, its stone), built in `chimney()` as a dark core with tight travertine flutes on its faces, from `room.floor_z` to the double-height void's ceiling. A design whose config names no chimney is unchanged, and the 5 Marla test asserts every new global switch is absent.

`featureWall` still accepts a compass side rather than `auto`, and the drawing, master and family rooms name their own.

> **2026-11-14, settled during implementation:** D1 first put the chimney on the lounge's west wall as wall cladding, and a later revision named the rear wall; both were checked against the export and neither is a solid two-storey wall (west is glass; the rear wall is 12.5 ft with the family lounge's overlook above). The maintainer chose the freestanding mass against the west glass — it keeps the design's stated west wall, the 22 ft signature, and is seen from the foyer arch, the lounge floor and the gallery.

### D3. Walls, floors, ceilings, metal and light

- **Walls** are per-room paint via the existing `wall` key (a linear RGB colour), with `palette.wall` as the house default. No wallpaper: the 10 Marla owns that, and a stone house reads by texture and light, not pattern.
- **Floors** are new entries under `palette.floors`: a honed graphite tile for the public rooms and wet rooms (low vein strength, rough about 0.32), and a pale oak plank for the bedrooms and family lounge. Both are ordinary `tile` / `kind: "wood"` entries; no code.
- **Ceilings** are `flat` with downlights, and `slots` only in the hall, stair, gallery and back kitchen. This is the deliberate opposite of the 1 Kanal's continuous slots and the 10 Marla's tray cove.
- **Metal** is `palette.metal` set to a near-black steel (linear about [0.03, 0.032, 0.034], rough 0.45). It replaces bronze and brass everywhere: handles, rails, taps, mirror edges.
- **Light** is 3000 K neutral-warm — between the 1 Kanal's neutral warm and the 10 Marla's 2700 K — with the stone washed hard (`lights.wash` raised, feature-wall wash on by default). Graphite and grey-sand are mid-tone, so the renders should not need the 10 Marla's noise workarounds.
- **Doors** are `cased`, and `palette.trim` is set to the wall's plaster colour rather than a timber tone, so the casing reads as a plastered reveal in stone-coloured paint. Leaves are pale oak. This is visibly different from the 1 Kanal's casing-less flush doors.

### D4. The built-in bathtub

`fixtures()` gains one branch, `elif kind == "bathtub":`, in the same style as the `wc` and `shower` branches (boxes through the local `box(...)` helper into the `parts` lists):

- **Apron** in the room's wall finish (the `cistern` treatment: clad in the room's `wall_tile` when it has one, else the vanity's material), from the floor to 0.55 m, set back 0.02 m from the fixture's front edge.
- **Basin** in `ceramic`, inset 0.06 m from the apron's sides and 0.10 m from its top, with a 0.10 m rim.
- **Ledge** in `top` (the counter stone) along the wall side, 0.15 m deep.
- **Taps** in `steel`, on the wall side: a spout and two cross handles, or a single mixer.
- **Bevel** 0.02 on the ceramic, as the wc bowl uses.

No other design has a `bathtub` fixture, so the branch cannot change the other three houses; the regression gate proves it anyway. The three tubs sit against rear walls (`back: "rear"`), so `length` runs along x and `depth` is 2.5 ft.

### D5. Room types and the four exclusions

- `roomTypes` gets an entry for all 19 types, copied from the closest of the 1 Kanal / 10 Marla configs and restyled. The three new ones:
  - `lounge`: flat ceiling, graphite stone floor, fluted travertine feature wall on the west, no downlights in the void zone beyond what the void ceiling provides.
  - `servant-room` and `guard-room`: plain plaster, stone floor, one downlight; excluded from the tour but still built because their level is built.
- `excluded` (each with the reason the validator stores and the page shows):
  - `ground/servant` and `ground/servant-bath`: "Its only door opens to the outside."
  - `ground/guard`: "A separate cabin at the gate, entered from outside."
  - `roof/stair-room`: "The roof is not part of the tour."
- `levels` is `["ground", "first"]`; the `roof` and `top` levels stay out, as on every other tour.

Alternative considered: touring the servant suite and guard cabin through outdoor spots. Rejected: it doubles the outdoor setup and the views are of a back door and a cabin wall. The maintainer chose the four exclusions on 2026-11-14.

### D6. Viewpoints: 30 rooms, about 50 hand-placed spots

| Level | Room | Spots | Why |
|---|---|---|---|
| outdoor | — | `gate`, `porch` | Start at the car gate looking up the drive; one porch spot at the main door. `start: "gate"`. |
| ground | foyer | `foyer` | The arch into the lounge, the drawing and dining doors |
| ground | drawing | `drawing`, `drawing-window` | The L-shaped room; the fluted wall and the front window |
| ground | powder | `powder` | Tiny; one spot facing the way out |
| ground | dining | `dining`, `dining-side` | 417 sq ft; the travertine wall and the side window |
| ground | lounge | `lounge`, `lounge-arch`, `lounge-up` | The void: the floor, the view back to the foyer arch, and up at the 22 ft chimney |
| ground | hall | `hall`, `hall-back`, `stair-foot` | The spine, the back door, the foot of the stair |
| ground | kitchen | `kitchen`, `kitchen-island` | The stone island and the run along the side wall |
| ground | back-kitchen | `back-kitchen` | Service room, one spot |
| ground | bed1 | `bed1`, `bed1-window` | 342 sq ft; the wardrobe wall and the window |
| ground | dressing1 | `dressing1` | Joinery, one spot facing the way out |
| ground | bath1 | `bath1` | The first tub |
| ground | store | `store` | 179 sq ft; one spot |
| ground | bed2 | `bed2` | L-shaped; one spot at the wide end |
| ground | bath2 | `bath2` | One spot |
| ground | laundry | `laundry` | 20 sq ft; one spot, moved off the counter by hand |
| — | stair | `stair-landing`, `stair-turn` | The half landing, `rise: 5.79`, facing the turn |
| first | landing | `stair-head`, `landing-void`, `landing-walk` | Arrival, the view down into the lounge, and the 4 ft walkway |
| first | bed3 | `bed3` | |
| first | bath3 | `bath3` | |
| first | master | `master`, `master-terrace` | 417 sq ft; the terrace door |
| first | dressing | `dressing` | |
| first | master-bath | `master-bath` | The second tub |
| first | terrace | `terrace`, `terrace-end` | 493 sq ft over the porch; the glass on three sides |
| first | bed4 | `bed4` | |
| first | bath4 | `bath4` | |
| first | bed5 | `bed5` | |
| first | dressing5 | `dressing5` | |
| first | bath5 | `bath5` | The third tub |
| first | family | `family`, `family-back` | 364 sq ft; the media wall and the way back to the gallery |
| first | bed6 | `bed6` | |
| first | bath6 | `bath6` | |
| first | dressing6 | `dressing6` | |

- **Links.** Authored through the real openings from the export: `main-door` (porch–foyer), `drawing-door`, `dining-door`, `foyer-arch` (an opening), `lounge-hall` (an opening), `kitchen-door`, `kitchen-hall`, `back-kitchen-inner`, `bed1-door`, `dressing1-door`, `bath1-door`, `powder-door`, `store-door`, `bed2-door`, `bath2-door`, `laundry-door`, `bed3-door`, `bath3-door`, `master-door`, `dressing-door`, `master-bath-door`, `terrace-door` (a sliding glass door), `bed4-door`, `bath4-door`, `bed5-door`, `dressing5-door`, `bath5-door`, `family-opening` (an opening), `bed6-door`, `bath6-door`, `dressing6-door`. Stair links use `via: "stair"` between the foot, the half landing and the head, because their heights differ.
- **The void is not a link.** There is no floor between the gallery and the lounge, so the two are joined only by the stair; the walking sight-link code stops at slab voids, so no walking marker crosses it either.
- **Outdoor spots.** `gate` at about [54, 2.2] facing 90, up the drive; `porch` at about [45, 14] facing 90, at the main door. Both get `"outdoors": true`, exposure and sun in the interior config, as the 10 Marla's gate and porch do.
- **Tiny rooms** (powder 36, laundry 20, bath2 57, dressing5 64) get one spot at the centre facing the way out.
- Exact positions, facings and sun are settled with EEVEE previews and perspective probes, as on the earlier tours; the table is the plan, not the coordinates.

### D7. Walking density: 8 ft, hand-filled in the big spaces

- The tour sets `walking: true`. Generated spots come from `gen-walk-spots.py --design 2-kanal --spacing 8`; measured on 2026-11-14 with the four exclusions, that is **about 150 spots** (against 186 at the default 6.5 ft), 29 of them in doorways.
- About **8 hand-placed extras** go into the three spaces where 8 ft leaves gaps: the lounge (653 sq ft), the gallery (630) and the hall (516). They are authored hero spots, so the generator keeps them.
- Total about **200 spots**.
- **The generator does not know about floor holes or stair treads.** It will place spots over `lounge-void` and `stairwell` on the first floor and on the stair on the ground floor; `check_spots.py` flags every one as an ERROR (it reads `slab.voids`, which the export has), and they are deleted or moved until it reports 0 errors. The laundry spot lands inside `laundry-counter` and is moved by hand.
- Nothing about the viewer changes: the depth viewer, the walking links and the doorway spots are the 10 Marla's and the 1 Kanal's.

### D8. Render plan

- **Style gate:** `lounge` (the void and the fluted chimney), `master-bath` (the tub and the slab) and `kitchen` (graphite and steel) at `mid`, about 4 minutes each, shown to the maintainer in the local viewer next to the matching 1 Kanal and 10 Marla views. The look is adjusted until they approve it.
- **Full set:** about 200 spots at `mid`, split across two Colab sessions with separate view lists (a third only if Colab grants it), then the same chains with `--depth`. At about 1 minute on a G4 and 3.2 on an L4, that is about 5 to 5.5 hours wall-clock on L4s, about 28 compute units with retries.
- **Preview check:** every hero spot at `preview` 1280 px first, and the overview sheet, before the full run.
- **Noise:** graphite stone and grey-sand plaster are mid-tone, so no view is expected to need `high`; if one does, only that view is re-rendered.

### D9. Site

`walkthrough.ts` discovers the file by glob, so the 2 Kanal page gets its section with no page code change. The registration test in `src/designs/walkthrough.test.ts` gains `2-kanal` in sorted order (`["1-kanal", "10-marla", "2-kanal", "5-marla"]`). Panoramas, thumbnails and depth images go under `public/walkthroughs/2-kanal/`.

## Risks / Trade-offs

- **Generated spots floating over the void or standing on the stair** → `check_spots.py` reads the export's slab voids and catches them as errors; prune and rerun until 0 errors. The walking code already refuses a marker across a void, so a stray spot would also fail to link, which is a second signal.
- **A 22 ft fluted wall at about 250 flutes could be slow or read as stripes at distance** → Build it on the lounge's west wall only, check it in the first EEVEE probe, and fall back to flat vein-cut travertine (`featureKind: "travertine"`) if the flutes shimmer or cost too much. The style survives either way.
- **Dark stone floors make the room look heavy** → Grey-sand plaster walls, a near-white ceiling and hard wall washing carry the light; graphite is used only on the floor and in wet rooms, never on every wall.
- **A tub in the doorway's sight line, or a spot inside a tub** → The fixture check and the preview pass catch both; the tub is 0.55 m high, so it reads under the eye line and does not block a view.
- **The roof flight is visible from the gallery and tops out in the excluded roof stair room** → Check it in the gallery preview; if the stair room reads as raw structure, follow the 10 Marla fix (finish the shaft and exclude it). The roof is already out of the tour.
- **The gallery is only 4 ft wide** → Spots sit at its centre line; the 4 ft strip is enough for a person and for the panorama, but facings need a preview pass because there is no wall to warn about.
- **200 spots is the largest tour so far** → 8 ft lattice, hand-fill only where it matters, and two sessions. Review time, not compute, is the constraint.
- **Eye-level faults in the design data** → As before, report before touching `src/designs/2-kanal.ts`, then re-export and re-run the tests.
- **The builder change could move the other houses** → One new fixture branch, gated on a fixture type only this design has; the four-view CUDA gate must pass at ±1 level.

## Migration Plan

1. Baseline: 5 Marla `drawing`, 1 Kanal `drawing` and `master-bath`, 10 Marla `drawing` at `mid` with CUDA on an L4.
2. Add the `bathtub` branch and a plain-Python test; probe the master bath on Colab; run the four-view regression gate.
3. Write `render/shots/2-kanal-interior.json` (Stone Monolith, 19 room types, `voids: true`) and check every room builds with no `falls back to default`.
4. Write `src/designs/walkthroughs/2-kanal.json` with the 30 rooms, the four exclusions and about 50 hero spots; pick positions with EEVEE previews; then `gen-walk-spots.py --spacing 8`, prune to 0 errors, and add the 8 hand-fill spots.
5. Style gate on three `mid` views, then the full set and the depth pass, review, and re-render what changes.
6. Encode, add the registration test, `npm test`, `npm run build`, browser pass.

Rollback: delete `src/designs/walkthroughs/2-kanal.json` and the section disappears; with the config absent and no bathtub in another design, no other house changes.

## Open Questions

- The exact linear values of the grey-sand plaster, graphite stone and blackened steel, settled at the style gate.
- Whether the lounge's 22 ft fluted wall reads best full height or stopped at a datum, settled at the first probe.
- Whether the gallery's two void spots should look along the walkway or across it, settled at previews.
