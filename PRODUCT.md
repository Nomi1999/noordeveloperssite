# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Families in and around Faisalabad who want a new house: either to buy one Noor has already built, or to have Noor design and build on a plot they own. Most decide by phone or WhatsApp, often on a phone.
- The site must not exclude overseas Pakistanis building at home, or future building types.

## Product Purpose
A showcase that Noor Developers exists and builds fully finished houses and commercial buildings. The only conversion goal is a phone call or a WhatsApp message.

## Positioning
One team from the first drawing to the keys, and every build handed over fully finished: the owner only brings furniture. Two ways to work: buy a Noor home built on Noor's own plot, or have Noor design, architect and build on your plot.

## Operating Context
- Plots are measured in Kanal and Marla (1 Kanal drawn as 50'×90', 2 Kanal as 75'×120'); dimensions are shown in feet and inches.
- Contact is by tel: and wa.me links (page-specific prefilled WhatsApp messages) and a sticky Call/WhatsApp bar on phones. No forms.

## Capabilities and Constraints
- English only. No prices, no availability or sale status, no regulatory or approval language, no real project names, no superlatives (enforced by `scripts/audit-content.mjs` and `src/content/content-rules.json`).
- House designs are concept designs, never listings.
- Contact details in `src/config/site.ts` are placeholders until the client supplies them; launch builds (`NOOR_LAUNCH=1`) fail while any remain.
- Confirmed by the maintainer (2026-11-01) as true and allowed: the first conversation is free with no obligation; WhatsApp messages get a reply the same working day; visitors are welcome at the Faisalabad office.
- Not confirmed, so not to be claimed: site visits to houses under construction.

## Brand Commitments
- Name Noor Developers; tagline "Building the Future". "Noor" means light: the amber accent is the colour of a lit window.
- Bold, industrial, drawing-office character: near-black, warm concrete greys, one amber accent; heavy condensed display type, a monospace face for drawing labels and dimensions. No hazard-stripe clichés.

## Evidence on Hand
- Own 3D renders only (`src/assets/renders/`, the 192-frame build sequence in `public/hero/`). No stock photos, no photography of real work.
- The design stills and the hero's opening dusk poster are AI-enhanced (2026-11-01, `scripts/enhance-renders.mjs`): photoreal versions made from those same renders, keeping each design and camera. The 1 Kanal terrace is shown with glass on every open side, as the maintainer asked. They are still concepts and must never be presented as photos of built houses.
- No testimonials, statistics, years in business, certifications or completed-project counts exist or may be invented.

## Product Principles
1. Show, don't claim: the renders and the build sequence carry the argument that rules out trust-signal copy.
2. Every screen is one tap from Call or WhatsApp.
3. Say only what the client has confirmed; placeholders never ship as if real.
4. Built for a phone on a mixed connection first.

## Accessibility & Inclusion
WCAG 2.1 AA contrast and keyboard access; reduced-motion, reduced-data and no-JS visitors get a complete static page.
