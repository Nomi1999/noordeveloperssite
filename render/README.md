# Render pipeline

Builds photoreal scenes of the designs in Blender from `render/data/<slug>.json` (written by `npm run designs:export`) and renders stills and frame sequences headlessly. Nothing in a `.blend` file is a source of truth: the scene is rebuilt from the export and the committed config on every run.

Pinned to **Blender 5.0.1**. Only Blender's bundled Python 3.11 and its standard library are used (no pip).

## Commands

Run from the repository root. `BLENDER_PATH` overrides the default `C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`.

| Command | What it does |
|---|---|
| `npm run render:fetch` | Download every asset in `assets.lock.json` into `render/assets/` and check its sha256 (`-- --lock` fills in missing checksums after adding assets) |
| `npm run render:still -- --design 1-kanal --shot front-day` | Render one still into `render/out/<design>/stills/` |
| `npm run render:frames -- --design 1-kanal --shot front-day --frames 1-192 --build 0:6` | Render a frame range into `render/out/<design>/<name>/`, skipping frames that already exist |
| `npm run render:sequence -- --config 1-kanal-hero-landscape` | Render a keyed sequence (`render/shots/<config>.json`) into `render/out/<design>/<config>-<engine>-<quality>/`, skipping frames that already exist (`--frames a-b`, `--every n`, `--width`, `--engine`, `--quality`, `--name`) |
| `python render/camera_path.py [--svg out.svg]` | Camera continuity check for the hero sequences: per-frame displacement and rotation, and the values at each phase boundary (no Blender needed) |
| `npm run render:sheet -- render/out/1-kanal/<folder>` | Write `sheet.png` (a labelled contact sheet) for a folder of rendered frames or stills |
| `npm run render:encode -- stills` | Encode every shot's Cycles `final` still (`--engine`, `--quality`) into `src/assets/renders/<design>/<shot>.jpg` (JPEG q90 masters, at least 3200px wide). Not used for the site's stills, which all come from `enhance-renders.mjs encode` |
| `npm run render:encode -- share --design 1-kanal --shot front-day --focus 0.5,0.55` | Crop a 1200×630 share image from a delivered still into `public/og/<design>.jpg` |
| `npm run render:encode -- video <frames folder> --orientation landscape` | Encode a frame sequence into the hero video (AV1 and H.264 MP4, 24 fps) under `public/hero/video/` and update `public/hero/manifest.json` (needs `ffmpeg` on PATH) |
| `node scripts/enhance-renders.mjs sources --design <slug>[,<slug>]` | Render each shot in `render/shots/<slug>.json` for the model to work from (EEVEE preview at 2048px by default), skipping any already there |
| `node scripts/enhance-renders.mjs generate (--only <design>/<shot>,... \| --design <slug>,...)` | Make photoreal versions of those renders with an OpenRouter image model into `render/out/ai/`. Needs `OPENROUTER_API_KEY`, and the model in `--model` or `IMAGE_MODEL`, in `.env` or the environment |
| `node scripts/enhance-renders.mjs encode (--only ... \| --design ...)` | Write those into `src/assets/renders/<design>/<shot>.jpg` (2048×1152) and, for hero jobs, the poster `public/hero/poster/<orientation>-<tier>.{avif,webp}` |

**AI-enhanced images (2026-11-01).** The stills on the site are photoreal restyles of these renders, not the renders themselves. The hero video and its poster are restyles too (see Sequences). To re-encode the stills straight from a render, run `render:encode -- stills`, which overwrites them. Each restyle keeps the source's design and framing: the script scores each attempt against its source and keeps the best one, and every result is reviewed side by side with its source before delivery. Design changes asked for after the renders were made are applied in a separate edit pass, so the restyle itself stays faithful. These are `DESIGN_EDITS`, keyed by design or by `<design>/<shot>`; `HERO_EDIT` did the same for the terrace glass on the earlier house's hero posters. Since 2026-11-07 the 2 Kanal's terrace glass is real geometry, and the only edit left lowers the stone band in `2-kanal/street-open`, which the model kept drawing as a tall chimney in that view. Prefer fixing the design data or the shot's notes: an edit pass often fails. To redo just the edit, use `--edit-only`; it varies from run to run, so check each result. Re-cut the share images afterwards with `render:encode -- share`.

**1 Kanal redesign (2026-11-06).** The 1 Kanal stills are EEVEE sources restyled with `bytedance-seed/seedream-5-0-flash`. Its prompts come from `SHOT_NOTES`, one note per shot naming only what that render shows: a part named in a shot that cannot see it gets drawn anyway. Both reviews were approved by the maintainer: the sources beside the elevation renders, and the stills beside their sources. An attempt that fails the framing check is not offered for review, even though the script keeps the best one, so these used `--attempts 5`.

**2 Kanal exterior refresh (2026-11-07).** The 2 Kanal now has the 1 Kanal's finishes and boundary construction, its terrace glass on all three open sides and no columns in its openings (change `refine-2-kanal-exterior`). Its stills no longer start from Cycles finals: like every other design, they are EEVEE `preview` sources restyled with `bytedance-seed/seedream-5-0-flash` and `--attempts 5`, using `SHOT_NOTES["2-kanal"]` and a dusk override that allows its exterior lights. Its shots take the 1 Kanal's exposure, look and dusk values, because the defaults were set for white walls.
- `front-dusk` moved to a frontal camera, after the model redrew the angled view as a frontal one on all ten attempts. A blank neighbouring wall filled a third of that frame.
- A new `street-open` shot uses the street camera with `hideBoundary: ["front"]`, which now also leaves out that edge's gates. It is the fifth gallery image.
- The notes say that the shaded porch wall and the sunlit terrace wall are the same travertine, and that the stone tower is level with the bedroom box. Without them, the model darkened the walls and drew the tower too tall.

The maintainer approved the sources before any image call and the stills beside their sources before encoding. The runs cost about $0.86 in all.

**Fast path for new designs (2026-11-05).** A new design doesn't need Cycles: the model downscales its input to 2048px anyway, so an EEVEE preview gives the same geometry and framing for a fraction of the time, with no dedicated GPU.

```
node scripts/enhance-renders.mjs sources --design 5-marla,10-marla
node scripts/enhance-renders.mjs generate --design 5-marla,10-marla
node scripts/enhance-renders.mjs encode --design 5-marla,10-marla
npm run render:encode -- share --design 5-marla --shot front-day --focus 0.5,0.5
```

`generate` and `encode` refuse a bare run, so existing stills can't be replaced by accident. Review each still next to its source before `encode`. A framing score below 0.45 gets up to 3 tries, and the script then keeps the best and flags it to check by eye.

Results with `bytedance-seed/seedream-5-0-flash` ($0.018 an image, about 15 s a call):

| Shot | 5 Marla framing | 10 Marla framing | EEVEE at 2048px, 5 Marla / 10 Marla |
|---|---|---|---|
| `front-day` | 0.913 | 0.756 | 23 s / 20 s |
| `front-dusk` | 0.504 | 0.719 | 40 s / 36 s |
| `street` | 0.809 | 0.305 (flagged, accepted) | 22 s / 19 s |
| `aerial` | 0.588 | 0.091 (flagged, accepted) | 21 s / 20 s |

The 15 images generated for these 8 stills, including retries, cost $0.27. All 8 sources took under 5 minutes, including about 20 seconds of scene build per shot.

Options shared by `still` and `frames`:

| Option | Default | Meaning |
|---|---|---|
| `--design` | required | Design slug (`1-kanal`, `2-kanal`, `5-marla`, `10-marla`) |
| `--shot` | required | Shot name from `render/shots/<design>.json` |
| `--engine` | `eevee` | `eevee` or `cycles` |
| `--quality` | `preview` | `preview`, `high` or `final` |
| `--build` | `6` | Construction progress 0–6; `a:b` interpolates across a frame range |
| `--time-of-day` | the shot's | 0 = day, 1 = dusk; `a:b` interpolates across a frame range |
| `--width` | the preset's | Output width in pixels (16:9 unless the shot says otherwise) |
| `--clay` | off | Single grey material, for geometry checks (`--clay glass` keeps glazing) |
| `--name` | `<shot>-<engine>-<quality>` | Output folder name for `frames`, or file name for `still` |

Each image is a 16-bit PNG with a `.json` sidecar (design, shot, frame, build, time of day, engine, quality, seconds) that the contact sheet reads for its labels.

## Controls

The scene has two continuous controls; everything else follows from them.

- **`build`** (0–6): 0–1 the plan draws itself on the plot in accent linework, 1–2 excavation, footings and plinth, 2–3 columns rise and slabs form level by level, 3–4 brick walls rise course by course, 4–5 finishes sweep over the brick and the facade, glazing, gate and planting appear, 5–6 complete. Order inside each phase follows support: nothing starts before what carries it is finished. Rising, skinning and sweeping reveals are done in the shader from per-object attributes, so shadows always match what is visible.
- **`time_of_day`** (0–1): the sky blends from the day HDRI to the dusk HDRI, the sun lamp drops and warms, and from 0.6 the interior lights and soffit downlights fade in and the window backplates warm up from a dim daytime interior to lit rooms (only once the building is finished).

`construction.apply(build)` and `Rig.apply(time_of_day, build)` set both. A frame-change handler applies a keyframed `scene["build"]`, and `render:frames` interpolates `--build a:b` and `--time-of-day a:b` across the range.

## Sequences

A sequence config (`render/shots/1-kanal-hero-landscape.json`, `…-portrait.json`) keys everything per frame, so the whole choreography is data:

- **`camera`**: keys at chosen frames with `azimuth` (degrees, counterclockwise from +x; the street side is around −90), `distance` and `height` around the `orbit` point, plus `target`, `lens`, `verticals` (0 = free tilt, 1 = level camera with lens shift, blended in between), `shiftX`, `shiftY`. Each channel is a C2 cubic spline through its keys, at rest at both ends (`easeCamera`), so speed and acceleration change smoothly with no kinks at keys. Keying in cylindrical coordinates keeps the orbit circular between keys.
- **`build`** and **`timeOfDay`**: `[frame, value]` keys through a monotone cubic, which never overshoots and is flat wherever a value holds. A step that rises between two holds therefore eases in and out by itself.
- **`phaseFrames`**: frames per phase (32). Each frame's sidecar records its `phase`; the encoder takes the manifest's phase ranges from it, because a phase ends on a hold at its finished `build` value (63 holds at 2.0, foundation complete, no column started).
- `sensorFit` `AUTO` maps `sensor` to the longer side, so a portrait sequence keys its lens against the frame height.

The hero sequences: 192 frames, six 32-frame phases. In each, `build` holds for 3 frames, rises over frames 3–27 and holds again, so every label has a finished step to read. Phase 00 starts at `build` 0.28 so that the poster (frame 0) already shows the glowing plot outline. `timeOfDay` runs 0.95 → 0.9 (blue hour) over Design, eases to day by frame 48, holds to 127, then 0.55 (golden) at 159 and 1.0 (dusk) at 191; interior lights come on from 0.6, in the Move in phase only. The camera orbits about 59° from an elevated view over the side street to the approved front-dusk still's camera (landscape) or the same position with a wider lens (portrait). The boundary is hidden on the front, corner and right, as in that still. The configs use the still's dusk lighting, with an optional `light.dawn` (`exposure`, `tint`) that keeps the opening's blue hour until `build` 4 and blends out by `build` 5.

**Preview approval.** The 2026-11-06 test sheets and motion clips of both sequences were approved by the maintainer before the full render. The 2026-10-31 decisions below were made on the earlier house's frames.
**Hero frames (decided 2026-10-31).** After checking the site with these frames on a laptop and a phone, the maintainer chose to ship the approved EEVEE previews as the hero's final frames and skip the Cycles `high` renders (about 9 min a frame at 1920px, so roughly 2½ days for both orientations).

**Hero video (decided 2026-11-01).** The hero no longer scrubs frames with the scroll: after watching the previews as an MP4, the maintainer chose to play them as a video (8 s at 24 fps, once, starting as soon as the page opens and ending on the dusk poster; see `openspec/changes/video-hero`). The encoder writes one size per orientation, the frames' own, plus the first frame as a WebP still (`public/hero/first/`, about 25 KB, at most 960px on its long side) that the page paints until the video's own first frame arrives:

| Orientation | AV1 (SVT-AV1) | H.264 Main |
|---|---|---|
| landscape 1920×1080 | 2.65 MB (CRF 42) | 3.87 MB (CRF 28) |
| portrait 540×960 | 0.60 MB (CRF 34) | 1.41 MB (CRF 22) |

A visitor downloads one file: the first source in the manifest the browser can play (AV1, else H.264), for the viewport's orientation. These sizes are for the restyled videos below. The encoder's default CRFs are 34 and 22; the upscaled landscape needs `--crf-av1 42 --crf-h264 28`, because the defaults give 5.75 and 12.47 MB. To ship sharper video later, render `--engine cycles --quality high` and restyle or encode it again; the video then comes out at the new frame size.

**AI restyled hero (2026-11-07).** The delivered videos are not the renders. At the maintainer's request, the rendered clips were restyled with `black-forest-labs/flux-video-edit` for more realism ($0.24 a run, about 70 s). It has no seed and redraws freely: it tends to keep what the prompt names and invent what it does not. The maintainer approved the third landscape run and the first portrait run; the prompts are in the change's `flux-prompts.md`. Sources and results are in `render/out/1-kanal/hero-review/ai/`, and the frames encoded from them in `render/out/1-kanal/hero-flux-*/`, with sidecars copied from the render. FLUX returns 960×512 and 512×960, so both are scaled about 5% without stretching and centre-cropped to 960×540 and 540×960. Each poster is the video's own last frame: copy `0191.png` to `render/out/ai/hero/<orientation>.png` and run `enhance-renders.mjs encode --only hero/landscape,hero/portrait`. Do not run `generate` on the hero jobs: it would make a new poster from the render, with the earlier house's prompt.

**Upscaled landscape (2026-11-07).** The maintainer found the 960×540 landscape soft on a laptop and asked for the upscaled version on the hero. The approved run went through `black-forest-labs/flux-video-upscale` at 2× ($0.24, about 100 s), which returned 1920×1024; it was scaled and centre-cropped to 1920×1080 in `render/out/1-kanal/hero-flux-landscape-1080/` (the source is `render/out/1-kanal/hero-review/ai/landscape-v3-upscaled.mp4`). Against the 960×540 run, the mean change per frame is small and steady (median 1.77 of 255 levels, at most 2.69), with no added jumps between frames. To re-encode: `node scripts/encode-renders.mjs video render/out/1-kanal/hero-flux-landscape-1080 --orientation landscape --crf-av1 42 --crf-h264 28`, then copy `0191.png` to `render/out/ai/hero/landscape.png` and run `enhance-renders.mjs encode --only hero/landscape`. Landscape posters gain a 1080 tier, written by that script and listed in `POSTER_TIERS` in `BuildVideoHero.astro`. The portrait video was not upscaled and stays 540×960.

Close up, the upscale adds a few details of its own: door and slat edges read slightly like drapes, the bright panel has a mesh-like texture, and the marble veins are denser. These were reported to the maintainer when the upscale was delivered.

The maintainer accepted these differences from the render:

- **Both:** no visible brick, with flat orange walls appearing from Structure, and dark speckled stone on the ground floor from about frame 112. Finishes come early for the Walls label. Light turns warm by about frame 144, and facade lights come on before Move in. The dusk sky is pink-peach or orange, not mauve-grey. Windows show invented interiors, and shrubs have added uplights.
- **Landscape:** the slat wall's grey panel is a bright window, and the ground-floor right wall and main pier are speckled stone.
- **Portrait:** the terrace over the porch has a solid stone parapet instead of glass and a white slab edge, the porch's back wall looks like a wood garage door, and more walls are stone. It differs from landscape in these details.
- **Against the stills:** the hero no longer matches the 1 Kanal stills on the same page in these details.

On-device check (2026-10-31, of the earlier scroll-scrubbed frames): the maintainer scrolled the built site on their laptop and phone: smooth, five full scrubs without a reload, rotation keeps the frame, Call and WhatsApp open the dialer and WhatsApp (placeholder numbers until `src/config/site.ts` is filled in).

## Output

Every image is a 16-bit PNG written to a temporary name and renamed when complete, with a JSON sidecar. A frame range skips frames whose PNG already exists and deletes leftover temporary files, so an interrupted overnight run continues where it stopped when the same command is run again. A frame that comes back entirely black (EEVEE does this without an error when a GPU allocation fails) is rendered again up to twice and then stops Blender with exit code 3 instead of being saved. EEVEE's GPU memory fills up over a long run of dusk frames, and a fresh process renders the same frame fine, so `scripts/blender.mjs` restarts Blender up to five times for `frames` and `sequence`, continuing from the first missing frame. Cycles uses a fixed seed (`use_animated_seed` off), adaptive sampling, OpenImageDenoise with albedo and normal guides, the light tree, persistent data and an indirect clamp of 10.

## Layout

```
run.py                CLI entry: blender -b --factory-startup --python render/run.py -- <command> <options>
noor_render/          the scene builder (loader, geometry, facade, site, materials, vegetation, lighting, construction, shots, output)
shots/<slug>.json     camera, lens, sensor and look per shot
assets.lock.json      every external asset: source page, URL, license, sha256
fetch_assets.py       downloads the locked assets (stdlib only)
contact_sheet.mjs     contact sheets (Node + sharp)
assets/  out/         gitignored
```

## Engine decision

Decided with the maintainer on 2026-10-27 from the `1-kanal / front-dusk` comparison (EEVEE high against Cycles final, both 3200px, side by side and at 100%):

| | EEVEE high | Cycles final |
|---|---|---|
| Dusk still, 3200px | 24.6 min | 45.1 min |
| Daytime build frame, 1920px, `build` 3.5 (EEVEE high / Cycles high) | 7.0 min | 9.0 min |
| Noise, fireflies, denoiser blotches at 100% | none | none |
| Enclosed spaces (porch recess, rooms seen through openings) | lit flat blue by the sky: a light leak | correctly dark, with warm spill from lit windows |
| Thin glass | green-cyan tint at grazing angles | clear |

- **Stills: Cycles `final`** (3200px, 512 samples, adaptive threshold 0.01). `npm run render:encode -- stills` reads these by default.
- **Sequences: Cycles `high`** (1920px landscape, 1080×1920 portrait, 256 samples), since it costs only about a third more per frame than EEVEE high and EEVEE's leak shows in every part-built frame. Subject to the flicker check below. **Not used for the home hero:** see *Hero frames* under Sequences.
- **Iteration: EEVEE `preview`** (the CLI default), with small Cycles crops (`--crop`) to confirm.
- **Look**: AgX with the `AgX - Medium High Contrast` look. **Exposure** 0 by day and 0 at dusk (`exposureDay` / `exposureDusk` in a shot's `light` block override them); +0.6 at dusk washed the facade out.

**Flicker check (passed):** 8 consecutive Cycles high frames at 960px while the walls rise (`--frames 0-7 --build 3.4:3.75`, fixed seed, OpenImageDenoise). In regions the build does not touch (both neighbours, the sky), consecutive frames differ by 0.001–0.037 of 255 levels on average and at most 3 levels, which is invisible; frame times were steady at 2.1–2.6 min.

To reproduce the comparison: `npm run render:still -- --design 1-kanal --shot front-dusk --engine eevee --quality high` and the same with `--engine cycles --quality final`.

## Content review

**Approved by the maintainer on 2026-10-31**: the eight house Cycles `final` stills in `src/assets/renders/` (1-kanal and 2-kanal front-day, front-dusk, street, aerial). Checked against the content rules: no text or logos (gates, doors, parapets, neighbours), no people, no vehicles or number plates, no real places (neighbours are generated massing, skies are CC0 HDRIs, trees are CC0 models). Each still is 3200×1800 and passed the pixel-level review at 100% (no noise, fireflies, denoiser blotches, seams or blank frames; no banding in the encoded JPEGs).

The redrawn 1 Kanal has since replaced its four stills and added a side-street still; see "1 Kanal redesign" above. The 2 Kanal's four stills were replaced too, and it gained a fifth still, `street-open`; see "2 Kanal exterior refresh".

Known and accepted: lit neighbour windows at dusk are flat warm panels, and lit house windows at dusk are evenly bright backplates. Any re-render of a still needs a new review.

**Approved by the maintainer on 2026-11-05**: the eight AI stills of the 5 Marla and 10 Marla in `src/assets/renders/` (front-day, front-dusk, street, aerial), each 2048×1152 and reviewed next to its EEVEE source. No text, logos, people or vehicles. Two were accepted with framing scores under the 0.45 pass mark, after checking by eye: the 10 Marla `street` (0.305), where the camera is slightly straighter and shows more road, and the 10 Marla `aerial` (0.091), chosen over a 0.481 version with busier neighbours, where the camera is lower and the left boundary wall came out as stone. The model also drew small downlights in both porch ceilings at dusk, which were accepted.

## Blender 5.0 API notes

Checked against Blender 5.0.1 by introspection (`bpy` in background mode) before writing the pipeline. Differences from the design and from older examples:

- **Engine identifiers** are `BLENDER_EEVEE`, `CYCLES` and `BLENDER_WORKBENCH`. `BLENDER_EEVEE_NEXT` (4.2–4.4) no longer exists.
- **EEVEE** has no bloom, SSR or "soft shadows" toggles any more. Ray tracing is `scene.eevee.use_raytracing` with `ray_tracing_method` (`PROBE` or `SCREEN`) and `ray_tracing_options` (`resolution_scale`, `use_denoise`, `trace_max_roughness`, `screen_trace_quality`); fast GI is `use_fast_gi` with `fast_gi_method` `GLOBAL_ILLUMINATION`. Samples are `taa_render_samples`; shadows use `shadow_ray_count`, `shadow_step_count`, `shadow_resolution_scale`. Volumes are `volumetric_*`.
- **Material render method** is `material.surface_render_method` (`DITHERED` or `BLENDED`); `blend_method` remains only for compatibility. Shader-driven alpha reveals use `DITHERED`, which also gives correct transparent shadows (`use_transparent_shadow`).
- `Material.use_nodes` and `World.use_nodes` are deprecated (removal planned for 6.0). New materials and worlds already have a node tree, so the pipeline never sets them.
- **Color management**: `view_transform = 'AgX'`. Looks are prefixed: `'AgX - Base Contrast'`, `'AgX - Medium High Contrast'`, `'AgX - Punchy'`, and so on.
- **Cycles**: the denoiser enum offers only `OPENIMAGEDENOISE` on this machine (no GPU). Guide passes are `denoising_input_passes = 'RGB_ALBEDO_NORMAL'`. A fixed seed is `cycles.seed` with `use_animated_seed = False`. The light tree is `use_light_tree`; clamps are `sample_clamp_direct` / `sample_clamp_indirect`; `render.use_persistent_data` keeps BVH between frames.
- **EEVEE shadows on shared-memory GPUs**: a `shadow_pool_size` of 1024 MB makes EEVEE return black frames, silently, on this machine's integrated Radeon; 512 MB (the default) is enough once every interior light has a `cutoff_distance`. Without the cutoff, bright interior lights reach the whole scene and EEVEE stops with "Reached max shadow updates". Shader-evaluated (transparent) shadows re-render every sample, so they are switched on only while the building is part-built.
- **EEVEE room lights on narrow plots**: even with a `cutoff_distance`, dusk on a narrow plot can render black or hang, because the rooms overlap in view. A shot's `light.roomReach` caps each room light's reach in metres (both Marla dusk shots use 4.0). `scripts/blender.mjs` has no time limit, so run a new dusk shot under one: an EEVEE still takes under a minute at 2048px, and a run of several minutes is a hang.
- **Glass** is a thin pane (Transparent BSDF plus a black dielectric for the reflection, `BLENDED`) rather than Principled transmission: without ray tracing, EEVEE refraction shows the sky probe instead of the room behind, and dithering a 90% transparent surface leaves visible noise at preview samples.
- **Union clean-up**: merging coplanar faces after the boolean can leave concave "keyhole" ngons, which the bevel modifier renders as a dark hairline across a flat wall or a stray triangle beside an opening (clearest in Cycles). `union_islands` splits concave faces into convex ones, keeping the split only when it adds no non-manifold edges. Merging by distance is not used: it glues pieces that only touch and punches holes beside openings.
- **Fresh-edge accent** emission is multiplied by Light Path *Is Camera Ray*, so it is drawn but casts no light: in Cycles a thin rising soffit would otherwise light the walls around it orange.
- Cycles reports no GPU devices (HIP, CUDA, OptiX, oneAPI), so `cycles.device` stays `CPU`.
- **Shader attributes**: the Attribute node's `VIEW_LAYER` type reads custom properties from the view layer, scene or world, and `OBJECT` reads them from the object. The construction rig uses this instead of thousands of drivers: the material computes each reveal from `scene["build"]` and the object's `phase`, `t0`, `t1`, `z0`, `z1`, in both engines.
- **Geometry Nodes Mesh Boolean** has a `MANIFOLD` solver (fast for closed meshes). The pipeline uses it only to **union** pre-split wall boxes so the shared bevel doesn't cut grooves where pieces meet; no openings are cut with booleans.
- Command-line rendering: `blender -b --factory-startup --python-exit-code 1 --python render/run.py -- …`. Arguments after `--` reach the script. `--factory-startup` ignores user preferences, so renders don't depend on the machine's Blender setup; the bundled `cycles` and `io_scene_gltf2` add-ons are enabled in factory settings.

## Asset substitutions

- Poly Haven has no CC0 palm model. Design planting of kind `palm` uses `tree_small_02` (a slender single-trunk tree) instead.
- Hedges are generated (clipped box hedges with a leaf material) rather than models, as the design recommends.
