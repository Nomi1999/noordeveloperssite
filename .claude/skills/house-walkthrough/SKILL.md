---
name: house-walkthrough
description: Build the 360° interior walkthrough for a Noor Developers house design (next up, the 2 Kanal), the way the 5 Marla, 1 Kanal and 10 Marla tours were built. It covers planning the OpenSpec change, the interior style config, viewpoints and walking spots, Colab GPU rendering, depth images, encoding for the site, and review. Use it whenever someone asks to create, extend, re-render or fix a house walkthrough or its panoramas.
---

# House walkthrough

A walkthrough is a tour of a finished, unfurnished house. It is made of 360° Cycles panoramas, one for each "spot", rendered in Blender from the design data and shown on the design's page (`/designs/<slug>/`) by a 3D viewer that glides between spots. Three tours already exist: `5-marla`, `1-kanal` and `10-marla`. **Copy what they did. Do not invent new machinery.** Almost everything you need already exists, and the job is mostly writing config and data, rendering, and reviewing.

Read these reference files when you reach the step that needs them:

| File | Read it when |
|---|---|
| `references/2-kanal.md` | Before anything else, if the design is the 2 Kanal: its rooms, doors, known gaps and the questions to ask |
| `references/files.md` | Before writing `render/shots/<slug>-interior.json` or `src/designs/walkthroughs/<slug>.json` |
| `references/colab.md` | Before the first render, and whenever a render misbehaves |

The best worked example is the archived 10 Marla change: `openspec/changes/archive/2026-11-14-add-10-marla-walkthrough/` (`design.md` and `tasks.md`, including its notes). The 1 Kanal change next to it (`2026-11-10-add-1-kanal-walkthrough/`) is the example for a double-height void. Read both `tasks.md` files before you plan, because the notes record every problem hit and how it was fixed.

## Hard rules (breaking any of these has cost hours or money before)

1. **Never run Blender on this laptop.** It has no GPU. Every render goes to Google Colab through `scripts/colab/panoramas.mjs`, including small tests, EEVEE probes and 1280 px checks. Do not run `npm run render:panorama`, `render:panoramas`, `render:still` or `blender` locally.
2. **Never leave a Colab session running.** Sessions bill compute units by the hour. When a run ends, fails or is stopped, check `colab sessions` (see `references/colab.md`) and stop anything left over.
3. **Long renders run detached.** Use `scripts/start-render.ps1` and check on them with `scripts/status-render.ps1`. Never wait on a multi-hour command in the foreground. If the log has not moved for 8 minutes, the run has stalled: stop it and start it again. Finished views are skipped, so restarting is always safe.
4. **The maintainer (the user) decides taste and scope.** Stop and ask before: choosing the interior style, leaving a room out of the tour, changing a design's plan (`src/designs/<slug>.ts`), the full render (it costs compute units and hours), and committing. Give one recommendation with your reasons. Do not ask open-ended questions.
5. **Do not change the other houses.** A builder change must leave the 5 Marla, 1 Kanal and 10 Marla renders unchanged. New behaviour is a switch that is off by default, or it only triggers on something only the new design has (for example the `bathtub` fixture). Never edit another design's walkthrough JSON, interior config or `public/walkthroughs/<other>/`.
6. **Finished and unfurnished.** No furniture, rugs, art, plants indoors, appliances other than fixed kitchen and bath fittings, people, text, logos or brands. Fixed joinery (wardrobes, kitchen units, vanities, panelling) is fine.
7. **Content rules** apply to every `description` and `label`: English only, no prices, no availability, no superlatives or claims, no real places or projects. `npm run build` runs the content audit (`src/content/content-rules.json`) and fails on a banned phrase.
8. **Data is generated, so do not hand-edit it.** `render/data/<slug>.json` is written by `npm run designs:export` from `src/designs/<slug>.ts`. If the plan must change, change the `.ts` file (with the maintainer's OK), re-export, and commit both.
9. **Verify, then report honestly.** A step is done when its check passes, not when the command returns. If a check fails or a step is skipped, say so.
10. **Commit only when the maintainer asks.** Match the existing commit style (`git log --oneline`): one plain sentence saying what changed and why.

## Units and directions (getting these wrong is the most common mistake)

- Plans are in **feet**. The origin is the plot's front-left corner seen from the street. **x** runs along the street and **y** goes into the plot, away from the street.
- `facing` is a **world angle in degrees, counter-clockwise from +x**: 0 looks along +x (right when facing the house from the street), 90 looks along +y (into the house, away from the street), 180 along −x, 270 back toward the street.
- A panorama's centre looks along `facing`, which is the direction the view opens on. Pick the angle that shows the room's main feature first.
- `rise` (feet) lifts a spot above its level's floor. Use it only for spots standing on a stair landing.
- The 3D viewer and the site compute marker positions, door directions and map dots from the plan. You never author those.

## The pipeline at a glance

```
src/designs/<slug>.ts ──npm run designs:export──▶ render/data/<slug>.json ─┐
render/shots/<slug>-interior.json (look: palette, room types, lights) ─────┤
src/designs/walkthroughs/<slug>.json (spots: where, facing, links) ────────┤
                                                                           ▼
      node scripts/colab/panoramas.mjs  (Blender 5.0.1 + Cycles on a Colab GPU)
                                                                           ▼
  render/out/<slug>/panoramas/<id>-cycles-mid.png   +   render/out/<slug>/depth/<id>-depth.png
                                                                           ▼
       npm run walkthroughs:encode -- --design <slug> --quality high,mid
                                                                           ▼
  public/walkthroughs/<slug>/<id>.jpg, <id>-thumb.jpg, <id>-depth.png  ──▶  /designs/<slug>/
```

`src/designs/walkthrough.ts` finds every file in `src/designs/walkthroughs/*.json` by glob, so no site code changes are needed for a new tour. It validates the tour on every `npm test` and `npm run build`: every room has a spot unless it is `excluded` with a reason, links join real doors, and spots are inside their rooms.

## Phases

Work through these in order. Each phase ends with a check. Do not start the next phase until the check passes and, where it says so, the maintainer has answered.

### Phase 0: Understand and ask (no code yet)

1. Read `references/2-kanal.md` (or, for another design, gather the same facts from `render/data/<slug>.json` using the snippets in `references/files.md`).
2. Read the 10 Marla and 1 Kanal `design.md` and `tasks.md` files in `openspec/changes/archive/`.
3. Ask the maintainer every question in the "Decisions to ask" list in one message, with your recommendation for each. Do not continue until they answer. Write their answers into the change's `design.md` with the date.

**Check:** you have written answers on style direction, excluded rooms, outdoor spots and anything else on the list.

### Phase 1: The OpenSpec change

Create the change `add-<slug>-walkthrough` with the `openspec-propose` skill (in `.opencode/skills/` or `.claude/skills/`), modelled closely on the 10 Marla one:
- `proposal.md`: why, and what changes.
- `design.md`: context (what exists), the style table (as in 10 Marla D1), the per-room treatment, the builder gaps and how each is closed, the viewpoint plan, the render plan and the risks.
- `specs/interior-walkthrough/spec.md`: a delta that adds a "Rooms covered" paragraph and scenarios for this house, copying the form of the existing ones in `openspec/specs/interior-walkthrough/spec.md`.
- `specs/render-pipeline/spec.md`: deltas for any new builder feature (for example the bathtub).
- `tasks.md`: numbered tasks with a "Verify ..." sentence each, in the same order as the phases below.

**Check:** `openspec validate add-<slug>-walkthrough` passes (or `openspec status` shows it ready). Show the maintainer the style table and the room list before any rendering.

### Phase 2: Builder gaps, with a regression baseline

Find what the builder (`render/noor_render/interior.py`, with `style.py`, `materials.py` and `wallpaper.py`) does not support yet for this design: fixture types, room types, voids and stairs. `references/2-kanal.md` lists the 2 Kanal's gaps. For each:

1. **Baseline first, before any builder edit.** Render the regression views from `HEAD` on an L4 with CUDA: 5 Marla `drawing`, 1 Kanal `drawing` and `master-bath`, and 10 Marla `drawing` (commands in `references/colab.md`, "Regression gate"). Use the same GPU type for the baseline and the "after" renders: a G4 and an L4 sample differently.
2. Add the feature so that it only runs when the new design asks for it (an off-by-default style key in `style.py`, or a fixture or room type only this design uses). Keep the code in the same style as the surrounding code: boxes built with `fbox` and `box(...)` into the `parts` lists, materials from the palette.
3. Add or extend a plain-Python test in `render/tests/` when the logic can be tested without Blender (see `test_style.py`). Run `npm run test:render`.
4. Probe it on Colab: an EEVEE `--perspective` probe, then a Cycles preview check of a spot that sees it.
5. **Regression gate:** re-render the baseline views from the working tree with the same GPU and `--backend CUDA`, and diff them with `python scripts/diff-renders.py <before> <after> --tolerance 1`. Pass: every pixel within 1 level. About 1,100 pixels differing by one level is normal noise.

**Check:** `npm run test:render` passes, probes show the new element, and the regression diffs pass.

### Phase 3: Interior config (the look)

Write `render/shots/<slug>-interior.json`. Start by copying the existing config whose structure is closest (the 1 Kanal for a house with a double-height void), then replace the palette, room types and per-room overrides with the agreed style. `references/files.md` documents every key.

- Give **every room type used in the design** a `roomTypes` entry. The builder prints `interior: room <id> (<type>) has no roomTypes entry and falls back to default` for any you missed. Search the Colab render logs for that line.
- Keep the style's values in this file only. Rooms differ in which material leads, not by inventing new code.
- Dark finishes make noisy renders. Keep very dark walls to two or three rooms, and give dark rooms larger, softer lights (`spotRadius`) or a small per-view `exposure` lift.

**Check:** an EEVEE probe of three or four key rooms builds with no `falls back to default` line and no Python error.

### Phase 4: Viewpoints and walking spots

1. **Hero spots by hand** in `src/designs/walkthroughs/<slug>.json`. Each one has `id`, `room` (or `null` outdoors), `level`, `at`, `facing`, `description` and `links`, with `label` for a second spot in a room or a space with no room. Add:
   - `gate`, outdoors at the car gate, as `start`, plus `porch` if there is a car porch. Both get `"outdoors": true` in the interior config's `viewpoints` block. The 10 Marla shows how.
   - one spot per room at a spot showing its main feature, and a second (`<room>-back`, `<room>-window`) for large or L-shaped rooms;
   - `stair-foot`, `stair-landing` / `stair-turn` (with `rise`) and `stair-head` for each indoor stair;
   - `excluded` entries, each with the maintainer's reason;
   - `"walking": true` (the 1 Kanal and 10 Marla style: the visitor can walk to any spot in sight).
   Links: `{ "to": "<id>", "via": "<door or opening id>" }` through a door, `"via": "stair"` (the stair's id) between stair spots on different levels or rises, `"via": "open"` where two rooms meet with no wall, and no `via` between two spots in the same room. Every link must be reciprocal.
   Do not give a hero spot an id ending in `-door`, or starting with `w-` or `d-`. The generator deletes those, and it also drops any hero spot within 1.6 ft of a doorway it generates.
2. **Generate the dense spots:** first run `python scripts/gen-walk-spots.py --design <slug> --dry` and tell the maintainer the count and the render estimate (`references/colab.md`). Once they agree, run it without `--dry`. It adds `w-<room>-<n>` room spots and `d-<opening>` doorway spots, keeps your hero spots, and replaces its own spots on each run.
3. **Check the spots:** `python .claude/skills/house-walkthrough/scripts/check_spots.py --design <slug>`. Fix every ERROR. The generator does not know about floor voids or stair treads, so it **will** put spots over the double-height void and on the stair. Delete those spots or move them. Then rerun the checker. Treat each WARN on its merits.
4. Run `npm test`. The validator must pass.

**Check:** the checker shows 0 errors, `npm test` passes, and the hero spots read well on a plan. Optionally run `npm run dev` and open `/plans-preview/` to check positions against the drawn plan.

### Phase 5: Check renders (cheap) and the style gate

1. Render the **hero spots** as Cycles previews at 1280 px (`references/colab.md`, "Check renders"), then build the overview sheet: `npm run render:overview -- --design <slug> --quality preview`. It writes `render/out/<slug>/panoramas/overview-cycles.png`.
2. Look for: black or near-black patches (often doubled wall pieces, fixed by `"mergeWallPieces": true`), raw grey concrete (an unfinished surface), z-fighting stripes, light leaks, a spot inside a wall or fixture, a view facing a blank wall, glass that reads as solid, and furniture or text (there must be none). Fix the config or the data, delete the affected PNGs, and re-render only those.
3. **Style gate:** render 3 key views at `mid` (a living room, the darkest bath, the kitchen). Show the maintainer, and tell them where the files are. Iterate on the config until they approve. Record the approval and the date in `tasks.md`.

**Check:** the maintainer has approved the look in writing.

### Phase 6: Full render

1. Ask before starting. Give the spot count, the expected hours and the compute units, and say how many parallel sessions you plan to run.
2. Render every spot at `mid`, split across 2 (at most 3) parallel sessions (`references/colab.md`, "Full set").
3. Render every spot's **depth image** (`--depth`). The walking viewer needs one for every spot, and the encoder refuses to run without them.
4. Babysit: run `status-render.ps1` every 10 to 15 minutes. Restart stalled sessions and rerun failed views. When everything is done, confirm with `colab sessions` that no session is left running.
5. Rebuild the overview at `mid` (`npm run render:overview -- --design <slug> --quality mid`) and check every view at full size for noise or smudges after denoising. Re-render only those views at `high` (the encoder prefers `high` over `mid` per view).

**Check:** `status-render.ps1` shows every panorama and every depth image on disk, and no Colab session is active.

### Phase 7: Encode and check the site

1. `npm run walkthroughs:encode -- --design <slug> --quality high,mid`. Always pass `--quality high,mid`. Without it, a leftover `preview` check render can be published silently for a view missing its `mid`.
2. Add the new slug to the vitest case in `src/designs/walkthrough.test.ts` that lists every walkthrough (`expect(...).toEqual(["1-kanal", "10-marla", "5-marla"])`), keeping it in sorted order.
3. `npm test`, then `npm run build` (which also runs the content audit). Both must pass.
4. `npm run dev` and open `http://localhost:4321/designs/<slug>/` (check the port Astro prints). The tour section follows the floor plans, no panorama loads before Start, walking works through doors and up the stair, the map and storey switch work, there are no console errors, and a 360 px wide phone view has no horizontal scroll.
5. `git status` and `git diff --stat`: nothing changed for the other houses (their walkthrough JSON, interior configs, `public/walkthroughs/<other>/`), and nothing under `render/data/` except an agreed fix to this design.

**Check:** all of the above pass. Then hand it to the maintainer for review on the local site.

### Phase 8: Review rounds, then close

The maintainer will ask for fixes, often geometry seen at eye level, such as a column in a window or a fixture in the wrong place. For each round: fix, delete only the affected PNGs and depth images, re-render those in a fresh session (not a kept one, see `references/colab.md`), re-encode, and record what changed in the `tasks.md` notes. When the maintainer approves: tick the tasks, then archive the change with the `openspec-archive-change` skill (it syncs the specs), and commit when asked.

## When something goes wrong

- **The site build says a room has no viewpoint:** add a spot, or (only with the maintainer's OK) an `excluded` entry with a reason.
- **A link "does not join its rooms":** the `via` door is not between those two rooms. Check the door table in `references/2-kanal.md` or the export.
- **A panorama is black, or has big black areas:** doubled wall faces (`mergeWallPieces`), a spot inside geometry, or a missing light. Check with `check_spots.py`, then run a `--clay` probe.
- **A raw grey block appears in view:** an exported mass the builder did not finish, often under a stair or landing or an unhandled fixture. See how the 1 Kanal notes fixed the stairwell fascia and the washroom ceiling (`ceilingHeight`).
- **A re-render shows the old image:** you reused a kept session. See `references/colab.md`.
- **Anything about Colab** (503, hangs, dropped connections, failed downloads): see `references/colab.md`.
- **You are unsure whether a change touches the other houses:** run the regression gate.
