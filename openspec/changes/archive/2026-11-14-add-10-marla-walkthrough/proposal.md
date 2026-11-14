## Why

The 5 Marla and 1 Kanal can be walked through; the 10 Marla, the middle size and the one with the strongest exterior (a charcoal box over light plaster, concrete frame, timber slats, steel pergola), cannot. Its interior should not repeat either finished house. The 5 Marla is warm classic and the 1 Kanal is warm minimal, so the 10 Marla gets a third, deliberately contrasting look: dark, moody and sophisticated, with a deep ink-and-ivory palette, satin brass and smoked walnut, matching the dark shell outside. A buyer should see that the same builder can finish a house in a different, fully resolved style.

Two things the maintainer asked for are new to the builder: **wallpaper** on the walls of some rooms, and **different paint colours per room**. Today every wall in a design is one flat palette colour, plus feature-wall kinds. Both are needed for the theme to work, and both are useful to every later design.

## What Changes

- **A full 10 Marla walkthrough.** Every room reachable from inside gets at least one viewpoint, about 27 views: an outdoor view at the car gate, then on the ground floor the drawing room, foyer, TV lounge and its stair spot, dining, kitchen, store, guest bath, bedroom 1 and its bath, and on the first floor the master bedroom, dressing, master bath, laundry, family lounge with the stair head, corridor, closet, bedrooms 2 and 3 with their baths, and the terrace. Large rooms get a second spot. The stair-room on the roof is left out and named as an exception with a reason (the roof is not part of the tour).
- **One theme, "Midnight Atelier", for the whole interior.** Four materials in every room: ink (deep charcoal-green, matching the exterior box), ivory, satin champagne brass, and smoked walnut. Pale veined porcelain in the public rooms and herringbone smoked walnut in the bedrooms; tray ceilings with an indirect warm cove and brass-ring downlights at 2700 to 3000 K; satin brass as the one repeated metal; walnut joinery with brass inlay lines; floating vanities and dark or ivory slab baths; a two-tone kitchen (ink lowers, walnut talls, brass handles, marble splashback). Rooms differ only in which material leads, so nothing breaks the palette.
- **Wallpaper in five spaces, paint in the rest.** Wallpaper: the drawing room (ivory art-deco fan on champagne), the dining room (dark charcoal-navy grasscloth), the powder room (dark geometric), the master bedroom's headboard wall (champagne ribbed) and one other bedroom (tonal clay-blush). Every other wall is paint, in a colour chosen per room from the same ink, ivory and greige family. Patterns are geometric or woven, never floral, so they stay tonal.
- **New interior builder features** (switched on per room in config, so the 5 Marla and 1 Kanal builds are unchanged):
  - A per-room wall finish: a paint colour, or a wallpaper key, applied to the room's wall faces (the ones that today use the single palette colour).
  - A wallpaper material: procedural for the geometric patterns, and one CC0 grasscloth or linen texture. Seams are tidy, the pattern repeat is world-scaled and aligned to the wall, and nothing needs licensing.
  - Tray ceilings with a warm indirect cove, brass-ring downlights, and brass inlay lines in walnut panelling, built from elements the builder already has plus the brass key.
- **Gate viewpoint.** An outdoor viewpoint at the 14 ft car gate, looking at the car porch and the box above, like the 5 Marla and 1 Kanal gate views. It links to the TV lounge through the main door.
- **The site.** The 10 Marla design page gets the existing walkthrough section: panoramas, stills for the no-JavaScript fallback, room descriptions and the floor-plan map. No page code changes beyond the new walkthrough data file, because the walkthrough list is already discovered by glob.
- **Render plan.** Style gate first: the drawing room (wallpaper), the master bath (dark slab) and the kitchen at `mid`, approved before the full set. Then all views on a Colab L4 at `mid`.

## Capabilities

### New Capabilities
<!-- none: the walkthrough, interior and panorama capabilities exist -->

### Modified Capabilities
- `interior-walkthrough`: "Rooms covered" adds the 10 Marla room list, including its outdoor gate view and the one named exception (the roof stair room).
- `render-pipeline`: "Interior from design data" gains per-room wall finishes (paint colour or wallpaper) and the wallpaper material; "Interior style per design" covers the 10 Marla's own style and the rule that new elements stay off for designs that do not turn them on.

## Impact

- **Render code:** `render/noor_render/interior.py` (the per-room wall finish for paint panels and wall faces; brass inlay and tray cove options), `render/noor_render/materials.py` (procedural wallpaper materials and the grasscloth texture), `render/assets.lock.json` plus `npm run render:fetch` if a CC0 texture is added.
- **Config and content:** new `render/shots/10-marla-interior.json` and `src/designs/walkthroughs/10-marla.json` (about 27 viewpoints with descriptions); panoramas and thumbnails under `public/walkthroughs/10-marla/` (about 27 × 0.5 MB, loaded only after the visitor starts).
- **Site:** nothing beyond the new walkthrough file, plus a registration test case.
- **Design data:** the 10 Marla stays as it is unless an eye-level fault shows up, as on earlier walkthroughs. Any fitting that moves changes that design's floor plans and export only, and is reported when it happens.
- **Compute:** about 27 views at about 3.5 minutes on an L4 (OptiX), so about 1.5 to 2 hours of rendering plus setup, plus review re-renders.
- **Not affected:** the 5 Marla and 1 Kanal interiors and walkthroughs (checked by rendering baseline views with CUDA before and after), exterior renders, the hero, the content rules and the deploy.
