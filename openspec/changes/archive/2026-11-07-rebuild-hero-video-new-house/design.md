## Context

See `proposal.md` for why. The hero is data-driven: `render/shots/1-kanal-hero-{landscape,portrait}.json` key the camera (cylindrical around `orbit`), `build` (0–6) and `timeOfDay`, and the scene comes from the current design export. So the new house appears as soon as frames are rendered again, and the work is in how they are framed, lit and reviewed.

Constraints found in the code:

- `Sequence.shot()` in `render/noor_render/shots.py` returns the camera, `light` and `timeOfDay` only. `Scene` reads `hideBoundary` and shot-level `context` from the shot it is given, so a sequence cannot set either today. Design-level context (`sideStreet`, street trees) already reaches sequences.
- The approved front-dusk still widens the front road with `frontRoad: 22`. At the default 9 m width, the road ends at about y = −11, so the camera at y = −17 would stand among the plots across the street. The road override is needed as well as the hidden sides.
- The renderer skips any frame whose PNG exists, so the old frames would silently stay in a new video.
- `exposure` is interpolated between `exposureDay` and `exposureDusk` on the time-of-day mix, but `look` is one value for the whole sequence.
- The hero poster jobs in `scripts/enhance-renders.mjs` use `NOTES.dusk` ("no other exterior lights") and `HERO_EDIT` (terrace glass for the earlier house). Both are wrong for the new one, which has facade lighting and already draws its glass.
- The video cross-fades to the poster over 600 ms, so the poster has to line up with frame 191.

## Goals / Non-Goals

**Goals:**

- The last landscape frame is the approved front-dusk view, with the same camera and lighting.
- Both videos read as before: one continuous move, six clear phases, dusk to day to dusk.
- A wrong camera or lighting choice is caught on a contact sheet, not after a five-hour render.

**Non-Goals:**

- Page code, hero copy or player behaviour.
- Cycles or a higher quality preset.
- A brick core for the hidden boundary sides.
- Any change to stills, share images or other designs.

## Decisions

### Pass two optional config keys through `Sequence.shot()`

`shot()` adds `hideBoundary` and `context` from the sequence config. `Scene` already handles both for stills, and it builds once from `seq.shot(0)`, so nothing else changes. A sequence that names neither behaves as before.

Alternative: a sequence-only code path in `Scene`. Rejected, because it would duplicate logic that already works.

### Key the landscape end to the still's exact camera

The approved camera in orbit terms is azimuth −73.981°, distance 32.252 m, height 2.0 m, with target `[8.15, 6.6, 4.8]`, lens 39 and verticals 1. `shiftX` and `shiftY` end at 0. A check compares `seq.shot(191)` with the still's numbers, within 1 cm.

Landscape keys after the first test frames, to be tuned further on the test sheet:

| Frame | Azimuth | Distance | Height | Landscape lens | Verticals |
|---|---|---|---|---|---|
| 0 | −15 | 23 | 22 | 27 | 0 |
| 40 | −28 | 23.5 | 17 | 28 | 0 |
| 88 | −44 | 26.5 | 11.5 | 31 | 0.15 |
| 136 | −60 | 29.5 | 6.5 | 35 | 0.55 |
| 191 | −73.981 | 32.252 | 2.0 | 39 | 1 |

### Open from the side-street side

The orbit starts over the side street at about −15° and moves round to the front, about 59° in all. The first test frames started from the old −134° and showed why it no longer works on this plot: a neighbour's roof covered part of the plot, the corner was cut off, and the view ran across the side street to empty ground. From the side street, the five-sided plot is fully in view with the neighbouring houses behind it, and the middle phases show the side elevation as well as the front.

Alternative: keep −134° and reframe. Rejected, because no framing from that side has a backdrop.

### Portrait ends from the same spot with a wider lens

A portrait frame at lens 39 sees only about 12 m of facade width, too little for the house. The portrait path ends at the same position with a lens around 26, and with its target and vertical shift chosen so the whole house fits and the top stays calm for text. Its earlier keys start from the current portrait config, with distance ramped the same way. The exact lens is set on the test sheet.

Alternative: move the portrait camera further back. Rejected because far-side neighbours would then come into shot, and that view would no longer match the approved one.

### Use the dusk still's lighting, with one look for the sequence

Both configs take `exposureDusk: 1.5`, `backplateGlow: 0.3` and `duskTint: [1.0, 0.97, 0.95]` from the still, and keep the default `AgX - Medium High Contrast` look that the still uses. The end view has to match, so it decides the look. Day frames are then balanced with `exposureDay`, set on the test sheet. They do not need to match the day stills, because they only appear part-built and in motion.

These settings also affect the blue-hour opening, because `duskTint` and exposure follow time of day. The first test frame confirmed it: the blueprint washed out on a pale pink ground. So `light` gets an optional `dawn` (`exposure` and `tint`) that holds until `build` 4 and blends into the dusk settings by `build` 5. Twilight only falls early in the build and at its end, so the build value tells the two apart. This is a small addition to `lighting.py`. With no `dawn`, as in every still, nothing changes.

Alternative: lowering the opening's `timeOfDay` keys, as first planned. Rejected, because that moves the opening toward daylight rather than blue hour, which the spec requires.

Alternative: animating `look` during the sequence. Rejected, because a change of look shows as a jump in contrast and the renderer does not support it.

### Build order follows support for the new house's parts

The test sheet showed two breaches of the existing rule that nothing appears before what carries it. The first-floor slab over the car porch floated from Structure to Finishing, because its granite columns are facade items. The rear spiral stair stood as a glowing helix over the bare slab, because each tread rises by itself and they all ran together.

The porch columns now rise with the ground-floor columns. The spiral stair is fitted in Finishing, tread by tread from the bottom, as a steel stair would be. Both are build-order changes in `construction.py` and `geometry.py`. Stills render at full build, so they do not change.

### Hide front, corner and right; leave left and rear

These match the still's `hideBoundary`, so both the sequence and the still read the same way. The left and rear walls remain, drawn as panels above a 1.1 ft base. Those panels appear in the Finishing phase rather than as brick in Walls. They are far from the camera and behind the house for most of the move, so this is left as is unless it reads as wrong on the test sheet.

### Test renders go to separate folders

The test sheet uses `--every 8 --name <test folder>`, so changing the camera between rounds never leaves stale frames for the full render to skip. The full render goes to the standard folder that the encoder and poster jobs read.

### Move old frames aside instead of deleting them

`render/out/1-kanal/1-kanal-hero-*-eevee-preview`, `hero-review/` and `render/out/ai/hero/*` move to `render/out/1-kanal/old-house-hero/`. They take about 880 MB, stay outside git, and remain available for rollback. Removing them is left to the maintainer.

### Render the full sequence in batches under `timeout`

Each orientation runs in batches of 32 frames, one per phase, each under a two-hour `timeout`. The slowest earlier frame took 171 s, so 32 of those would take 91 minutes. A hung render then costs one batch at most, and a re-run resumes from the frames that exist.

### Hero posters get their own prompt notes

The hero jobs stop using `NOTES.dusk` and `HERO_EDIT`. Each gets a note assembled from the approved `NOTE_OVERRIDES["1-kanal"].dusk` and the `KANAL` fragments in `SHOT_NOTES["1-kanal"]["front-dusk"]`, naming only what its frame shows. The `HERO_EDIT` constant is removed. The portrait note may need its own fragments if its wider view shows different parts.

The script's generic path is otherwise unchanged. A dump of every still's prompt before and after the change confirms they are byte-identical.

Alternative: reuse the approved front-dusk still as the landscape poster. Rejected, because the script always reads its source render, and a separate path for one image would cost more to maintain than the $0.02 it saves.

### Poster source stays at frame size at first

The poster jobs read `0191.png` at 960×540 and 540×960, as they do today. If slats or fittings come back invented because the source is too small, frame 191 is rendered larger as the poster source, using the same camera. That one frame costs little and needs no change to the videos.

### Ship an AI restyle of the renders, with the last frame as the poster

After reviewing the rendered videos, the maintainer asked for more realism from a video model. `black-forest-labs/flux-video-edit` was tried on the rendered clips, because it edits existing footage cheaply. It has no seed and redraws freely: it tends to keep what the prompt names and invent what it does not, so each run differs. The maintainer approved the third landscape run and the first portrait run. Those prompts are in `flux-prompts.md`.

This overrides the earlier goal that the last frame matches the approved still. The rendered sequences stay the source of truth for the camera, build order and design, and the restyle may differ where the maintainer has accepted it. The accepted differences are listed in `render/README.md`.

FLUX returns 960×512 and 512×960. The page crops video and poster to fit the screen, so different proportions would jump at the fade on some screens. Both are scaled by about 5% without stretching and centre-cropped to the usual sizes, so no page code changes.

Each poster is the video's own last frame, as the maintainer asked. It lines up exactly and costs nothing, and it replaces the planned image-model posters and `HERO_EDIT` removal. The hero jobs in `scripts/enhance-renders.mjs` are now used only by `encode`: running `generate` on them would make a poster from the render with the old prompt.

Alternative: another FLUX run to correct the remaining differences. Rejected by cost and by evidence: each run fixed some parts and changed others.

### Upscale the landscape video to 1080p

The maintainer found the delivered 960×540 landscape soft on a laptop. The approved run went through `black-forest-labs/flux-video-upscale` at 2×, which returned 1920×1024, and it was scaled and centre-cropped to 1920×1080 like the earlier restyles. The portrait video stays 540×960, because the complaint was about laptop and desktop screens.

At the encoder's default CRFs the upscale came to 5.75 MB AV1 and 12.47 MB H.264, so stronger settings were compared. AV1 CRF 42 and H.264 CRF 28 give 2.65 and 3.87 MB and keep the gain. AV1 CRF 50 looks close at 1.31 MB, but H.264 CRF 33 visibly smears the brick. There is still no hard size limit in the specs, so the maintainer can trade quality for size later.

Encoding 1080p needed three small changes. Landscape posters gain a 1080 tier, so the fade stays sharp. The first-frame image is capped at 960px on its long side, which keeps it about 25 KB instead of 84 KB, since it shows only for a moment. The manifest's codec strings now state the level the frame size needs, and H.264 uses four reference frames to stay at level 4.0 instead of 5.0.

## Risks / Trade-offs

- **Slats shimmer or look soft at 960×540** → Check on the test sheet and in the video. If they do, raise the resolution for both orientations before the full render, as already agreed with the maintainer.
- **The new house renders slower than the old one** → Measure seconds per frame on the test sheet and tell the maintainer the expected duration before starting the full render.
- **The camera passes through or behind a street tree or neighbour** → Inspect every-8th-frame sheets and run `render/camera_path.py` for continuity.
- **The opening blueprint or part-built frames look wrong without the wall** → Review the sheets phase by phase. Kerb and facade rise are data-driven roles, so fixes stay in the construction roles or the keys.
- **The final view's lower-left is busier than before, behind the overlay text** → Check in the browser in both orientations. The overlay already sits on a scrim, and the end view is fixed by the approved still, so only the scrim could change.
- **The AI poster adds parts or moves things, causing a jump in the cross-fade** → Use the framing score with `--attempts 5`, compare by eye beside the frame, and watch the fade in the browser. Failing attempts are never offered.
- **Video files grow with the more detailed house** → Report the sizes against today's (0.57 and 1.18 MB landscape, 0.45 and 1.12 MB portrait). There is no hard limit in the specs, so the maintainer decides if they grow much.
- **Wording reused from the stills names parts not in the portrait frame** → Build the note from what the frame shows, and review it before any image call.

## Migration Plan

1. All assets keep their current paths, so a deploy only swaps files.
2. Nothing under `public/hero/` changes until the videos are approved.
3. To roll back, restore `public/hero/` from git. The old frames stay on disk if they are needed again.
