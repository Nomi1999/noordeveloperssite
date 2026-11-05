## Why

Noor Developers should no longer be presented as a builder of commercial buildings. Today the claim appears in headings, intros and meta descriptions on most pages, and the commercial plaza is a full concept design with its own page, renders, floor plans and share image, so rewording alone would leave it public.

## What Changes

- **BREAKING** Remove the commercial plaza design: its data, description, renders, share image, render export and shot list. `/designs/commercial/` stops being built and leaves the sitemap, so the old address returns the site's 404 page.
- Reword every page that states or implies commercial work: Home, What We Build, Designs, About and Contact, including titles and meta descriptions. This covers implied phrases such as "the way you live or work", "a building ready to use" and "the home or building you have in mind".
- Present what Noor builds as houses, shown as two entries, 1 Kanal and 2 Kanal, on the home page and What We Build. "Houses of every size, mainly 1 Kanal and 2 Kanal" stays in the copy.
- Lay out the Designs index for two designs, so no empty column is left on wide screens.
- Remove the commercial wording from the hidden style guide and the branches that only the plaza used.
- Add `commercial` and `plaza` to the content audit, so the build fails if either word returns to a built page.
- Update the project context, product brief and READMEs to match, and record the new About copy in the approvals log.
- Unchanged: the design model stays open to future building types (`kind` as free text, the `shop` and `office` room types, the shop and office facts). Visitors never see these, and archived changes stay as history.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `building-designs`: the required concept designs are the 1 Kanal and 2 Kanal houses; the commercial plaza requirement and commercial wording go.
- `design-showcase`: the index and detail page requirements stop referring to commercial designs.
- `home-page`: the What We Build section shows houses through 1 Kanal and 2 Kanal entries.
- `services-page`: What We Build describes houses only, while new building types can still be added as entries.
- `company-pages`: About describes Noor as a builder of houses.
- `render-assets`: the commercial plaza shots are no longer required.
- `site-shell`: the `/designs/commercial` route is removed.
- `content-standards`: the banned content audit also covers claims of commercial work.

## Impact

- **Pages and copy**: `src/pages/` (home, what-we-build, designs, about, contact, styleguide), `src/content/` (`building-types.ts`, `about.ts`, `offerings.ts`), `src/components/sections/WhatWeBuild.astro`.
- **Design data**: `src/designs/commercial.ts`, `src/designs/sources.ts`, `src/designs/renders.ts`, `src/content/designs/commercial.md`, `src/assets/renders/commercial/`, `public/og/commercial.jpg`, `render/data/commercial.json`, `render/shots/commercial.json`.
- **Tests and tools**: `src/designs/program.test.ts`, `src/content/content-rules.json`, `scripts/enhance-renders.mjs`, `render/run.py`, `render/noor_render/site.py`.
- **Docs**: `openspec/config.yaml`, `PRODUCT.md`, `README.md`, `render/README.md`, `src/designs/README.md`, `src/content/APPROVALS.md`.
- **Visitors**: anyone holding the old plaza link reaches the 404 page. No other URL changes.
- **No new renders**: the new entries reuse existing 1 Kanal and 2 Kanal stills.
