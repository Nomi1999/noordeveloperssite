## Context

See proposal.md. The incumbent drawing-office visual system (tokens, dimension rules, blueprint grid, amber "lit window" accent) is kept; this is a refinement, not a rebrand.

## Decisions

- **Dusk first without new renders.** The poster for every mode is the finished dusk frame (`staticPoster`). In scrub mode the first sixth of the scroll span is an intro state (`data-phase="intro"`): the canvas stays transparent over the dusk poster; past it the canvas fades in at frame 0 and the remaining span maps to frames 0–191. Loading still starts nearest the scroll position, so the blueprint frames load first.
- **Hero length.** Scroll span 3 × 100svh (was 6), so the hero is 4 screens tall: half a screen of intro, then about 0.4 screens per phase.
- **Jump ticks.** Each ruler tick is a button that scrolls (smoothly unless reduced motion) to its phase's first frame; this is a programmatic scroll on click, so native scrolling is untouched otherwise.
- **Slow connections.** `navigator.connection.effectiveType` of `slow-2g`, `2g` or `3g` joins Save-Data and reduced data as a reason for the static hero.
- **Placeholders.** `placeholder-check` throws when `NOOR_LAUNCH=1`; review deploys keep the warning. Unknown values are empty strings with the marker, and components omit empty rows.
- **Reassurance.** Confirmed statements live in `site.promises` (contact configuration), rendered by one `ContactNote` component, so the client can withdraw one in one place.

## Non-Goals

- New renders or changes to the 192-frame sequence.
- Header/menu behaviour on phones.
