## 1. Design data foundations

- [x] 1.1 Add `brick-cladding` and `plaster-charcoal` to `MATERIALS` in `src/designs/model.ts` and to `render/noor_render/materials.py` (existing `red_brick` and `painted_plaster_wall` textures, no lockfile change). Verify with a model test, and with an EEVEE render showing both materials.
- [x] 1.2 Add the compact room minimums for plots under 2,250 sq ft to `src/designs/validate.ts`. Verify with tests: an 11′×12′ bedroom gives no warning on a 5 Marla plot and a warning on a 10 Marla plot.

## 2. The two designs

- [x] 2.1 Write `src/designs/5-marla.ts` (25′×45′, both sides on the plot line, plan and program per the spec and design.md), with the structure and rooms first and a placeholder facade. Add it to `sources.ts`. Verify with `npm test`: no errors or warnings, and a new program test covering plot, storeys ≤ 2, three bedrooms with attached baths, required rooms and one-car porch.
- [x] 2.2 Write `src/designs/10-marla.ts` (35′×65′, left side on the plot line, right side passage behind the porch), the same way. Verify with `npm test`: no errors or warnings, and a new program test covering plot, storeys ≤ 2, four bedrooms with attached baths, required rooms, two-car porch and lawn or planted strip.
- [x] 2.3 Update the order and slug check in `program.test.ts` to 1 Kanal, 2 Kanal, 5 Marla, 10 Marla, and run `npm run designs:export`. Verify that `npm test` passes, apart from `renders.test.ts`, which stays red until the registry entries in 6.1, and that `render/data/1-kanal.json` and `2-kanal.json` are unchanged in git.
- [x] 2.4 Check every level of both houses at readable size and at the 390px phone scale: labels readable and not colliding, dimension strings clear. `/plans-preview/` cannot build until 6.1, so check plans rendered directly from the data, and look at `/plans-preview/` again in 6.3. Fix any crowding found in the data or `plan.ts`, and verify the existing plans still pass `plan.test.ts`.
- [x] 2.5 **Maintainer checkpoint:** share screenshots (`npm run designs:review` needs the site to build, so it is not available until 6.1) and get the maintainer's approval before any facade or render work. Record the outcome in the approval table in `src/designs/README.md`.

## 3. Render pipeline

- [x] 3.1 Capture the 1 Kanal and 2 Kanal neighbour positions and sizes as a baseline, by logging them from a scene build before any change to `site.py`. Verify that both baselines are saved.
- [x] 3.2 Change `_neighbours` in `render/noor_render/site.py` as in design.md: setback cap, plot and row coverage, and `context.attached`. Verify by rebuilding and diffing against the 3.1 baselines (no difference).
- [x] 3.3 Write `render/shots/5-marla.json` and `10-marla.json` with the four shots, `context.attached` and street trees, tuned with clay or EEVEE renders. Verify from contact sheets (`npm run render:sheet`) that the framing is good, party walls show no gap, no neighbour overflows its plot, and neighbours fill the frame.
- [x] 3.4 Rework `scripts/enhance-renders.mjs` per design.md: model selection, `sources --design`, explicit `--only` or `--design` on `generate` and `encode`, sources from `render/out/`, and jobs built from the shot files. Verify each failure case without spending credits: no model, no shots named, missing source. Also verify that `--only 1-kanal/front-day` resolves to the Cycles PNG, not the delivered JPEG.
- [x] 3.5 Update the prompts: per-design material and attachment notes, well-kept neighbours, an aerial note that doesn't assume a lawn. Verify with one test image for one new shot, compared by eye.

## 4. Facades

- [x] 4.1 Build the 5 Marla facade in its data: brick cladding, plaster surround, metal jaali over the balcony, timber porch ceiling. Verify with EEVEE day and dusk renders that the jaali reads clearly at 2048px and that plans and `npm test` still pass.
- [x] 4.2 Build the 10 Marla facade in its data: charcoal plaster box, large corner window in a tall frame, timber slats on the stair tower, steel pergola on the terrace. Verify with EEVEE day and dusk renders and `npm test`.
- [x] 4.3 Run one AI test on each facade's `front-day` shot. If the jaali, slats or brick warp, adjust the data or prompt and repeat. Verify that the distinct-facades scenario holds with these two next to the existing `front-day` stills.

## 5. Stills

- [x] 5.1 Run `sources` for both designs and generate all 8 stills with `IMAGE_MODEL`. Verify that each is 2048×1152 with a framing score of at least 0.45, or has been retried and flagged, and report the total cost.
- [x] 5.2 Review each still side by side with its source at full size: design, framing and time of day match; no text, logos, people or vehicles; neighbours subdued; no invented elements on the house. Regenerate or fix any failures, using the Cycles `high` fallback for a shot if EEVEE's light leak carries through.
- [x] 5.3 **Maintainer checkpoint:** show the 8 stills with their sources and get approval before encoding. Record it under Content review in `render/README.md`.
- [x] 5.4 Encode the stills to `src/assets/renders/` and cut share images to `public/og/5-marla.jpg` and `10-marla.jpg`. Verify the sizes, and that `git status` shows no change to any existing 1 Kanal, 2 Kanal or hero image.

## 6. Site

- [x] 6.1 Add both designs to `src/designs/renders.ts`, with alt text and captions written from the delivered images, so they describe what each still actually shows. Verify with `renders.test.ts` and `npm run build`.
- [x] 6.2 Add both entries to `src/content/building-types.ts` and update the `/designs/` meta description. Copy must pass the voice rules. Verify that `npm run build` passes the content audit and that every number in the copy matches the computed facts.
- [x] 6.3 Check the built site at laptop and phone widths: `/designs/` shows two rows of two, the home page shows four cards, What We Build shows four entries, and both detail pages show plans, level switcher, gallery, facts and the concept label. Look over the new plans at `/plans-preview/`. Verify WhatsApp messages name the right design, with `npm test` for the URL check and by inspecting the links.

## 7. Docs and wrap-up

- [x] 7.1 Update `render/README.md` (fast path, commands, `IMAGE_MODEL`, the test results, `render:encode -- stills` being for Cycles finals only), `src/designs/README.md` (new files) and the plot sizes and rendering notes in `openspec/config.yaml`. Verify that the documented commands match the script's usage message.
- [x] 7.2 Run `npm test`, `npm run build` and `openspec validate add-marla-house-designs --strict`, and confirm with `git status` that no existing still, share image or hero file has changed.
