## Context

See `proposal.md` for why. The machinery already exists from the two earlier walkthroughs (archived changes `2026-11-09-add-5-marla-walkthrough` and `2026-11-10-add-1-kanal-walkthrough`):

- **Interior builder.** `render/noor_render/interior.py` builds finished rooms from `render/data/<design>.json`, driven by `render/shots/<design>-interior.json` (`palette`, `lights`, `roomTypes`, per-`rooms` overrides, `style` switches, `wallTiles`, `exposure`). The 1 Kanal turned on the modern switches (flush doors, shadow-gap skirting, light slots, floating vanities, wall-hung WCs, handleless cabinetry, travertine / oak-panel features, pendants), and they are off by default.
- **Walls today.** A room's wall faces are built as `paint-<room>` panels in `pal.wall`, the one colour in the palette. Reveals, casings, stair paint and void paint use the same colour. The only per-room wall choices are `wallTile` / `wallTileKey` (wet rooms) and the feature wall. There is no per-room paint colour and no wallpaper.
- **Materials.** `materials.py` keeps its textured materials in world-space triplanar projection, because scene objects are built in world coordinates with identity transforms. `render/assets/textures` holds CC0 textures (travertine, plaster, oak, concrete and others) locked in `render/assets.lock.json`. Interior materials, such as the oak and slab tones, are built procedurally in `interior.py` / `materials.py`.
- **Walkthrough data and validation.** `src/designs/walkthroughs/<slug>.json` lists the viewpoints. `walkthrough.ts` discovers files by glob, validates rooms, links, `excluded` rooms and open boundaries, and fails the site build on a fault. No site code changes are needed.
- **Rendering.** Colab L4 with OptiX, about 3.5 minutes per view at `mid`, driven by the existing script in `scripts/colab/`.

The 10 Marla (`render/data/10-marla.json`):
- **Ground:** `drawing` 241 sq ft, `lounge` (TV lounge, L-shaped, opens to dining and foyer) 298, `foyer` 39, `powder` 54, `dining` 189, `kitchen` 112 with `store` 35, `bed1` 189 with `bath1` 66. One dog-leg stair, with `steps`.
- **First:** `master` 248 (a box over the porch with a corner window), `dressing` 48, `master-bath` 63, `laundry` 45, `family` 225, `corridor` 52, `closet` 36, `bed2` 219, `bath2` 51, `bed3` 169, `bath3` 67 and the `terrace` 247 (outdoors, steel pergola). Roof: `stair-room`.
- **Fixtures** are kitchen counters, hob and sink, WCs, basins and showers, wardrobes, and a laundry counter. There is no double-height space, and the `stairwell` void is already handled by the 1 Kanal's void code.
- **Room types in use:** 15 (`drawing`, `tv-lounge`, `foyer`, `powder-room`, `dining`, `kitchen`, `store`, `bathroom`, `bedroom`, `master-bedroom`, `dressing`, `laundry`, `family-lounge`, `corridor`, `terrace`) plus the excluded `stair-room`. The 1 Kanal config has no entries for `foyer`, `laundry` and `store`.

## Goals / Non-Goals

**Goals:**
- A third look that is clearly its own and holds together across all rooms, defined in `render/shots/10-marla-interior.json` and nowhere else.
- Wallpaper and per-room paint as general builder features that any design can use.
- 5 Marla and 1 Kanal panoramas unchanged (CUDA, same checks as before).

**Non-Goals:**
- Furniture, rugs, art, curtains, plants indoors, or any other loose decor. Fixed joinery and wall finishes are in scope; the finished-and-unfurnished rule is unchanged.
- The roof, its stair room, and exterior viewpoints other than the gate.
- Re-styling the 5 Marla or 1 Kanal, or changing their walkthroughs.
- Floral, figurative or photographic wallpapers, and any wallpaper that needs a licence.

## Decisions

### D1. The 10 Marla style: "Midnight Atelier"
One theme, four materials, in every room. Rooms differ in which one leads.

```
                  1 Kanal (warm minimal)        10 Marla (Midnight Atelier)
  walls           warm white mineral paint      ink, ivory and greige paint; wallpaper in
                                                five spaces
  doors / skirt   flush, no casing, shadow gap  walnut leaf, slim brass-inlaid casing; low
                                                dark skirting with a brass line
  ceiling light   floating edge, linear slots   tray with indirect warm cove and brass-
                                                ring downlights; 2700 to 3000 K
  floors          honed pale stone, oak         pale veined porcelain (public rooms);
                                                smoked herringbone walnut (bedrooms)
  metal           dark bronze / black           satin champagne brass, the one accent
  features        travertine, fluted oak        brass-inlaid walnut panelling, fluted
                                                walnut media wall, arched niches
  baths           warm or dark slab             dark veined slab (master bath, powder),
                                                ivory slab (others); floating vanity,
                                                wall-hung WC, brass fittings
  kitchen         greige / oak two-tone         ink lowers, walnut talls, brass handles,
                                                marble splashback
```

Per-room treatment (paint or paper, plus what leads):

```
  ROOM            WALLS                                          LEADS
  foyer           ink-green paint                                brass-framed mirror
  drawing         WALLPAPER ivory/champagne art-deco fan         walnut + brass panelling to 1.1 m
  tv-lounge       ink paint                                      fluted walnut media wall, lit niche
  dining          WALLPAPER dark charcoal-navy grasscloth        brass-trimmed panel wall, pendant
  kitchen         ivory paint                                    walnut talls, marble splash
  powder          WALLPAPER dark geometric                       backlit mirror, brass fittings
  master bed      WALLPAPER champagne ribbed (headboard wall);   headboard wall with two lit niches
                  other walls greige paint
  family          greige paint + one walnut wall                 arched niche, slatted walnut
  bed2            sage-grey paint                                walnut headboard wall
  bed3            WALLPAPER tonal clay-blush                     quieter, warmer
  bed1            ivory paint                                    walnut headboard wall
  baths           dark slab (master bath) / ivory slab (others)  floating vanity, brass taps
  corridor        ink paint to a picture rail                    brass line, ivory ceiling
  laundry, store, closet   ivory paint                           plain, functional
  dressing        ivory paint                                    walnut wardrobes, brass pulls
  terrace         real sky; concrete and timber as outside        steel pergola
```

Values (colour, tone, roughness, brass tint) are config. The maintainer approves the look at the style gate (D6). Alternative considered: light "modern ivory". The maintainer chose the dark mood on 2026-11-11, and it matches the charcoal exterior.

### D2. Per-room wall finish
A room gets an optional `wall` in its `roomTypes` entry or its per-room override: either a colour (linear RGB) for paint, or `{ "paper": "<key>" }` for wallpaper (keys defined under `palette.papers`). With no `wall`, the room uses `pal.wall`, exactly as now, so the 5 Marla and 1 Kanal build code paths are untouched.

The `paint-<room>` panels take the room's material. Reveals, casings, door returns, ceilings and soffits are painted a plain colour: for paint rooms the room's colour, for paper rooms the paper's `ground` colour. That avoids a pattern wrapping around a door reveal. The same material is used on stairs and the stairwell when that room is the one the stair belongs to (the foyer / lounge side), so the stair wall matches its room.

Alternative considered: a second `wallpaper` key beside `wall`, with the pattern as an overlay on a painted base. Rejected: it needs two materials and a mask per wall, with no gain.

### D3. Wallpaper material
Wallpapers are drawn as tileable images with numpy (`render/noor_render/wallpaper.py`) and wrapped in a Cycles material, one per room. Drawing the tile in Python, instead of building the pattern from shader nodes or downloading a texture, has three advantages: patterns can be viewed and tuned locally without Blender (`python render/noor_render/wallpaper.py <config> <out.png>`), they are exactly repeatable, and nothing needs licensing (so no `assets.lock.json` entry). Blender only reads the images, so a failure there is limited to the mapping.

- **Pattern alignment.** The 10 Marla's walls are all axis-aligned. Each tile is addressed from the room's lower-left corner along whichever axis the wall runs (from the face normal), and from the floor upward, so the pattern starts square at the corner and runs the same size on every wall. The builder raises an error naming the room if a wallpapered room has a wall off the axes.
- **Patterns** (config under `palette.papers`, linear RGB):
  - `fan`: art-deco fans, rows of overlapping circles drawn as concentric rings, the lowest row on top so the fans open upward. Ivory with champagne lines, foil-shiny lines on a matte ground.
  - `ribbed`: fine vertical flutes with a lighter crown (the master's headboard wall).
  - `geo`: a diamond trellis with beads where the lines cross and a ring at each diamond's centre, low contrast on ink (the powder room).
  - `grasscloth`: horizontal strands that each carry a tone and a slow slub, with a fine vertical weft (the dining room). Procedural, so no texture is downloaded.
  - `stripe`: a tonal stripe, a wide matte band and a narrow satin one (bedroom 3).
  - Each tile also carries a height map (bump) and a roughness map.
- **Which faces.** Wall panels only, as in D2. A paper may also cover a feature wall: the feature kind `paper` draws a thin panel over the chosen wall, framed in brass with a concealed light line above, in the palette paper named by `featurePaper`. It stands in for the headboard wall in the master bedroom.
- **Herringbone floors.** The same module draws a 90-degree herringbone floor (planks four times as long as wide, each its own tone, with grain along it and a joint round it), used for the bedrooms and family lounge as the floor kind `herringbone`. It is laid from the plan origin, so all rooms share one continuous pattern.

Alternatives considered: building each pattern from Blender shader nodes (every change needs a Colab round trip to see, and a fan or a herringbone is awkward as nodes); a CC0 grasscloth texture (none was found that suits a dark, fine weave, and a procedural one is dependable).

### D4. Ceiling, cove, metal and brass
- The 5 Marla's `ceiling: "cove"` is already the tray look: a band dropped 14 cm round the edge of the room with a brass lip on its lower edge and a lit LED cove set back from it. It needs no new option, and the 10 Marla uses it in the drawing room, dining, TV lounge, family lounge and the bedrooms.
- Metal is the palette's `brass` key, set to a lighter, less saturated satin champagne (the 5 Marla's brass is a darker yellow, so the two do not read alike). Brass is used for downlight rings, panel inlay lines, door pulls, mirror frames and taps.
- The warm colour moves from the 1 Kanal's neutral warm to about 2700 to 3000 K, slightly lower in the lounges, bedrooms and powder room.

### D5. Viewpoints: every reachable room, about 27 views
```
GROUND (11)                               FIRST (15)
  drawing      drawing, drawing-window    master        master, master-end
  foyer        foyer                      dressing      dressing
  lounge       lounge, stair-foot         master-bath   master-bath
  dining       dining                     laundry       laundry
  kitchen      kitchen                    family        family, family-back, stair-head
  store        store                      corridor      corridor
  powder       powder                     closet        closet
  bed1         bed1                       bed2, bath2   bed2, bath2
  bath1        bath1                      bed3, bath3   bed3, bath3
                                          terrace       terrace
OUTDOOR (1)  gate: at the car gate, looking at the porch, links to the TV lounge via main-door.
```

- **Left out:** the roof's `stair-room`, named in `excluded` with the reason "The roof is not part of the tour". The `terrace` is reachable from the family lounge through a sliding door, so it is in.
- **Links** go through a door, an opening, or the stair. The ground floor's `foyer-arch` (lounge and foyer) and `dining-arch` (lounge and dining) are openings in a wall, so they are `via` an opening id. The stair joins `stair-foot` and `stair-head`. Exact positions and facings come from EEVEE previews and perspective probes (`--perspective`), as before. The gate view's position is picked to see the car porch, the main door and the charcoal box above.
- **Tiny rooms** (foyer 39 sq ft, store 35, closet 36, dressing 48, laundry 45) get a spot at the centre, facing the way out, and a description that says what the space is for.

### D6. Render plan
- **Style gate:** `drawing` (wallpaper), `master-bath` (dark slab) and `kitchen` (two-tone) at `mid`, about 4 minutes each. The maintainer approves, or asks for changes to the config, before the full set.
- **Full set:** about 27 views at `mid` on an L4 with OptiX, about 1.5 to 2 hours plus about 20 minutes of setup and downloads. One blocking `colab exec` per view, PNG downloaded at once, existing files skipped, one retry on a dropped connection, session always stopped. G4 tried first, L4 as the fallback.
- **Dark rooms are the noisy ones.** Ink walls take light, so views with a lot of dark wall may speckle after denoising at `mid`. The existing fix applies: softer, larger lights (`spotRadius`), a gentle exposure lift, and a `high` re-render of only the views that still show it. Ink is used as a leading wall colour in three rooms only (foyer, TV lounge, corridor), and ivory or greige in the others, so the house is moody without being a cave.

### D7. Site
`walkthrough.ts` already discovers walkthrough files by glob, so adding `10-marla.json` registers the 10 Marla page's section. A test asserts all three are found. Thumbnails and panoramas go under `public/walkthroughs/10-marla/`, and stills for the no-JavaScript list use the thumbnails.

## Risks / Trade-offs

- **Wallpaper that looks fake** → Geometric and woven patterns only, tonal, low contrast, at a believable repeat size. The style gate shows the drawing room first, with its pattern at full resolution.
- **Dark rooms read as muddy or noisy** → Ink only as a leading colour in three rooms. Brass and warm cove light lift each room. The style gate includes the darkest bath. Exposure and light size are config.
- **New wall-finish code could shift the other two designs** → The `wall` option is read only when set. The three baseline views from the 1 Kanal change are re-rendered with CUDA and diffed, expecting no change beyond noise (the spec's one-level tolerance).
- **Pattern alignment on L-shaped rooms** (the TV lounge is L-shaped, though it is painted) → Wallpaper is used only in rectangular rooms (drawing, dining, powder, master bedroom, one bedroom), and the builder fails clearly on a non-axis-aligned wallpapered room.
- **Eye-level faults in the design data** → As on earlier walkthroughs, expect a fitting or two to move in `10-marla.ts` after the first panoramas. It changes that design's floor plans and export only, and is reported when it happens.
- **Colab** → Same mitigations as before: L4 fallback, file logs, per-view exec, immediate download, resumable runs, always stop.
- **Payload** → about 27 panoramas at about 0.5 MB, loaded only after Start, with only neighbouring views preloaded.

## Migration Plan

1. Build the per-room wall finish and the wallpaper material (D2, D3). Check the 5 Marla and 1 Kanal baselines are unchanged.
2. Write `render/shots/10-marla-interior.json` and `src/designs/walkthroughs/10-marla.json`. Pick views with EEVEE previews and perspective probes. Clay-check the tray ceiling.
3. Style gate: three `mid` panoramas on an L4, approved by the maintainer.
4. Render the full set at `mid`, make the contact sheet, review, and re-render what changes.
5. Encode to `public/walkthroughs/10-marla/`, and verify the site.
Rollback: delete `src/designs/walkthroughs/10-marla.json` and the section disappears from the 10 Marla page. With `wall` unset, no other design changes.

## Open Questions

- The exact colour values of the ink, greige and blush paints and the brass tone, settled at the style gate.
- How the procedural grasscloth reads on a Cycles render, settled at the first probes (the strand pitch and tone range are config).
