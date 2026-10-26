## Why

Noor Developers have no website, and every later piece of work (the redrawn logo, house designs, the scroll-build hero, content pages) needs a working Astro site, a visual system and a deploy path to build on. Doing the foundation first also fixes the parts that must be the same on every page: the Call/WhatsApp actions that are the site's only conversion goal, and SEO for local search.

## What Changes

- Scaffold an Astro static site with TypeScript, configured for the custom domain `noordevelopers.pk` (no base path).
- Introduce a bold, industrial design system as CSS tokens: near-black, warm concrete greys, one amber "light" accent, a heavy condensed display face, a body face and a monospace face for architect-style labels and dimension annotations.
- Add a site shell: header with the logo and navigation, footer, a shared page layout, a branded 404 page, and stub routes for the planned site map (`/`, `/what-we-build`, `/designs`, `/designs/1-kanal`, `/designs/2-kanal`, `/designs/commercial`, `/about`, `/contact`), which later changes will fill in.
- Add a single contact configuration file holding placeholder company details (address, phone, WhatsApp, email, hours, map location) that every page reads.
- Add Call and WhatsApp actions: reusable CTA components using `tel:` and `wa.me` links with page-specific prefilled messages, plus a sticky Call/WhatsApp bar on mobile.
- Add SEO basics: per-page title and description, canonical URLs, Open Graph tags, sitemap, robots.txt and `GeneralContractor` (a schema.org local business type) structured data built from the contact configuration.
- Add a GitHub Actions workflow that builds and deploys to GitHub Pages, with a `CNAME` file for the custom domain.
- The header uses a temporary text wordmark until the `brand-logo` change delivers the redrawn logo. The current traced logo file is 1 MB, too heavy to ship.

## Capabilities

### New Capabilities
- `design-system`: color, typography, spacing and motion tokens, with contrast and reduced-motion guarantees.
- `site-shell`: shared layout, header navigation, footer, 404 page and the route map for all planned pages.
- `contact-actions`: centralized company contact data and the Call/WhatsApp actions (inline CTAs, prefilled messages, sticky mobile bar).
- `seo-metadata`: page metadata, canonical URLs, social previews, sitemap, robots and local-business structured data.
- `site-deployment`: automated build and deploy to GitHub Pages under the custom domain.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- New Astro project at the repository root (`package.json`, `astro.config.mjs`, `src/`, `public/`).
- New dependencies: `astro`, `@astrojs/sitemap`, self-hosted fonts via `@fontsource` packages.
- New `.github/workflows/deploy.yml` and `public/CNAME`.
- The repository must be public on GitHub for free Pages hosting. DNS for `noordevelopers.pk` must point to GitHub Pages; that is done outside this repo when the domain is bought.
- Out of scope here: the logo redraw, house designs, renders, the scroll-build hero and real page content. Those are later changes.
