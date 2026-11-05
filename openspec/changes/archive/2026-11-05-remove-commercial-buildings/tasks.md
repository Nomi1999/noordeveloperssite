## 1. Remove the plaza design

- [x] 1.1 In one step, remove `commercial` from `src/designs/sources.ts`, its entry from `src/designs/renders.ts`, and its entry from `src/content/building-types.ts`, adding the 1 Kanal and 2 Kanal entries there (each with its `front-day` still and a link to its design page); verify the module imports resolve with `npx astro check` or the next build
- [x] 1.2 Delete `src/designs/commercial.ts`, `src/content/designs/commercial.md`, `src/assets/renders/commercial/`, `public/og/commercial.jpg`, `render/data/commercial.json` and `render/shots/commercial.json`; verify `git ls-files` lists no path matching `commercial` or `plaza`
- [x] 1.3 Check for ignored or untracked plaza output (for example under `render/`), and report anything found without deleting it unseen; verify with a directory search for `commercial`
- [x] 1.4 Remove the commercial plaza tests and update the slug list in `src/designs/program.test.ts`; verify `npm test` passes

## 2. Rework the copy

- [x] 2.1 Update the What We Build section heading and intro in `WhatWeBuild.astro` to "Houses of every size", keeping "mainly 1 Kanal and 2 Kanal"; verify on the built home page
- [x] 2.2 Update titles, descriptions and leads on Home, What We Build, Designs, About and Contact, including the wording table in `design.md`; verify a search of `src/pages` finds no `commercial` and no "House and Building"
- [x] 2.3 Update `src/content/about.ts` and `src/content/offerings.ts` per the wording table; verify no "commercial", "live or work" or "building ready to use" remains in `src/content`
- [x] 2.4 Remove the `isHouse` branch from `src/pages/designs/[slug].astro`, so the concept note always says "the way your family lives"; verify both built design pages show that sentence
- [x] 2.5 Replace "Commercial" in `src/pages/styleguide.astro` with another sample of the display type; verify a search of the file finds no `commercial`

## 3. Fix the layouts

- [x] 3.1 Make the Designs index two columns from `40rem` up by removing the `64rem` rule, and update the card `sizes` attribute to match; verify at a wide viewport that the two cards fill the page width with no empty column
- [x] 3.2 Confirm the home cards and What We Build rows render correctly with the new entries, including the What We Build anchors; verify in the built site at phone and desktop widths

## 4. Remove plaza references from code and tools

- [x] 4.1 Remove the plaza entries from `scripts/enhance-renders.mjs` and the slug from the `render/run.py` help text; verify a search of both files finds no `commercial`
- [x] 4.2 Remove the `commercial` branch from `render/noor_render/site.py`, keeping the house path's random calls in the same order; verify with `python -m py_compile` and by comparing the diff against the old house path
- [x] 4.3 Remove the plaza example from comments in `src/designs/model.ts` and from `src/designs/README.md`; verify a search of `src/designs` finds no `commercial` or `plaza`

## 5. Enforce and document

- [x] 5.1 Add a commercial-work category with the phrases `commercial` and `plaza` to `src/content/content-rules.json`; verify the audit rejects a scratch copy of a page containing "commercial buildings" and passes on the real build
- [x] 5.2 Update `openspec/config.yaml`, `PRODUCT.md`, `README.md` and `render/README.md` where they mention commercial buildings or the plaza; verify a search of those files finds no `commercial` or `plaza`
- [x] 5.3 Record the new `about.ts` hash in `src/content/APPROVALS.md` as awaiting maintainer review, and set the About copy status to match; verify the logged hash equals the first 12 hex digits of the file's SHA-256 with LF line endings

## 6. Verify the whole site

- [x] 6.1 Run `npm test` and `npm run build`; verify both pass, including the content audit
- [x] 6.2 Search `dist/` for `commercial` and `plaza`; verify no HTML, sitemap, plan SVG or share image matches, and that `dist/designs/commercial/` does not exist
- [x] 6.3 Run the site locally, open every route on the updated route map at phone and desktop widths, and confirm `/designs/commercial/` shows the 404 page
- [x] 6.4 Run `openspec validate remove-commercial-buildings --strict`; verify it passes
- [x] 6.5 Maintainer reviews the new About copy and the built site before deployment
