## Why

The 1 Kanal is the flagship design and the size Noor Developers builds most, yet only the 5 Marla can be walked through. The 5 Marla walkthrough proved the experience and the pipeline. The 1 Kanal now needs its own walkthrough, and it should not look like the smaller house with more rooms. A larger house is where a buyer expects a more refined finish, so its interior should read as modern, calm and sophisticated, and clearly a step up from the 5 Marla's warm classic look with its panel mouldings and brass.

Rendering is now fast enough to make this practical. A probe on 2026-11-09 measured a Colab L4 with OptiX at 3.9× the T4 used for the 5 Marla: about 3.5 minutes per panorama at `mid`, with images that match the T4 except for noise. A full set of over forty views becomes an afternoon's run, not an overnight one, and review rounds take hours instead of days.

## What Changes

- **A full 1 Kanal walkthrough.** Every room that can be reached from inside the house gets at least one viewpoint, 40 views in all (39 first, then a second Bath 4 spot the maintainer asked for on 2026-11-10): every bedroom, bath and dressing room, the powder room, the kitchen, the raw kitchen and the kitchenette, the dining room, both lounges, the study, every lobby, passage and link, the electrical room, the stair, and three terraces. Large rooms get a second spot. The tour has two storeys. The roof is not part of the tour. The front terrace over the porch has no door and the washroom opens only to the outside, so the maintainer chose to leave those two out (2026-11-09). The walkthrough names them as exceptions.
- **Design data fixes found while planning views** (maintainer decisions, 2026-11-09):
  - The ground-floor Stair lobby becomes an L-shape that takes in the main stair, which stood in no room.
  - The first-floor lounge window onto the side terrace becomes a sliding door, so the terrace can be visited.
  - The exterior stills and the hero video are *not* re-rendered for the new door.
- **Open boundaries in the tour.** Rooms that meet with no wall, such as a lounge and its kitchenette, can be linked. The circle sits at the middle of the open stretch, and the site build still fails a link that would pass through a wall.
- **A separate, modern interior look for the 1 Kanal.** The palette is warm minimal: warm-white matte mineral walls with no panel mouldings; large-format honed stone-look floors in the living areas and wide-plank oak in the bedrooms; travertine and fluted oak or walnut feature walls; dark bronze or matte black metal instead of brass; flush full-height doors; shadow-gap skirting; trimless linear light slots and a floating ceiling edge instead of amber coves; frameless glass; floor-to-ceiling slab bathrooms with floating vanities; and a handleless kitchen with a full-height stone splashback. Lighting is a neutral warm white rather than amber. The look is set entirely in the 1 Kanal interior config. The 5 Marla config and renders do not change.
- **New interior builder features the look and the house need.** These are switched on per design in config, so the 5 Marla build is unchanged:
  - Double-height spaces: the entrance hall rises through the first floor, so its ceiling is the roof slab. The void and stairwell edges on the first floor get frameless glass balustrades with a slim handrail.
  - Every stair in view: the dog-leg main stair is finished as an interior stair, and the L-shaped stair from the first-floor terrace to the roof is finished as an exterior stair.
  - Modern elements: flush full-height doors without casings, shadow-gap skirting, linear light slots, travertine, wall-hung WCs, floating vanities, handleless cabinetry, and a statement pendant in the double-height hall.
  - Fittings the 1 Kanal data uses that the builder does not yet finish, such as the vanity unit in Bath 3.
- **GPU rendering uses OptiX.** The pipeline tries OptiX first and falls back to CUDA. A flag can force CUDA so that 5 Marla regression renders stay pixel-identical. Renders run on a Colab L4. The G4 is tried when Colab has capacity for it.
- **Style approval before the full set.** Three key views (the double-height hall, the drawing room and the master bath) are rendered first for the maintainer to approve the look. Only then is the whole set rendered.
- **The site.** The 1 Kanal design page gets the existing walkthrough section, with its panoramas, stills for the no-JavaScript fallback, and room descriptions. No new page code is needed beyond registering the walkthrough data file.

## Capabilities

### New Capabilities
<!-- none: the walkthrough, interior and panorama capabilities exist -->

### Modified Capabilities
- `interior-walkthrough`: "Rooms covered" adds the 1 Kanal room list, including the double-height hall seen from both storeys, and lets a walkthrough name rooms it leaves out, each with a reason. Every other room must still have a viewpoint. "Moving between rooms" adds open boundaries as a way from one room to the next.
- `render-pipeline`: "Interior from design data" gains per-design finish styles, double-height spaces with balustrades, all stair types and the modern finish elements. "Panorama render" gains GPU backend selection (OptiX, then CUDA, with a way to force one) and reproducible regression renders.

## Impact

- **Render code:** `render/noor_render/interior.py` (new elements and stair types, voids, balustrades, style options), `render/noor_render/output.py` (`use_gpu` backend order and override), and possibly new procedural materials (travertine, honed stone) in `materials.py`.
- **Config and content:** new `render/shots/1-kanal-interior.json` and `src/designs/walkthroughs/1-kanal.json` (about 41 viewpoints with descriptions), and panoramas and thumbnails under `public/walkthroughs/1-kanal/` (about 41 × 0.5 MB, loaded only after the visitor starts the tour).
- **Site:** register the 1 Kanal walkthrough in `src/designs/walkthrough.ts`. That file imports each walkthrough JSON by name, so one line is added, or the import becomes a glob so that later designs need content only.
- **Design data:** `src/designs/1-kanal.ts` gets the L-shaped Stair lobby and the side-terrace sliding door. Its export (`render/data/1-kanal.json`) and floor plans change to match. Committed 1 Kanal exterior stills and the hero video are left as they are, so the side terrace door is not in them. Any further eye-level fault is reported when it is found.
- **Walkthrough check:** `src/designs/walkthrough.ts` accepts open-boundary links and an `excluded` room list, with tests.
- **Compute:** 39 views at `mid` on an L4 with OptiX, at about 3.6 min each (measured), so about 2.5–3 hours and 5–6 Colab compute units, plus review re-renders. The balance is about 289 CU.
- **Not affected:** 5 Marla interiors and walkthrough, exterior renders and exports of all designs, the hero, content rules and the deploy.
