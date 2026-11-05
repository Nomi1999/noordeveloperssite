## Context

See proposal.md for the motivation.

Each design is one TypeScript data file. Floor plans, facts and `render/data/<slug>.json` derive from it, and the Blender scene is rebuilt from that JSON on every run. So a new house is mostly new data, and the facade is facade boxes (`role` is free text) plus railings, using a fixed material vocabulary.

Three existing constraints shape this change:

- `program.test.ts` requires every design to validate with **no warnings**, including room minimums set for large houses.
- `_neighbours` in `render/noor_render/site.py` draws from a seeded random stream, so changing the order of its calls would silently move the neighbours of the existing designs.
- `scripts/enhance-renders.mjs` hard-codes the two existing designs, ignores `IMAGE_MODEL`, and reads its source from `src/assets/renders/`, the same folder `encode` overwrites. Its hero source path (`public/hero/<orientation>/540/0191.webp`) no longer exists since the video-hero change.

### Test results behind this design (2026-11-05)

Three 1 Kanal shots were rendered with EEVEE preview at 2048px and restyled with `bytedance-seed/seedream-5-0-flash`, using the live pipeline's prompts:

| Shot | Render | AI call | Tries | Framing (pass ≥ 0.45) |
|---|---|---|---|---|
| `front-day` | 37 s | 18 s | 1 | 0.71 |
| `front-dusk` | 199 s | 12–17 s | 2 (first scored 0.06) | 0.68 |
| `aerial` | 26 s | 18 s | 1 | 0.54 |

Cost was $0.018 per image. Render times exclude about 20 seconds of scene build per shot. Design, framing and fine facade relief held up. Two weaknesses showed: neighbours came out rundown, and Flash added two small lights to the dusk facade.

## Goals / Non-Goals

**Goals:**

- Two new houses that work as real plans at their sizes and look like nothing else on the site.
- A repeatable flow from a design to delivered stills in under an hour of machine time.
- No change to anything the 1 Kanal and 2 Kanal houses currently show.

**Non-Goals:**

- Regenerating or restyling the 8 existing stills, the hero video or its poster.
- Correcting the existing aerial stills or their alt text (the 1 Kanal aerial sits low and its roof is not visible). Raised with the maintainer separately.
- Build-sequence videos for the new houses.
- Replacing Blender.

## Decisions

### Keep Blender, use EEVEE for source renders

The slow step was Cycles at 3200px, whose detail is discarded when the image is downscaled to 2048px for the model. EEVEE gives the same geometry and framing in about a minute.

Alternative considered: Three.js in headless Chrome, driven from the same JSON. It would be feasible and faster per shot, but EEVEE already brings the 8 stills for two designs to about 15 minutes of rendering, so there is little left to save. It would also mean rebuilding about 2,500 lines of materials, lighting, planting and context, and Blender would stay for the hero video anyway. Weaker lighting also risks losing the shading that lets the model keep shallow relief. Its one real advantage, a live orbit view for choosing shots, can be added later from the same data.

Fallback: if EEVEE's known porch light leak carries through on a new house, render that shot with Cycles `high` at 1920px (about 9 minutes) instead. `sources` and `generate` both take `--engine` and `--quality` for this, defaulting to EEVEE preview.

Dusk needs one setting on narrow plots: `light.roomReach` in a shot's config caps how far each room light reaches, in metres. Without it, the 5 Marla dusk rendered black on this laptop's integrated GPU, and shortening the reach to 4 m fixed that. A 10 Marla dusk without it hung for over 2 hours on a repeat run; with it, the same shot renders in about 35 seconds. Both dusk shots use `roomReach: 4.0`.

### Plots

- **5 Marla, 25′×45′:** exactly 1,125 sq ft.
- **10 Marla, 35′×65′:** 2,275 sq ft, a familiar size that `plotSize` still labels 10 Marla. Preferred over an exact 30′×75′, which leaves a much narrower house. The designs are labelled concept and indicative.

### Layouts

Checked for fit before writing the program; final room sizes are for implementation.

**5 Marla.** Clear width is 23.5′ between 9-inch party walls, so daylight can only come from the front, the rear and from inside. About 3′ of open rear yard gives light and air, reached from the kitchen. The stair sits mid-plot, so a sky court over the ground-floor bath lights the family lounge and Bedroom 2. It is open to the sky and does not count as covered area.

```
 REAR  ┌────────────────────────────┐        ┌────────────────────────────┐
       │ rear yard (about 3')       │        │ (open to below)            │
       ├─────────────┬──────────────┤        ├───────┬──────┬─────────────┤
       │ Kitchen     │ Bedroom 1    │        │Laundry│Bath 2│ Bedroom 2   │
       │             │              │        │       │      │             │
       ├─────────────┼──────────────┤        ├───────┴──────┼─────────────┤
       │ TV lounge   │ Bath 1       │        │ Family       │ Sky court   │
       │             ├──────────────┤        │ lounge       ├─────────────┤
       │             │ Stair        │        │              │ Stair       │
       ├──────────┬──┴──────────────┤        ├──────────────┴──┬──────────┤
       │ Car      │ Drawing         │        │ Master bedroom  │ Master   │
       │ porch    │ 13x12           │        │                 │ bath     │
       │ 9' x 18' │                 │        ├─────────┐       │          │
       │          ├─────────────────┤        │ Balcony ├───────┴──────────┤
 STREET└── gate ──┴── wall, planter ┘        └─────────┘                   
          Ground                                First
```

**10 Marla.** The left wall is on the plot line. The 2-car porch runs to the right boundary at the front, and a side passage of about 4′ opens up behind it. That passage gives a side wall with windows and something for the three-quarter shots to show. Full-size minimums fit. Ground has the drawing room at the front left, TV lounge, foyer, guest bath, dining, kitchen with a store, and one bedroom with bath. First has a master suite with dressing in a box projecting over the porch, a roof terrace over the drawing room, two more bedrooms with baths, a family lounge and a laundry. The master box sits over the porch rather than the terrace because that is what gives this house its layered, asymmetrical front.

### Compact room minimums below 10 Marla

A 9′ car bay, a wall and a 14′ drawing room need 23.75′ on a 23.5′ width, so the large-house minimums cannot be met. The alternatives were to accept warnings, which fails `program.test.ts` and hides real problems, or to change the shared minimums, which loosens the check for every house. A second table applied only below 2,250 sq ft (values in the `building-designs` spec) keeps the check meaningful on both. The 40 sq ft attached bathroom minimum stays.

### Two different facades

Both draw on features common in modern Pakistani houses, composed for these concepts rather than copied from any real house.

| | 5 Marla: brick and jaali | 10 Marla: charcoal frame and timber |
|---|---|---|
| **Idea** | A narrow, vertical, screened front | A wide, layered, asymmetrical front |
| **Main walls** | Terracotta brick cladding, off-white plaster surround | Charcoal plaster box over light plaster and exposed concrete |
| **Signature** | Metal jaali grid across the first-floor balcony, for privacy and patterned light on a street-facing front | Tall frame around a large corner window, vertical timber slats on the stair tower, steel pergola on the terrace |
| **Ground floor** | Timber-faced porch ceiling and gate | Deep porch under the charcoal box |

Jaali, slats and pergola are all repeated facade boxes via the existing `repeat` helper, so the model needs no new shapes. Dusk reads differently on each too: light through the jaali, against a glowing corner window. The 5 Marla porch ceiling is timber and its front corner has a slim plaster pier. The 10 Marla porch ceiling is concrete, with a charcoal pier carrying the box. Facade pieces that reach the plan cut or sit above it also appear on the floor plans, as other facade boxes already do.

Two renderer rules came out of these materials, and neither can affect the older designs, which use one exterior material per level:

- **Cladding stands proud.** `brick-cladding` and `plaster-charcoal` skins are twice the plaster's thickness. Interior walls end flush with the plaster skin at a T-junction, and without this they show as pale strips on the darker facade.
- **Cladding wraps only the beams that run along it.** A beam takes its material from the wall nearest its midpoint, and only takes cladding if its midpoint is within 0.3 m of that wall. Otherwise a side beam or a beam across the porch would pick up brick from the nearest clad wall.

### Two new material tags

`brick-cladding` reuses the existing CC0 `red_brick` texture at a smaller tile size and warmer tint, for thin brick tiles. `plaster-charcoal` reuses `painted_plaster_wall` with a dark tint. No new assets are needed, so the lockfile doesn't change. `brick-structure` stays reserved for the construction phase. The tags are additive, so `SCHEMA_VERSION` stays at 1; `render/data/schema.json` is regenerated.

### Neighbours: fit small plots without moving existing ones

- **Setback:** `set_front = min(rng.uniform(4.5, 7.5), pd * 0.28)`. A 90′ plot allows 7.68 m, above the 7.5 m maximum, so the existing designs are unaffected. A 45′ plot caps at 3.84 m, and setback plus depth stays under 88% of the plot.
- **Coverage:** on each side, `max(3, ceil(45 / W))` plots, and `max(1, ceil(27 / D))` rows behind. Both give the current counts for 50′×90′ and 75′×120′.
- **Attached sides:** new `context.attached` in `render/shots/<slug>.json` (`["left", "right"]` or `["left"]`). The random values are still drawn, then ignored on that side, so the stream doesn't shift. Using the shot config avoids a change to the export format.

Verified by building the 1 Kanal scene before and after and comparing neighbour bounds.

### Enhancement script

- Model comes from `--model`, else `IMAGE_MODEL` from the environment or `.env`, else stop. The hard-coded Pro default goes.
- New `sources --design <slug>` runs `scripts/blender.mjs still` for each shot in `render/shots/<slug>.json` at 2048px, skipping those present.
- `generate` and `encode` require `--only` or `--design`, which protects the existing images from an unqualified run.
- Sources always come from `render/out/`: new designs from their EEVEE stills, existing still jobs from `<shot>-cycles-final.png`, hero jobs from frame 0191 of their EEVEE sequence. A missing source fails that shot and names the command.
- Jobs are built from `render/shots/*.json` plus per-design notes, not a hard-coded list.
- Prompts: add a per-design note on real materials (brick, charcoal plaster, timber) and whether the house is attached, and ask for well-kept, unremarkable neighbours. The aerial note stops assuming a lawn. `DESIGN_EDITS` stays for the old designs and isn't needed for new ones, because they are right in the data.

### Site order and copy

Order is 1 Kanal, 2 Kanal, 5 Marla, 10 Marla, which appends the new houses and leaves the existing pages' leading content as it is. In the two-column grid, the Kanal houses fill the first row and the Marla houses the second. "Mainly 1 Kanal and 2 Kanal" stays because it describes the business, not the concepts. The `/designs/` meta description changes because it lists sizes. The hero and featured design stay on 1 Kanal.

## Risks / Trade-offs

- **Fine jaali grid confuses the model** → Keep bars at a readable scale (about 3-inch bars at a 9–12 inch pitch) and retry. If it still warps, widen the pitch in the data. Review each still side by side at full size.
- **Model invents details** (seen: added facade lights) → Framing score only catches reframing, so every still gets a side-by-side review, and the prompt names what's not allowed. Retry or adjust, and escalate to the maintainer if it persists.
- **New houses look inconsistent with the old ones** → Intended by the maintainer. The shared page design, captions and the concept label hold the site together.
- **Rooms feel tight at 5 Marla** → The compact minimums are the floor, not the target. The maintainer reviews plans before any render.
- **Attached houses show little from the street** → The aerial and street shots may need different framing from the larger houses. Shots are tuned per design, and shot names stay the same so the site's registry and gallery don't change.
- **Plan labels crowd in small rooms** → Check every level at `/plans-preview/` and at 390px, which the `floor-plans` spec already requires.
- **Neighbour changes alter old scenes by accident** → Guarded by the before-and-after comparison above. No old still is re-rendered regardless.
- **An EEVEE render hangs instead of failing** → Seen once on a dusk shot, and `blender.mjs` has no time limit. Run renders under a time limit. A normal EEVEE still takes under a minute at 2048px, so several minutes means a hang.

## Migration Plan

All additive. The old stills are never touched, and the new designs go live together in one deploy. To roll back, revert the change; nothing else depends on the new designs.
