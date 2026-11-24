## 1. Builder and data

- [x] 1.1 Move the counter and stairwell plan arithmetic into `render/noor_render/fitout.py` (no Blender), and make the classic wall units stop either side of an opening behind them. Verify that `npm run test:render` passes, including a test that no 5 Marla or 10 Marla classic counter has an opening behind its wall units (the 1 Kanal's handleless units already stopped at windows).
- [x] 1.2 Add the opt-in `hood` room key (a gap in the wall units over the hob, a dark-metal canopy with a light strip and a flue to the ceiling or its dropped edge). Verify with a test that only the 2 Kanal kitchen sets it and that the island's units split either side of the hob.
- [x] 1.3 Add the opt-in `solidStairs` key (steps inside the footprint stand on the floor, the slot between the flights is filled, the stair light is lifted clear) and `openFlightFoot` (the stairwell balustrade stays open at the foot of a flight to the floor above). Verify with tests that only the 2 Kanal sets them, that the roof flight's foot is found on the stairwell's back edge, and that the fillers sit between the flights.
- [x] 1.4 Make a notched double-height void open the ceiling below (`Room.ceiling_holes`). Verify with a test that the 2 Kanal `lounge-void` is the only notched void in any export.
- [x] 1.5 2 Kanal config: kitchen `uppers` `k-counter-side` and `k-island` with `hood`, back-kitchen `uppers` `bk-counter`, `solidStairs: ["ground/stair"]`, `openFlightFoot: true`. Move `bath4-door` to offset 1 on `y66` (x 57-59.5) in `src/designs/2-kanal.ts` and re-export. Verify that `git diff --stat render/data/` shows only `2-kanal.json`.
- [x] 1.6 Tour: the front `hall` links to the lounge and kitchen only; `hall-stair` takes the lounge (`open`), `stair-foot`, `hall-mid`, `bed1` and `bed2`; `hall-mid` takes `hall-back`, `store` and `laundry`; `w-hall-1` (inside the base) is removed; `d-bath4-door` is placed at the new door [58.25, 65.5] in place of `w-bed4-3`. Verify that `check_spots.py` reports 0 errors and `npm test` passes.

## 2. Renders

- [x] 2.1 EEVEE perspective probes on Colab: kitchen (window clear, hood, units), back kitchen, front hall facing the stair, stair head, lounge looking up, family lounge looking into the void. Then Cycles previews of the same spots. Verify each fault is gone and nothing new is wrong (no black slot, no raw structure).
- [x] 2.2 Regression gate: re-render the 5 Marla `drawing`, 1 Kanal `drawing` and `master-bath`, and 10 Marla `drawing` on an L4 with CUDA, and diff them against `render/out/<design>/baseline-2k/` with `--tolerance 1`. Verify that every pixel is within 1 level.
- [x] 2.3 Delete and re-render, at `mid` with depth, every spot in foyer, dining, lounge, hall, kitchen, back-kitchen, landing, family, bed4 and bath4, in fresh sessions. Verify that every PNG and depth image is on disk and `colab sessions` shows none active.
- [x] 2.4 Check the re-rendered views at full size, and the rooms that see these spaces through open doors. Re-render any that changed.

## 3. Site and close

- [x] 3.1 Encode with `--quality high,mid`, run `npm test` and `npm run build`, and walk the route on the local site. Verify the checks in the plan pass.
- [x] 3.2 After the maintainer approves, archive the change and commit when asked.

## Notes

- 2026-11-23, 2.1: previews at 1280 px (`-fix`) showed all seven faults gone, with no black slot under the stair and no raw structure.
- 2026-11-23, 2.2: regression gate on an L4 with CUDA against `baseline-2k`: 5 Marla `drawing` 1,166 px, 1 Kanal `drawing` 1,133 and `master-bath` 884, 10 Marla `drawing` 1,186, all within 1 level. Pass.
- 2026-11-23/24, 2.3: re-rendered 137 spots at `mid`. That was the rooms listed above, plus the bedrooms and the drawing room, because their open doors look onto the gallery, the void or the hall, which all changed. Then depth for the same spots, on L4s (G4s refused) across two colour sessions and one depth session. Colab dropped connections often (one 35-minute stretch with nothing saved), and the chains retried. Three views failed twice and were rerun in a fill-in chain. All 171 panoramas and 171 depth images are on disk, and `colab sessions` shows none active. The old images are kept in `render/out/2-kanal/old-2026-11-23/`. Cost: about 30 compute units (115.25 to 85.41).
- 2026-11-24, 2.4: checked the published `w-family-2`, `kitchen`, `back-kitchen`, `stair-head`, `bed4` and `lounge-up` at full width: each fix is in place.
- 2026-11-24, 3.1: the site check found that the walking tour still offered the front hall a walk to `stair-foot` and the Bedroom 2 door, straight through the closed base. `canSee` knows walls and floor holes, not stairs. I added an opt-in `solidStairs` (`level/stair`) to the walkthrough schema: a sight line between two floor spots across a listed stair's footprint is stopped. Only the 2 Kanal sets `ground/stair`. Its links lost hall to stair-foot and Bedroom 2 (and the doorway spots beside them). The 5 Marla, 1 Kanal and 10 Marla links compared identical before and after. With tests added, `npm test` passes (207), as do `npm run build` and the content audit. On the local site, the route lounge, hall-stair, stair-foot, up the stair, stair-head, family lounge, Bedroom 4, Bath 4 works, with no console errors and no horizontal scroll.
