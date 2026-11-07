## 1. Shared helper

- [x] 1.1 Add an optional panel material to the boundary helper in `helpers.ts`, defaulting to grey stone tile, and verify with a test for the default and a chosen material, and with `npm run designs:export` leaving `render/data/1-kanal.json` and `render/data/2-kanal.json` byte-identical

## 2. The 5 Marla design

- [x] 2.1 Spike: build one boundary panel on the 5 Marla's front edge with the helper, and verify it stands inside the plot and the design checker passes
- [x] 2.2 Remove the brick (`brickFront`, `parapet-front`) and set wall, parapet and stair-room materials, and verify with a test in `program.test.ts` that no exterior wall or parapet is `brick-cladding` or `plaster-white`
- [x] 2.3 Add the street-bay beige tile with joints and the charcoal reveal lines, the sand plaster and the timber slats on the balcony cheeks, and verify the design validates and the rooms and openings are unchanged
- [x] 2.4 Finish the porch pier in sand plaster, add the charcoal roof cap, wall lights and soffit downlights, and verify the black jaali is unchanged
- [x] 2.5 Build the boundary as a solid beige tile wall on a sand base with a charcoal cap, grey stone piers, a black car gate with timber doors and a wicket, and wall lights, with the gates running pier to pier, and verify with a test on the finish materials and that nothing stands outside the plot
- [x] 2.6 Add the planter edge to the front strip, and verify the paving outline and the program tests are unchanged
- [x] 2.7 Run `npm run designs:export`, and verify `npm test` passes and only `render/data/5-marla.json` changes under `render/data`

## 3. Render configuration

- [x] 3.1 Add the lighting values to `render/shots/5-marla.json`, keeping every camera, and verify with `front-day` and `front-dusk` EEVEE previews under `timeout`
- [x] 3.2 Tune panel divisions, lights and planting from previews, and verify the tile joints, the timber and the stone read in `front-day` and `street`
- [x] 3.3 Add the `5-marla` per-shot notes and dusk override to `enhance-renders.mjs`, and verify a dry run of the script's job list reads EEVEE sources with no edit pass

## 4. Stills

- [x] 4.1 Render all four sources with `enhance-renders.mjs sources --design 5-marla` under a time limit, and verify none is blank
- [x] 4.2 **Review stop:** share a contact sheet of the sources, correct from feedback, and wait for the maintainer's approval before any image call
- [x] 4.3 Generate with `--design 5-marla --force --model bytedance-seed/seedream-5-0-flash --attempts 5`, and verify each framing score, or check flagged shots by eye
- [x] 4.4 **Review stop:** share each still beside its source, and wait for the maintainer's approval
- [x] 4.5 Encode the stills and recut the share image, and verify `git status` shows only the 5 Marla's images changing

## 5. Site and docs

- [x] 5.1 Rewrite the 5 Marla alt text in `src/designs/renders.ts` (it names the brick and white plaster), and verify with a search for "brick" and "white" in 5 Marla copy
- [x] 5.2 Update `render/README.md` and `src/designs/README.md` to record the approvals and commands used, and verify they match what was done

## 6. Verification

- [x] 6.1 Run `npm test` and `npm run build`, and verify both pass
- [x] 6.2 Verify in the built site: the stills on `/designs/5-marla/`, `/designs/`, What We Build and the home page's dusk band
- [x] 6.3 View all four lead stills side by side, and verify the 5 Marla is clearly different from the 10 Marla and the two Kanal houses
