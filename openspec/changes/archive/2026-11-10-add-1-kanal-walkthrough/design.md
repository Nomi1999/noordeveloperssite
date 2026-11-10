## Context

See `proposal.md` for why. The 5 Marla walkthrough (archived change `2026-11-09-add-5-marla-walkthrough`) built the machinery this change reuses:

- **Interior builder.** `render/noor_render/interior.py` builds finished rooms from `render/data/<design>.json`, driven by `render/shots/<design>-interior.json`. That config has a `palette`, `lights`, `roomTypes` (ceiling `flat|cove|none`, floor key, `featureWall`/`featureKind` of `fluted|media|headboard`, `panelling`, `wallTile`, `spotRadius`), per-`rooms` overrides, `sun`, `skyFill`, `wallTiles` and `exposure`. Fixtures it can finish are `counter`, `sink`, `hob`, `wc`, `shower`, `wardrobe` and `basin`/`vanity`. Its stair rebuild handles any stair with a `steps` list and skips stairs without one.
- **Walkthrough data and validation.** `src/designs/walkthroughs/<slug>.json` lists the viewpoints. `src/designs/walkthrough.ts` validates them and fails the site build if any room has no viewpoint, a link isn't reciprocal, or a viewpoint lies outside its room. It currently imports `5-marla.json` by name.
- **Viewer and section.** `Walkthrough.astro`, Pannellum 2.5.6 vendored, the floor-plan map and the no-JavaScript fallback all work for any design that has a walkthrough entry.
- **GPU rendering.** `output.use_gpu()` tries CUDA, HIP and oneAPI and leaves out OptiX, a rule left over from Colab's T4. The probe on 2026-11-09 found that the L4 offers OptiX (`libnvoptix` in `/usr/lib64-nvidia`, driver 580). Measured on the 5 Marla drawing room at `mid`, 4096 × 2048: T4 CUDA about 13 min, L4 CUDA 242 s with output pixel-identical to the T4, L4 OptiX 202 s with a difference of noise only (mean 0.07/255). Scene build takes about 12 s per view. The L4 costs 1.94 CU/h. The G4 returned 503 (no capacity) twice.

What the 1 Kanal brings that the 5 Marla did not have (from `render/data/1-kanal.json`):
- **36 rooms**: 16 on the ground floor, 20 on the first (four of them terraces). 16 room types, of which 8 have no `roomTypes` entry: `stair-hall`, `dining`, `powder-room`, `corridor`, `back-kitchen`, `dressing`, `study` and `other`.
- **A double-height entrance hall.** The first-floor slab has voids `lobby-void` (`double-height`, about 14 × 18 ft over the ground `lobby`) and `stairwell`. The first-floor `pier`, `pier-link`, `passage` and `passage-side` sit around the void's edge.
- **Three stairs**: `stair` (dog-leg, ground to first, inside, with steps); `roof-stair` (L-shaped, rising from the `terrace-stair` terrace to the roof, so outdoors, with steps); `spiral` (ground to roof, outside the slab at the rear, no `steps`, only `treadPolygons`).
- **Fixtures** include a `vanity` (Bath 3), an `electronics-counter` (a media counter in the first-floor TV lounge), and wardrobes in the dressing rooms.

## Goals / Non-Goals

**Goals:**
- A 1 Kanal look that is clearly its own, modern and refined, defined only in its config, with each new element switched off by default.
- 5 Marla panoramas stay pixel-identical when rendered with CUDA (the probe showed CUDA output is reproducible across GPUs).
- A full set fast enough to review and redo within a day.

**Non-Goals:**
- Furniture, staging, loose decor, art or plants indoors. Fixed joinery (wardrobes, kitchen and vanity units, wall panelling) is in scope. The finished-and-unfurnished rule is unchanged.
- The roof, the outdoor spiral stair, and any exterior viewpoint other than the four terraces.
- Restyling the 5 Marla, or changing its walkthrough.
- AI restyling of panoramas, as in the 5 Marla change (it breaks seams and direction).

## Decisions

### D1. The 1 Kanal style: warm minimal
One named palette in `render/shots/1-kanal-interior.json`. It contrasts with the 5 Marla on every axis:

```
                    5 Marla (warm classic)           1 Kanal (warm minimal)
  walls             beige paint + panel mouldings    warm white mineral paint, faint limewash
                                                     movement, no mouldings
  skirting          dark raised board                shadow gap, flush, about 12 mm reveal
  doors             oak leaf, cased frame            flush full-height leaf to the ceiling,
                                                     no casing; oak in living areas,
                                                     wall colour in service rooms
  ceiling light     amber cove, round downlights     floating ceiling edge (shadow gap),
                                                     trimless linear slots, small trimless
                                                     downlights; neutral warm about 3000 K
  floors            beige porcelain 1.2 m, oak       honed stone-look porcelain 1.2 × 2.4 m,
                                                     pale and barely veined; wide-plank
                                                     natural oak (2.2 m × 0.24 m) in bedrooms
                                                     and study
  feature walls     slatted oak, brass inlays        vein-cut travertine (hall, drawing,
                                                     dining); tight-fluted smoked oak
                                                     (lounges); oak panel headboard wall with
                                                     a concealed light line (bedrooms)
  metal             brass                            dark bronze / satin black
  baths             beige tile to 2.2 m              floor-to-ceiling large slabs: warm grey
                                                     stone for most baths; dark veined stone
                                                     for the master bath and powder room;
                                                     floating vanity, wall-hung WC, frameless
                                                     glass, lit niche
  kitchen           tiled splashback                 handleless two-tone (greige lowers, oak
                                                     talls), stone counter with a waterfall
                                                     end, full-height slab splashback, light
                                                     line under the wall units
  stair / void      painted, brass rail              stone treads, painted soffit, frameless
                                                     glass balustrade with a slim bronze rail
  statement         —                                linear pendant hanging into the
                                                     double-height hall
```

Room types: `stair-hall` (travertine wall rising the full two storeys, pendant), `drawing` and `dining` (travertine feature, slots), `tv-lounge` and `family-lounge` (fluted smoked oak media wall), `master-bedroom` and `bedroom` (oak floor, headboard wall), `study` (oak floor, full oak-panelled wall), `dressing` (wardrobe joinery on every fixture side, oak floor, slot light), `bathroom` (light slabs), `powder-room` (dark slabs, backlit mirror panel), `kitchen` and `back-kitchen` (the raw kitchen gets the same family in plainer finishes), `corridor` (plain walls, slot light along the run), `other` covers two unlike rooms, so each gets a room override: the first-floor kitchenette uses the kitchen finish, and the ground-floor electrical room gets plain walls, a flush wall-colour door and a closed panel box. The `electronics-counter` in the first-floor lounge is finished as a low fluted-oak media console under the media wall, `terrace` (exterior finish, real sky).

All values are config. The maintainer approves the look from three key views before the full set is rendered (D7). Alternative considered: re-tint the 5 Marla palette. That was rejected because the difference the brief asks for comes from the elements themselves (mouldings vs none, coves vs slots, brass vs bronze, cased vs flush doors, tile vs slab), not from colour.

### D2. New elements are config switches, off by default
Each element in D1 that the builder lacks is a style option with an off default: `doors: "cased" | "flush-full-height"`, `skirting: "board" | "shadow-gap"`, `ceilingEdge: "cove" | "shadow-gap"` plus `lightSlots`, `metal` (material key), `featureKind` gains `travertine` and `fluted-tight`, `wc: "floor" | "wall-hung"`, `vanity: "standing" | "floating"`, `cabinetry: "handled" | "handleless"`, `balustrade: "rail" | "glass"`, `pendant` (per room override). The 5 Marla config leaves every switch at its default, so its build code path is untouched.
**Verification:** before and after the builder changes, render 5 Marla `drawing`, `kitchen` and `bath1` with CUDA on an L4 and diff them, expecting zero differing pixels. This works because the probe showed CUDA output is bit-identical across T4 and L4. New materials (travertine, honed stone, smoked oak) are procedural or come from CC0 Poly Haven or ambientCG textures added to `render/assets.lock.json`.

### D3. Double-height spaces and void edges
The builder reads `level.slab.voids` from the level above.
- **Ceiling.** Over a void, the room below gets no ceiling at that level. Its ceiling is the underside of the next slab that covers it (here the roof slab, at about 24.5 ft). The perimeter shadow gap and light slots follow the higher ceiling.
- **Walls.** Wall faces bordering the void on the upper storey are finished as part of the room below, so the travertine and paint run unbroken up two storeys. The slab edge around the void gets a finished fascia.
- **Edges.** Every void edge that has no wall gets the configured balustrade: frameless glass about 1.0 m high, with a slim top rail and a base shoe set into the floor finish.
- **Pendant.** A linear pendant hangs on a thin rod from the high ceiling to about 3.2 m above the hall floor. It is a light fitting, not decor.
The `stairwell` void is handled the same way, so its edge on the first floor also gets a balustrade.

### D4. Stairs
`stairs()` already rebuilds any indoor stair with `steps`, so the dog-leg main stair gets a sloping soffit. What changes for it:
- the balustrade follows D3 (glass and bronze when configured, the existing rail otherwise);
- treads use the configured stone.

The L-shaped `roof-stair` rises from the `terrace-stair` terrace and is seen from that terrace's viewpoint. It is finished as an exterior stair: the terrace's paving stone on its treads, a solid parapet-style side wall or a metal rail, and no exported mass left raw underneath. The `spiral` stands outside the slab at the rear and is not seen from any viewpoint, so it stays as exported. Both outdoor stairs are flagged `outdoor` in the interior config, so the indoor rebuild skips them on purpose and not because a field happens to be missing.

### D5. Viewpoints: every reachable room, 40 views
Every room that can be reached from inside the house gets a viewpoint. Large or two-part rooms get a second spot:

```
GROUND (18)                              FIRST (21)
  lobby        hall-entry, stair-foot      stair-hall   stair-head
  drawing      drawing, drawing-window     passage      passage   (beside the void)
  powder                                   passage-side passage-side (beside the void)
  dining                                   pier-link    link
  kitchen, kitchen-entry                   pier         pier      (inside the hollow stone pier)
  lounge       lounge, lounge-back         lobby        first-lobby
  lounge-lobby                             lounge       family, family-back
  raw                                      kitchenette
  bed1, bath1                              study
  bed2, dress2, bath2                      master       master, master-end
  electrical                               master-bath
                                           bed3, dress3, bath5 (Bath 3)
                                           bed4, bath3 (Bath 4)
                                           terrace-right, terrace-stair, terrace-side
```

**Left out, by the maintainer's decision on 2026-11-09:**
- `terrace-left`, the front terrace over the porch: it has no door.
- `washroom`: its only door opens to the outside side lane.

The walkthrough file lists both under `excluded` with a reason, and the validator accepts a missing viewpoint only for a room listed there.

**Links** go through a door, an opening, the stair, or an **open boundary**: a stretch of at least 2 ft where two rooms on one storey meet with no solid wall piece. The open-boundary links are lounge and lounge-lobby, kitchen and kitchen-entry, and dress2 and bath2 on the ground floor; lounge with kitchenette and lobby, passage and stair-hall, and passage-side with stair-hall and pier-link on the first floor. An open-boundary link names `"via": "open"`. The validator checks the two rooms really share an open stretch, and the marker sits at its middle (`linkPoint`). The stair joins `stair-foot` and `stair-head`. The void is not a link: `passage` and `passage-side` look down into the hall, but you reach the hall by the stair. Tiny rooms (`electrical` about 4 × 4 ft, `pier-link` about 3 × 3 ft) get their spot at the centre of the room and open facing the way out. Exact positions and facings are set while choosing views with EEVEE previews and perspective probes (`--perspective`), as was done for the 5 Marla.

**Design data changes** (maintainer decisions, 2026-11-09):
- The ground `lobby` outline becomes an L-shape that takes in the stair area up to the under-stair wall at x 46.4. The main stair stood in no room, and the electrical room's door opened into that unassigned space.
- The first-floor `lounge-window` onto the side terrace becomes a 14.1 ft sliding door, `lounge-terrace-door`.

The committed exterior stills and hero video are not re-rendered for the door.

### D6. GPU backend
`use_gpu()` tries `OPTIX`, then `CUDA`, `HIP` and `ONEAPI`. An environment variable, `NOOR_GPU_BACKEND=CUDA`, forces one backend, which the D2 regression check uses. The log line names the backend and device, as it does now. The OptiX denoiser is not used. OpenImageDenoise stays, because it was the T4 failure point and it keeps results the same across backends.

### D7. Render plan on Colab
- **GPU.** L4 with OptiX by default. Try `--gpu G4` first in each session and fall back to the L4 on a 503. TPUs can't run Cycles.
- **Style gate.** Render `hall-entry`, `drawing` and `master-bath` at `mid` (about 4 min each), get the maintainer's approval, then adjust the config.
- **Full set.** All 39 at `mid`, the maintainer's choice. Measured at 214 s per view on the L4 with OptiX (5 Marla drawing room), so about 2.5 h of rendering plus about 20 min of setup and downloads, about 5–6 CU. That is about 1.5 h if two sessions run in parallel. Run one blocking `colab exec` per viewpoint with the log written to a file on the VM, download each PNG immediately, and skip existing files (the resumable rule). A dropped connection ("Connection was lost") is retried once. If Colab allows two L4 sessions at once, the viewpoint list is split between them. That's an easy check at the start of the run.
- The double-height hall and the glass are the noisiest views. If `mid` smudges them after denoising, those views alone go to `high`.

### D8. Site registration and validation
The schema gains an optional `excluded: [{ level, room, reason }]`, and `via` may be `"open"` (D5). The validator:
- rejects an exclusion that names a missing room;
- requires a viewpoint for every room not excluded;
- rejects an `"open"` link unless the two rooms share an open stretch of at least 2 ft.

The open stretch is computed from the design's walls: the overlap of the two room outlines minus the solid wall pieces along it.

`walkthrough.ts` changes from a named `import fiveMarla from "./walkthroughs/5-marla.json"` to `import.meta.glob("./walkthroughs/*.json", { eager: true })`. This adds the 1 Kanal now and means later designs need only content, as the design-showcase requirement already says. Vitest supports `import.meta.glob`. A test asserts both walkthroughs are found. Alternative: add a second named import. That is one line now but code for every later design.

### D9. Lighting
The split-world setup is the same as on the 5 Marla. The light colour moves from amber (1.0, 0.72, 0.45) to neutral warm (about 1.0, 0.86, 0.72). Light slots are emissive strips with a matching area light, so they light the room and do not just glow. The hall pendant and the stairwell get their own lights. The terraces use the real sky and sun (the open question left on the 5 Marla is settled here for the 1 Kanal: outdoor spaces look outdoors).

## Risks / Trade-offs

- **"Modern and sophisticated" is a matter of taste** → The style gate (D7) shows three views before the long render. The palette is config, so changes re-render only the rooms affected.
- **A double-height space is new geometry for the builder** → Walls crossing a storey, the slab-edge fascia and the balustrade join are where faults will appear. Do a clay pass of `hall-entry` and `pier` first, and check for black pixels as on the 5 Marla.
- **New code paths could shift the 5 Marla** → D2's zero-pixel CUDA diff gates the merge.
- **Tiny rooms read badly in 360°** (electrical, link, washroom) → The user asked for every room, and the build enforces it. Each opens facing its door, and its description says what the space is. Its thumbnail in the no-JavaScript list is still a real render.
- **Large glossy slabs and glass smudge after denoising at `mid`** (on the 5 Marla this happened in the glossy baths and kitchen at 128 samples) → Use larger, softer lights (`spotRadius`), and re-render only the views that still show it at `high`.
- **Colab** → The G4 is often unavailable, the connection drops mid-run, and an idle VM is culled. Mitigations: L4 fallback, file logs, blocking exec per view, immediate download, resumable runs, and always `colab stop`.
- **Faults in the design data that only show at eye level** → As happened on the 5 Marla, expect a fitting or two to move in `1-kanal.ts`. That changes floor plans and exports for that design only, and is reported when it happens.
- **Payload** → 39 panoramas at about 0.5 MB load only after Start, and only neighbouring views are preloaded, so a visitor downloads what they walk through.
- **Project context is out of date** → `openspec/config.yaml` still says Cycles is CPU only. Rendering on Colab GPUs is how panoramas are made now, and the config text should be updated separately.

## Migration Plan

1. Builder features (D2–D4) and the GPU backend change (D6) land with the 5 Marla zero-diff check. No site change yet.
2. Write the 1 Kanal interior config and viewpoint file. Choose views with EEVEE and perspective probes. Clay-check the hall and the void.
3. Style gate: three `mid` panoramas on an L4, approved by the maintainer.
4. Render the full set at `mid`, make the contact sheet, review, and re-render what changes.
5. Encode to `public/walkthroughs/1-kanal/`, register via the glob, and deploy.
Rollback: delete `src/designs/walkthroughs/1-kanal.json` and the section disappears from the 1 Kanal page. The builder switches being off leaves every other render unchanged.

## Open Questions

- The exact stone and oak tones, decided at the style gate.
- Whether the `terrace-stair` view stands at the foot of the roof stair or at the terrace door. This changes one position, not the plan.
