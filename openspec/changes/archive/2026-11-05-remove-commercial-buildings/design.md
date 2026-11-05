## Context

See `proposal.md` for the motivation. The plaza is the third entry in the design registry, so most of the site picks it up by iterating over the registry. Three places tie it to the build:

- `src/designs/renders.ts` validates the registry on import, and a test requires its keys to match the design slugs exactly.
- `RenderFigure` calls `getDesign()` on the design named by each render, and `building-types.ts` names the plaza directly.
- `src/designs/program.test.ts` hard-codes the list of slugs.

## Goals / Non-Goals

**Goals:**
- No built page states or implies commercial work, and the build enforces it.
- The home page and Designs index still look deliberate with two houses.

**Non-Goals:**
- New renders, new designs or new page sections.
- A redirect from the old plaza address.
- Rewriting archived changes, `docs/roadmap.md` or `.impeccable` critiques, which record what happened.
- Archiving `video-hero`. Its `render-assets` delta touches different requirements from this change, so the two can be archived in either order.

## Decisions

### Show houses as 1 Kanal and 2 Kanal entries
`buildingTypes` gets two entries, each linking to its design page and using that design's `front-day` still. This keeps the two-column card grid and the alternating What We Build rows unchanged, with real content in both.

Alternatives: one wide Houses card says little and needs layout work, and removing the section loses the direct statement of what Noor builds. The data file and component keep their names, because they remain the place to add a new building type.

The section heading becomes "Houses of every size", and the intro and What We Build lead keep "mainly 1 Kanal and 2 Kanal". That preserves the claim that other sizes are built, which the entries alone would drop.

### Two columns on the Designs index
Remove the `64rem` three-column rule, so the two-column layout from `40rem` applies on all wider screens, and update the card `sizes` attribute to match. Three-column support can return if a third design is added. An `auto-fit` grid would adapt by itself but stretches a lone card too wide, which is a case that does not exist today.

### Change implied wording, keep clearly domestic wording
| Current | Becomes |
|---|---|
| "around your plot and the way you live or work" | "around your plot and the way you live" |
| "a building ready to use on the day we hand it over" | "a home ready to live in on the day we hand it over" |
| "We hand over a building ready to use" | "We hand over a home ready to live in" |
| "Every building starts as a drawing" | "Every house starts as a drawing" |
| "the home or building you have in mind" | "the home you have in mind" |
| "House and Building Designs" | "House Designs" |
| "the way your family lives" or "your business works" | "the way your family lives" |

"The moment a building becomes a home" and "Building the Future" stay, because neither suggests non-residential work.

### Keep the open model, remove plaza-only behaviour
Keep `kind` as free text, the `shop` and `office` room types, the matching facts and `MIN_SHOP_FRONTAGE`. Visitors never see them, the project context asks that future building types stay possible, and the facts are part of the render export schema, so removing them would mean a schema bump and re-exports for no visible gain.

Remove what only existed for the plaza: the `isHouse` branch on the design page, the plaza examples in comments and help text, and the `commercial` branch in `render/noor_render/site.py`. Simplifying that branch must keep the same sequence of random calls, so existing house scenes stay byte-for-byte reproducible.

`FeaturedDesign.astro` keeps its generic fallback for non-house kinds, because it names no building type.

### Enforce with the existing audit
Add a category to `content-rules.json` with the phrases `commercial` and `plaza`. The audit already covers visible text, alt text, meta tags and WhatsApp messages on every built page, including hidden pages. `shop` and `office` are not banned: "our office" is legitimate copy.

### Delete files outright
Git keeps the history, so restoring the plaza later is a matter of reverting this change. No archive folder is kept in the working tree.

## Risks / Trade-offs

- **Old plaza links return a 404** → Accepted. A redirect would keep the removed subject attached to a public URL, and the site's 404 page leads visitors back to the rest of the site.
- **Search results may show the old page or description for a while** → Removal from the sitemap and the 404 response let it drop out over time. Faster removal needs the owner's Search Console, which is outside this change.
- **The 1 Kanal shows up twice on the home page** (the new card and the featured design) → The two use different stills, day and dusk, so they read as distinct views.
- **Approved About copy changes** → A new entry goes in `APPROVALS.md` with the new hash, marked as awaiting maintainer review until confirmed.
- **Stale local render output for the plaza** → Check for ignored `commercial` folders during apply and report anything found, rather than deleting untracked output unseen.
- **The `site.py` edit cannot be verified by a Blender render here** → Check it by byte-compiling and by review of the random-call order. No house still is being re-rendered in this change.

## Migration Plan

Deploys with the next site build. To roll back, revert the change's commit and rebuild; the renders and data return from git.
