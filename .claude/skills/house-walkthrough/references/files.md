# The two files you write

## 1. `src/designs/walkthroughs/<slug>.json`: the spots

The schema is the zod `Walkthrough` in `src/designs/walkthrough.ts`; read its comments. In short:

```json
{
  "design": "2-kanal",
  "levels": ["ground", "first"],
  "start": "gate",
  "walking": true,
  "viewpoints": [
    { "id": "gate", "room": null, "label": "Front gate", "level": "ground", "at": [23, 1.5], "facing": 90,
      "description": "At the car gate ...", "links": [{ "to": "porch" }] },
    { "id": "porch", "room": null, "label": "Car porch", "level": "ground", "at": [22, 10], "facing": 90,
      "description": "The car porch ..., with the main door ahead.", "links": [{ "to": "gate" }, { "to": "foyer", "via": "main-door" }] },
    { "id": "drawing", "room": "drawing", "level": "ground", "at": [8, 9], "facing": 90,
      "description": "The drawing room, ...", "links": [{ "to": "foyer", "via": "drawing-door" }, { "to": "drawing-window" }] },
    { "id": "stair-landing", "room": "stair-hall", "label": "Stair landing", "level": "ground", "at": [2.6, 24.2], "rise": 5.79,
      "facing": 45, "description": "The half landing ...", "links": [{ "to": "stair-foot", "via": "stair" }, { "to": "stair-turn" }] }
  ],
  "excluded": [
    { "level": "roof", "room": "stair-room", "reason": "The roof is not part of the tour." }
  ]
}
```

These example coordinates come from the 10 Marla. Take real ones from the 2 Kanal plan.

Rules the validator enforces (`npm test` / `npm run build` fail otherwise):
- every room on every listed level has at least one spot, unless it is in `excluded`;
- `at` is inside the room's outline (spots with `rise` > 0 are exempt, because they stand on the stair);
- a link with `via: <door id>` joins the two rooms that door joins; `via: "open"` needs at least 2 ft of shared outline with no wall; `via: <stair id>` joins spots on different levels or rises;
- links are reciprocal;
- ids are lowercase letters, digits and dashes, and unique.

Conventions from the earlier tours:
- **Descriptions** are one or two plain sentences saying what you see in the order a visitor sees it: finishes, light and where the doors lead. No selling words. See the 10 Marla file for tone. Generated `w-` and `d-` spots get a stock description from the generator, which is fine.
- **Facing:** open on the room's main feature (the feature wall, the window, the view through to the next room), never on a blank wall or into a corner.
- **Position:** at least 2 ft from walls (`check_spots.py` warns under 1.2 ft), clear of fixtures, not in a door swing. Tiny rooms (a store, a dressing room) get one spot in the centre facing the way out.
- **Outdoor spots** (`room: null`): `gate` and `porch`. Each also needs a `viewpoints.<id>` entry with `"outdoors": true` in the interior config, so it gets the real sky and its eye height from the ground.
- **Stair spots:** `stair-foot` on the lower level, `stair-landing` and `stair-turn` on the half landing (same `level` as the foot, with `rise` = the landing's height above that floor, which you can read from the stair's `steps` tops in the export minus the level's `elevation`), and `stair-head` on the upper level. Link them with `via: "stair"`. The 10 Marla file is the model.

## 2. `render/shots/<slug>-interior.json`: the look

Read by `render/noor_render/interior.py` (`load_config`). The style switches and their defaults are listed in `render/noor_render/style.py`. Start from a copy of `render/shots/1-kanal-interior.json` (the closest structure: double-height void, glass balustrade, open doors), then change the values.

| Key | What it does |
|---|---|
| `levels` | levels to build, e.g. `["ground", "first"]` |
| `voids` | `true` to finish double-height voids and stairwell edges (ceilings, walls rising two storeys, fascia, balustrade). **Needed for the 2 Kanal lounge void** |
| `voidCeiling`, `pendant` | the void's ceiling slots, and a linear pendant `{ "length", "height" }` hanging into the double-height space |
| `mergeWallPieces` | `true`: paint overlapping wall pieces once (doubled faces render black in Cycles). Keep it on |
| `clearColumns` | `true`: trim a window the export runs into a column (interior renders only) |
| `outdoorStairs` | stair id → `{ "tread", "side" }` for a stair built in exterior materials (the indoor rebuild skips it) |
| `style` | design-wide switches: `doors` (`cased`/`flush`), `skirting` (`board`/`shadow-gap`), `cabinetry` (`handled`/`handleless`), `wc` (`floor`/`wall-hung`), `vanityStyle` (`standing`/`floating`), `shower` (`rail`/`rain`), `balustrade` (`rail`/`glass`), `stairRails` (`x`/`both`/`all`), `openDoors` (`true`: inside doors stand open; **needed for walking tours**) |
| `palette` | colours are **linear RGB** 0–1 (not sRGB: 0.2 linear is about 124/255). Keys: `wall`, `ceiling`, `trim`, `skirting`, `cove`, `coveGlow`, `downlight`, `downlightGlow`, `wash`, `metal` `{color, rough}`, `base`, `door`/`slat`/`upper`/`vanity`/`wardrobe` (a wood key), `woods` (named wood tones `{a, b, rough, coat}`), `stones`, `marble` `{base, vein}`, `featureStone`, `stairTread`, `papers` (wallpapers, see `wallpaper.py`) |
| `wallTiles` | named slab/tile finishes for wet rooms `{a, b, grout, size, rough, vein, veinStrength}` |
| `lights` | strengths and colours: `color`, `coveColor`, `cove`, `spot`, `edge`, `slot`, `wash`, `pendant`, `stair` |
| `roomTypes` | one entry **per room type in the design** (plus `default`): `ceiling` (`flat`/`cove`/`slots`/`none`), `floor` (a floor key), `wall` (paint RGB or `{ "paper": key }`), `featureWall` (`auto` or a wall), `featureKind` (`fluted`/`media`/`headboard`/`travertine`/`fluted-tight`/`oak-panel`/`paper`), `panelling`, `wallTile` + `wallTileKey`, `downlightSpacing`, `downlightRadius`, `spotRadius`, `door`, `backlitMirror`, `lightLine`, `uppers`, `consoles`, `waterfall`, `splashback`, `ceilingHeight`, `finish: "exterior"` (terraces) |
| `rooms` | per-room overrides keyed `"<level>/<room id>"`, with the same keys as `roomTypes` |
| `sun`, `skyFill`, `exposure` | daylight `{azimuth, elevation, strength}`, sky light bounced indoors, and global exposure in stops |
| `viewpoints` | per-spot overrides: `exposure`, `sun`, `haze`, `outdoors: true` |

**Floors** are named under `palette.floors` in this same file, and a room type's `floor` must name one of them. Each is a tile `{a, b, grout, size, rough, vein, veinStrength}`, or `{"kind": "wood", a, b, rough, size}`, or `{"kind": "herringbone", ...}` (see `def floor(` in `interior.py` and the 1 Kanal and 10 Marla configs). Feature kinds are handled in `feature_wall` / `_modern_feature` in `interior.py`, and ceiling modes in `ceiling()`. Before using any key, check that it exists by searching for it in `interior.py` or an existing config. An invented key either does nothing or falls back to a default, without an error.

**How the existing looks differ.** The new house must look like none of these:

| | 5 Marla "warm classic" | 1 Kanal "warm minimal" | 10 Marla "Midnight Atelier" |
|---|---|---|---|
| walls | beige paint, mouldings | warm white mineral paint | ink, ivory, greige paint; wallpapers |
| doors | oak, cased | flush to ceiling, no casing | walnut, slim brass-inlaid casing |
| ceiling light | amber cove, round downlights | shadow-gap edge, linear slots | tray cove, brass-ring downlights |
| floors | beige porcelain, oak | honed pale stone, wide oak | pale veined porcelain, herringbone walnut |
| metal | brass | dark bronze / black | satin champagne brass |
| features | slatted oak, brass inlay | travertine, tight-fluted smoked oak | walnut + brass panelling, fluted walnut |
| baths | beige tile to 2.2 m | full-height warm or dark slab | dark or ivory slab, brass |

## Snippets to inspect a design's export

```
python -c "import json;d=json.load(open('render/data/2-kanal.json'));[print(l['id'],[(r['id'],r['type']) for r in l['rooms']]) for l in d['levels']]"
python -c "import json;d=json.load(open('render/data/2-kanal.json'));print(sorted({f['type'] for l in d['levels'] for f in l.get('fixtures',[])}))"
python -c "import json;d=json.load(open('render/data/2-kanal.json'));[print(l['id'],o['id'],o['type'],o['wall']) for l in d['levels'] for o in l['openings'] if o['type']!='window']"
```
Room types used in the design but missing from `roomTypes` show up in the render log as `falls back to default`. Fixture types the builder does not handle are **silently skipped**: they do not appear in the render at all. Check every fixture type against the `kind == "..."` branches in `fixtures()` in `interior.py`.
