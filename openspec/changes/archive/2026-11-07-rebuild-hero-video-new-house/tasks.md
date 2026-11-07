## 1. Sequence settings

- [x] 1.1 Pass optional `hideBoundary` and `context` from a sequence config through `Sequence.shot()` in `render/noor_render/shots.py`, and verify a config naming neither returns the same values as before
- [x] 1.2 Update `render/shots/1-kanal-hero-landscape.json` with the new camera keys, hidden sides `front`, `corner` and `right`, `frontRoad: 22` and the dusk still's lighting, and verify `seq.shot(191)` matches the front-dusk camera within 1 cm
- [x] 1.3 Update `render/shots/1-kanal-hero-portrait.json` the same way, ending at the same position with a wider lens, and verify the end position matches within 1 cm
- [x] 1.4 Run `python render/camera_path.py` and verify there is no jump in displacement or rotation at any phase boundary
- [x] 1.5 Run `npm test` and verify it passes

## 2. Test render and first review

- [x] 2.1 Save checksums of every still, share image and `public/hero/` file as the before state, in the scratchpad, and verify the list includes all four designs
- [x] 2.2 Move `render/out/1-kanal/1-kanal-hero-*-eevee-preview`, `render/out/1-kanal/hero-review/` and `render/out/ai/hero/*` to `render/out/1-kanal/old-house-hero/`, and verify the file counts match and the original folders are gone
- [x] 2.3 Render every 8th frame of both orientations to test folders with `--every 8 --name`, under `timeout`, and verify 24 frames exist per orientation and report the seconds per frame
- [x] 2.4 Build contact sheets and check them against the spec: phases, opening blueprint, day balance, kerb on the hidden sides, left and rear walls, no camera clipping, whole house in portrait, slat sharpness
- [x] 2.5 Compare the landscape test frame 191 beside the approved front-dusk source render, and verify the framing and lights match
- [x] 2.6 Tune keys and re-render in fresh test folders until the checks in 2.4 and 2.5 pass, then show the sheets and the expected full render time to the maintainer and get approval before rendering in full

## 3. Full render and videos

- [x] 3.1 Render all 192 landscape frames in 32-frame batches, each under `timeout`, and verify 192 PNGs and sidecars exist with no blank frames
- [x] 3.2 Render all 192 portrait frames the same way, and verify 192 PNGs and sidecars exist with no blank frames
- [x] 3.3 Encode review copies of both videos to the git-ignored `render/out/1-kanal/hero-review/` with `encode-renders.mjs video --out` (the option resolves inside the repo, so it cannot reach the scratchpad), leaving `public/hero/` untouched, and verify each plays for 8 s at 24 fps
- [x] 3.4 Check both videos for flicker and shimmer, then show them to the maintainer before generating any poster. The maintainer then asked to restyle them with a video model (section 4)

## 4. AI restyle and end frames

The poster tasks first planned here (image model, framing check) were replaced at the maintainer's request.

- [x] 4.1 Restyle the rendered landscape video with `black-forest-labs/flux-video-edit`, compare runs with the render, and get the maintainer's approval (third run)
- [x] 4.2 Restyle the rendered portrait video the same way, describing the approved landscape's look, and get the maintainer's approval
- [x] 4.3 Report the differences from the render to the maintainer, and record the accepted ones in `render/README.md`
- [x] 4.4 Scale and centre-crop both to 192 frames at 960×540 and 540×960, without stretching, and verify the frame count
- [x] 4.5 Use each video's own last frame as its poster, as the maintainer asked, with no image model
- [x] 4.6 Upscale the approved landscape run 2× with `black-forest-labs/flux-video-upscale`, scale and centre-crop it to 192 frames at 1920×1080, and compare it with the 960×540 run for changes per frame and sharpness

## 5. Deliver to the site

- [x] 5.1 Encode both orientations into `public/hero/` with `encode-renders.mjs video`, and verify the video files, first-frame images and `manifest.json` are updated, the phase ranges are unchanged and each first-frame image is under 30 KB
- [x] 5.2 Encode the last frames as posters with `enhance-renders.mjs encode --only hero/landscape,hero/portrait`, and verify all tiers and formats under `public/hero/poster/` are replaced
- [x] 5.3 Compare checksums with 2.1, and verify every still and share image is byte-identical and only `public/hero/` files changed
- [x] 5.4 Run the site in a browser at laptop and phone sizes, and verify the video plays, phase overlays follow it, overlay text stays readable, the cross-fade shows no jump, and reduced-motion mode shows the new poster
- [x] 5.5 Re-read `src/components/hero/hero-copy.ts` against the new video, and report what no longer fits: "Brick by brick" plays over walls with no visible brick. Reported to the maintainer; copy left unchanged
- [x] 5.6 Replace the landscape video on the site with the upscale at AV1 CRF 42 and H.264 CRF 28, add the 1080 poster tier, cap the first-frame image at 960px, correct the manifest's codec levels, and verify 192 frames, levels 4.0, a first frame under 30 KB, byte-identical stills, `npm test`, the build and `scripts/check-hero.mjs`

## 6. Docs and finish

- [x] 6.1 Remove the temporary mismatch notes from `render/README.md`, `src/designs/README.md` and `PRODUCT.md`, and verify a search for the mismatch wording finds nothing outside `openspec/`
- [x] 6.2 Update `render/README.md` for the new camera, lighting, video sizes, restyle and approval record, and correct the stale 1 Kanal terrace line in `PRODUCT.md`, and verify no hero description there still refers to the earlier house
- [x] 6.3 Run `npm test` and the site build, and verify both pass
- [x] 6.4 Search the changed files for the real project, client and reference firm names, and verify there are none
