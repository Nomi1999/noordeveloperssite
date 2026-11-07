## 1. Shared helpers and gate height

- [x] 1.1 Move the generic finish helpers from `1-kanal.ts` into `helpers.ts`, parameterised by plinth and plot edges, add test coverage in `finishes.test.ts`, and verify `npm run designs:export` leaves `render/data/1-kanal.json` byte-identical
- [x] 1.2 Add an optional `height` to `Gate` and use it in the export, and verify with tests for a declared height and the default, and with `git diff --stat render/data` showing no other design changing

## 2. The 2 Kanal design

- [x] 2.1 Set wall, parapet, tank and stair-room materials, and verify no exterior wall or parapet remains `plaster-white` with a test in `program.test.ts`
- [x] 2.2 Add the house finishes, overhang, porch beam and columns, and verify the design validates and the rooms and openings are unchanged
- [x] 2.3 Replace `terrace-rail` with the full three-sided path in smoked glass, and verify with a test that it runs along all three open edges and both ends reach a wall
- [x] 2.7 Make every column 9" × 9" and omit those standing in an opening (D1, A3, A5, B6, C4), and verify with a test that no exported column overlaps an exterior window or door
- [x] 2.8 Add `posts: false` to the gate model, export and `site.py`, and verify in a preview that the stone posts are gone, with the other designs' exports unchanged
- [x] 2.4 Build the boundary with its white base, panels, granite piers, 7 ft black car gate and timber pedestrian gate, and verify with a test on the gate heights and finish materials
- [x] 2.5 Move `tree-2` and add shrubs behind the lattice, and verify the lawn area and the program tests are unchanged
- [x] 2.6 Run `npm run designs:export`, and verify `npm test` passes and only `render/data/2-kanal.json` changes under `render/data`

## 3. Render configuration

- [x] 3.1 Add the lighting values to `render/shots/2-kanal.json`, keeping every camera, and verify with `front-day` and `front-dusk` EEVEE previews under `timeout`
- [x] 3.2 Tune panel divisions, lights and planting from previews and clay checks, and verify the terrace shows glass on all three open sides from `aerial`
- [x] 3.3 Take `2-kanal` out of `CYCLES_FINAL` and `DESIGN_EDITS`, add its per-shot notes and dusk override, and verify a dry run of the script's job list reads EEVEE sources with no edit pass

## 4. Stills

- [x] 4.1 Render all four sources with `enhance-renders.mjs sources --design 2-kanal` under a time limit, and verify none is blank
- [x] 4.2 **Review stop:** share a contact sheet of the sources, correct from feedback, and wait for the maintainer's approval before any image call
- [x] 4.3 Generate with `--design 2-kanal --force --model bytedance-seed/seedream-5-0-flash --attempts 5`, and verify each framing score, or check flagged shots by eye
- [x] 4.4 **Review stop:** share each still beside its source, including the three-sided terrace glass, and wait for the maintainer's approval
- [x] 4.5 Encode the stills and recut the share image, and verify `git status` shows only the 2 Kanal's images changing

## 5. Site and docs

- [x] 5.1 Update the 2 Kanal alt text in `src/designs/renders.ts` and any other description of a white house, and verify with a search for "white" in 2 Kanal copy
- [x] 5.2 Update `render/README.md`, `src/designs/README.md` and the "2 Kanal starts from Cycles finals" line in `openspec/config.yaml`, and verify the commands and approvals they record match what was done

## 6. Verification

- [x] 6.1 Run `npm test` and `npm run build`, and verify both pass
- [x] 6.2 Verify in the built site: the stills on `/designs/2-kanal/`, `/designs/`, What We Build and the home page's dusk band, and floor plans that differ only by columns, piers and railing
- [x] 6.3 View all four lead stills side by side, and verify the 5 and 10 Marla stay clearly different from the 2 Kanal
