## Why

An Impeccable design critique of the home page (`.impeccable/critique/2026-10-31T19-42-35Z__src-pages-index-astro.md`, 22/32) found that the scroll-build hero is the site's strongest idea but costs seven screens of scrolling before the offer, loses the headline after the first scroll and fails contrast on phones; that every contact action points at placeholder details; that nothing next to Call or WhatsApp reassures a stranger; and that the sections after the hero read as a generic template. The maintainer chose to open the page on the finished dusk house and to fix all five priority issues.

## What Changes

- **Hero, dusk first**: the first screen is the finished 1 Kanal house at dusk with the headline, a Faisalabad line, the Call and WhatsApp actions and a short reassurance line. A short scroll dissolves to the blueprint and the existing 192 frames play forward to dusk again, ending on Move in. The hero is 4 screens tall instead of 7. The frames themselves do not change.
- **Hero control**: the headline stays on screen (smaller) through the build; the ruler ticks become buttons that jump to each stage; a visible "Skip to the homes" link sits by the scroll cue; slow connections (effective type 3G or slower) get the static hero.
- **Mobile legibility**: a stronger portrait scrim so phase copy meets AA contrast over the frames.
- **Contact hardening**: launch builds (`NOOR_LAUNCH=1`) fail while placeholders remain; contact rows with no value are hidden; Call shows the number where there is room; one order everywhere (Call, then WhatsApp).
- **Reassurance**: maintainer-confirmed statements (free first conversation, same-day WhatsApp reply, office visits welcome) and opening hours next to the actions, from the contact configuration.
- **Sections after the hero**: no section numbers or eyebrow labels; Offerings shows the blueprint and the finished house; Fully finished gets its own composition and a heading that doesn't repeat the hero; the closing band sits on a dusk render.
- **Type**: wrapping UI text uses a 1.35 line height instead of 1.15.

## Capabilities

### Modified Capabilities
- `scroll-build-hero`: dusk-first playback, shorter hero, persistent headline, jump ticks, visible skip, slow-connection static mode, poster.
- `home-page`: offerings with imagery, reassurance in the closing band, no section numbering.
- `contact-actions`: launch-mode placeholder failure, hidden empty fields, consistent action order, reassurance statements.

## Impact

- `src/components/hero/` (markup, player, copy), `src/components/sections/*`, `CallButton`, `Footer`, contact page, `src/config/site.ts`, `integrations/placeholder-check.mjs`, tokens.
- Approved hero copy changes; the maintainer waived re-approval (logged in `src/content/APPROVALS.md`).
