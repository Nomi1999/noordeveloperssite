## Why

After the earlier changes, the site has a shell, a logo, designs, renders and a hero, but every page except the hero is a placeholder. This change writes and lays out the real pages, so a visitor understands what Noor Developers do (build and sell finished homes, or design and build on the visitor's own plot, for houses and commercial buildings) and is never more than one tap from calling or messaging them.

## What Changes

- **Home**: the scroll-build hero followed by sections for the two ways to work with Noor, what "fully finished" means, what they build (houses and commercial, linking to designs), how they work, a featured design, and a closing Call/WhatsApp band.
- **What We Build** (`/what-we-build/`): houses of every size (mainly 1 and 2 Kanal) and commercial buildings; the two offerings in detail; the fully finished promise.
- **Designs** (`/designs/` and `/designs/<slug>/`): an index of the three concept designs, and detail pages with a render gallery, key facts computed from design data, floor plans per level with a level switcher, the fully finished list, and design-specific WhatsApp messages. The three stub files become one dynamic route over the design registry.
- **About** (`/about/`): who Noor Developers are, what *Noor* means, and how they approach a build, with no trust signals.
- **Contact** (`/contact/`): large Call and WhatsApp actions, address, hours, email and an "Open in Google Maps" link (no embedded map). Values come from the contact configuration, still as placeholders.
- A shared "fully finished" checklist and the other reusable copy in data files, plus final approval of the hero copy.
- An automated content audit that fails the build if banned content appears: prices, regulatory terms, real project names, trust-signal phrasing.
- Restrained, industrial page motion (dimension-line rules, section reveals) that respects reduced motion.

## Capabilities

### New Capabilities
- `home-page`: home page sections after the hero, and their order.
- `services-page`: the What We Build page.
- `design-showcase`: the designs index and design detail pages.
- `company-pages`: the About and Contact pages.
- `content-standards`: the rules all site copy follows, enforced by an automated audit, and the copy approval process.

### Modified Capabilities
<!-- None. Routes stay as defined in site-shell; /designs/<slug>/ pages keep the same URLs. -->

## Impact

- New page components and sections in `src/components/sections/`, copy data in `src/content/`, a dynamic route `src/pages/designs/[slug].astro` (replacing the three stub files), and a gallery dialog component.
- New `scripts/audit-content.mjs`, run in the build and in CI.
- Uses stills and share images from `render-pipeline`, design data and floor plans from `house-designs`, and the hero from `scroll-build-hero`.
- The client must confirm the fully finished checklist and the About copy before launch.
