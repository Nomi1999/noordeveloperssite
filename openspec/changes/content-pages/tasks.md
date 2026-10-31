## 1. Copy data and audit

- [x] 1.1 Create `src/content/offerings.ts`, `fully-finished.ts` (grouped, with the furniture exclusion), `process.ts` (four steps) and `building-types.ts` with draft copy from the design doc; verify they type-check and contain no banned content
- [x] 1.2 Write `scripts/audit-content.mjs` and `content-rules.json` (categories, word boundaries, case rules, allowlist) and chain it into `npm run build`; verify that a test page containing "Starting from PKR" fails the build with page and phrase named, and that "floors" does not match `Rs`
- [x] 1.3 Add an audit fixture test covering each banned category and one allowlisted phrase; verify `npm test` passes

## 2. Section components

- [x] 2.1 Build the `SectionHeader` (mono index, condensed heading, dimension-line rule) and the dark-section blueprint grid background; verify on `/styleguide/` in dark and concrete sections at 320px and 1440px
- [x] 2.2 Build `Offerings`, `FullyFinished` (full and compact variants), `WhatWeBuild`, `Process`, `FeaturedDesign` and `CtaBand` from the copy data; verify each renders on `/styleguide/` and meets AA contrast
- [x] 2.3 Add scroll-driven reveal and rule-draw motion inside `@supports` and `prefers-reduced-motion: no-preference`; verify that content is immediately visible with reduced motion and in a browser without scroll-timeline support

## 3. Pages

- [x] 3.1 Compose the home page (hero → Offerings → FullyFinished compact → WhatWeBuild → Process → FeaturedDesign 1 Kanal dusk → CtaBand); verify section order and that all links resolve
- [x] 3.2 Build `/what-we-build/` (building types, offerings in detail, full checklist with "furniture not included", page CTA with its WhatsApp message); verify that adding a test building type renders in the same layout and is then removed
- [x] 3.3 Replace the design stubs with `src/pages/designs/[slug].astro` and add the registry render mapping (lead, gallery, share) validated at build; verify the three URLs are unchanged and a missing render fails the build
- [x] 3.4 Build the design detail layout (lead render, facts panel from computed data, gallery, floor plans with level switcher, checklist, concept note, design-specific WhatsApp message, design share image); verify on all three designs
- [x] 3.5 Implement the level switcher as ARIA tabs (progressive enhancement); verify keyboard arrows, `aria-selected`, and stacked levels with JS off
- [x] 3.6 Implement the gallery `<dialog>` (progressive enhancement over full-image links); verify Escape and close-button behavior and focus return, and that the full image opens with JS off
- [x] 3.7 Build `/designs/` index cards (lead render, name, kind, plot, key facts, concept label); verify all registry designs are listed
- [x] 3.8 Build `/about/` (Faisalabad, houses and commercial, meaning of Noor, approach); verify no excluded content types via the audit and a manual read
- [x] 3.9 Build `/contact/` (big Call/WhatsApp first, details from `site.ts`, `mailto:`/`tel:` links, "Open in Google Maps" link); verify in the network panel that there are no third-party requests and that the map link opens the configured location

## 4. Copy approval

- [x] 4.1 Write the final drafts of the hero copy, About and checklist and present them to the maintainer; record approval in `src/content/APPROVALS.md`
- [x] 4.2 Get the client's confirmation of the fully finished checklist through the maintainer and record it in `src/content/APPROVALS.md`

## 5. Launch readiness

- [x] 5.1 Run a full build with audit, and click through every page at 320px, 390px, 768px and 1440px; verify no overflow, no console errors and no missing assets
- [x] 5.2 Run Lighthouse mobile on every page; verify Accessibility 100, SEO 100, Best Practices ≥ 95, and record Performance per page
- [x] 5.3 Verify every page's WhatsApp message and share image (paste each URL into a WhatsApp chat preview, or use an OG debugger)
- [x] 5.4 Write a launch checklist in `README.md` (replace placeholders and confirm the warning is gone, approvals recorded, buy the domain, DNS records, Pages custom domain, Enforce HTTPS); verify every item is listed
