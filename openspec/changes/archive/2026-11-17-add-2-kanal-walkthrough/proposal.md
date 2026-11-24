## Why

The 2 Kanal is the largest house the site shows — a 75 × 120 ft plot, 34 rooms, 7 bedrooms, about 7,160 sq ft over two floors — and the size Noor Developers most often builds. Its exterior was approved on 2026-11-07, but a visitor can only look at it from the street: the 5 Marla, 1 Kanal and 10 Marla tour, and the 2 Kanal cannot. A buyer comparing the sizes therefore sees the biggest design in the least detail.

Its inside must not repeat the three finished houses (warm classic, warm minimal, Midnight Atelier). It is also the first design with two features the other tours could not show: a 22 ft double-height lounge with a gallery wrapping it, and three bathtubs. The tour is how those get seen.

## What Changes

- **A full 2 Kanal walkthrough.** Every room reachable from inside gets a viewpoint, about 50 hand-placed spots plus a generated lattice: the car gate and porch outdoors, then on the ground floor the foyer, drawing room, powder room, dining room, the double-height lounge, the stair hall with the main stair, kitchen, back kitchen, bedroom 1 with its dressing room and bath, store, bedroom 2 and its bath, and the laundry; on the first floor the gallery with the stair head and the two spots looking down into the void, bedrooms 3 and 4 with their baths, the master bedroom with its dressing room and bath, the front terrace over the porch, bedroom 5 with its dressing room and bath, the family lounge, and bedroom 6 with its bath and dressing room. Bedrooms 1 and 2 and the drawing and dining rooms get a second spot, and the gallery gets three.
- **Four named exceptions, each with a reason.** The servant room and its bath (their only door opens to the outside), the guard cabin at the gate (a separate cabin entered from outside), and the roof's stair room. That leaves 30 of the 34 rooms in the tour.
- **One theme, "Stone Monolith", for the whole interior.** It carries the approved exterior inside instead of inventing a fourth palette: limewash plaster walls in a warm grey-sand, fluted travertine as the repeating motif, a honed graphite stone floor, blackened steel as the only metal, pale oak confined to doors and joinery, and graphite slab in every wet room. The signature is the 22 ft freestanding fluted travertine chimney in the double-height lounge (seen from the foyer, the lounge floor and the gallery), and the built-in stone tub in the three baths. It reads colder and stonier than the 1 Kanal's warm white, pale stone, oak and bronze, and unlike the 10 Marla's ink, walnut and brass.
- **A walking tour, densely spotted.** `walking: true`, like the 1 Kanal and 10 Marla: spots every 8 ft through the house plus one in each inside doorway, and extra hand-placed spots in the 653 sq ft lounge, the 630 sq ft gallery and the 516 sq ft hall, so the visitor walks door to door through about 200 spots rather than jumping. A line of sight stops at the void and the stairwell, so looking down into the lounge is a view, not a step.
- **Builder: a built-in bathtub and a freestanding chimney.** `fixtures()` has no `bathtub` branch today, so the three tubs in the export are silently skipped; the branch builds a stone-clad apron, an inset white basin, a stone ledge and metal taps, under 0.55 m high. And no lounge wall is solid through both storeys (the west wall is glass; the others stop at the first-floor slab), so the 22 ft fluted chimney is built as a freestanding stone mass from the floor to the roof slab, named in the config. No other design has a bathtub or a chimney, so neither can change the other three houses; the regression gate proves it.
- **Config, not code, for the rest.** The `lounge`, `servant-room` and `guard-room` types and the missing room-type entries are configuration; the double-height lounge and stairwell are the existing `voids` switch, glass balustrade and stair code, all off by default.
- **The site.** The 2 Kanal design page gets the existing walkthrough section — panoramas, depth maps, thumbnails, room descriptions, the floor-plan map and the walking viewer. No page code changes beyond the new data file, because walkthroughs are discovered by glob; one registration test case is added.
- **Render plan.** Style gate first on three `mid` views (the lounge, the master bath and the kitchen), approved before the full set; then all spots at `mid` on Colab GPUs, depth images for every spot, and the encoded set on the page.

## Capabilities

### New Capabilities
<!-- none: the walkthrough, interior and panorama capabilities already exist -->

### Modified Capabilities
- `interior-walkthrough`: "Rooms covered" adds the 2 Kanal room list, its four named exceptions, the outdoor start at the car gate, and the requirement that the double-height lounge is seen from the floor below and from the gallery above.
- `render-pipeline`: "Interior from design data" gains the built-in bathtub as a fixed bath fitting, off unless a design has one.

## Impact

- **Render code:** `render/noor_render/interior.py` (a `bathtub` branch in `fixtures()`, using the existing `fbox`/`box` parts and palette materials, and a `chimney()` element built only when the config names one), plus plain-Python tests in `render/tests/`. No new materials, no downloaded assets, no schema change.
- **Config and content:** new `render/shots/2-kanal-interior.json` (Stone Monolith palette, style switches, entries for all 19 room types, the void ceiling) and `src/designs/walkthroughs/2-kanal.json` (about 50 hand-placed viewpoints plus generated spots, and the four exclusions); panoramas, depth images and thumbnails under `public/walkthroughs/2-kanal/`.
- **Site:** one registration test case in `src/designs/walkthrough.test.ts`; the rest is glob discovery.
- **Design data:** the 2 Kanal plan is unchanged. If an eye-level fault appears (a column in a window, a fitting in a door swing), it is reported before `src/designs/2-kanal.ts` is touched, because that changes the floor plans too.
- **Compute:** about 200 spots at `mid`. At about 3.2 minutes each on an L4, about 10.7 GPU-hours, roughly 5 to 5.5 hours wall-clock across two sessions, about 20 compute units (about 28 with retries) of the 165.6 available on 2026-11-14; a short depth pass on top.
- **Not affected:** the 5 Marla, 1 Kanal and 10 Marla interiors, walkthroughs and panoramas (checked by a four-view CUDA regression gate before and after the builder change), the exterior stills, the hero, the content rules and the deploy.
