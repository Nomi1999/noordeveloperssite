## 1. Project setup

- [ ] 1.1 Read the current Astro 7 docs (config, project structure, upgrade notes) and note any differences from the design's assumptions in design.md; verify the notes are written before any code
- [ ] 1.2 Scaffold an Astro 7.4.2 project at the repo root (minimal template, TypeScript strict) with exact-pinned versions, `.gitignore` and npm scripts `dev`, `build`, `preview`; verify `npm run build` succeeds on the empty project
- [ ] 1.3 Configure `astro.config.mjs` with `site: "https://noordevelopers.pk"`, static output, `build.format: "directory"`, `trailingSlash: "always"`, no `base`; verify the build output has `index.html` files in route directories
- [ ] 1.4 Move `v1 and v3 combined.svg` to `brand/source/logo-traced.svg` (kept as source material for `brand-logo`, not shipped); verify it is outside `public/` and absent from `dist/`

## 2. Design system

- [ ] 2.1 Install `@fontsource/barlow-condensed`, `@fontsource/barlow`, `@fontsource/ibm-plex-mono` (latin subsets, needed weights only) and import them; verify in the built site that all font files are served from the site's own origin
- [ ] 2.2 Create `src/styles/tokens.css` with the palette, type scale (fluid `clamp()` sizes), spacing scale, radii, motion durations and the commented list of allowed text/background pairings with contrast ratios; verify every listed pairing meets WCAG AA with a contrast checker
- [ ] 2.3 Create `src/styles/global.css` with reset, base typography using the three type roles, `.container` (16px minimum gutters), `.section--dark` / `.section--concrete` primitives, visible `:focus-visible` style, and a `prefers-reduced-motion` block disabling transitions and animations; verify at 320px width that there is no horizontal overflow
- [ ] 2.4 Build a hidden `/styleguide/` page (excluded from sitemap, `noindex`) showing tokens, type roles and buttons on dark and light sections; verify visually that it matches the bold/industrial direction and that no literal colors appear outside `tokens.css` (grep for `#` hex values in `src/`)

## 3. Contact configuration and actions

- [ ] 3.1 Create `src/config/site.ts` with the typed contact object and placeholder values, each marked `// PLACEHOLDER(client)`; verify `grep -r "PLACEHOLDER(client)" src` lists every placeholder field
- [ ] 3.2 Add a build-time check (Astro integration hook or config-time script) that prints a warning naming each remaining placeholder; verify the warning appears in `npm run build` output and disappears when values are replaced
- [ ] 3.3 Create a `whatsappUrl(message?)` helper and `CallButton.astro` / `WhatsAppButton.astro` with inline SVG icons, text labels and accessible names; verify that a message containing spaces, `&`, `?` and Urdu characters round-trips correctly through the generated `wa.me` URL
- [ ] 3.4 Create `StickyActionBar.astro`, shown below `48rem`, with safe-area padding, and reserve matching bottom padding on `main`; verify in mobile emulation (iPhone and Android sizes) that the footer is fully visible above the bar and that the bar is hidden on desktop

## 4. Site shell

- [ ] 4.1 Create `BaseLayout.astro` (props: `title`, `description`, `ogImage?`, `whatsappMessage?`) with skip link, header/nav/main/footer landmarks, and the page WhatsApp message passed to every CTA; verify the skip link is the first Tab stop and moves focus to `main`
- [ ] 4.2 Create `Header.astro` with a temporary text wordmark ("NOOR DEVELOPERS" in the display face) linking to `/`, nav links, `aria-current="page"` on the active link, and Call/WhatsApp on desktop; verify the current link is marked on each route
- [ ] 4.3 Add the mobile menu toggle (progressive enhancement, inline script: `aria-expanded`, focus into menu, Escape closes and returns focus); verify by keyboard only, and verify that the nav still works with JavaScript disabled
- [ ] 4.4 Create `Footer.astro` with name, tagline, contact details from `site.ts`, Call/WhatsApp actions and the current-year copyright, with no social, price, certification, statistics or regulatory content; verify that changing a value in `site.ts` updates the footer after rebuild
- [ ] 4.5 Create stub pages for `/`, `/what-we-build/`, `/designs/`, `/designs/1-kanal/`, `/designs/2-kanal/`, `/designs/commercial/`, `/about/`, `/contact/`, each with a unique title, description and design-specific WhatsApp message where relevant; verify every route returns a page in the shared layout
- [ ] 4.6 Create `src/pages/404.astro` in the brand style with a link home and Call/WhatsApp; verify `dist/404.html` exists and renders correctly under `npm run preview` for an unknown path

## 5. SEO

- [ ] 5.1 Create `Seo.astro` (title pattern, description, canonical on `https://noordevelopers.pk` with trailing slash, OG and Twitter tags) and use it in `BaseLayout`; verify by inspecting built HTML that titles and descriptions are unique across pages and canonicals are absolute
- [ ] 5.2 Create `public/og-default.png` (1200×630, ink background, wordmark and tagline in brand fonts, rendered from an HTML template with headless Chrome); verify the dimensions and that every page without its own image references it
- [ ] 5.3 Add `@astrojs/sitemap@3.7.4` excluding `/404/` and `/styleguide/`, plus `public/robots.txt` referencing the sitemap; verify that `dist/sitemap-index.xml` and its child list exactly the eight routes
- [ ] 5.4 Add `GeneralContractor` JSON-LD built from `site.ts` (no ratings, reviews or priceRange); verify it parses with the schema.org validator and its values match `site.ts`

## 6. Deployment

- [ ] 6.1 Add `public/CNAME` containing `noordevelopers.pk`; verify it is copied to `dist/CNAME`
- [ ] 6.2 Add `.github/workflows/deploy.yml` (push to `main` plus `workflow_dispatch`; build with `withastro/action` on Node 24; deploy with `actions/deploy-pages`; `pages: write`, `id-token: write`; `concurrency: pages`); verify the YAML is valid with `actionlint` or a schema check
- [ ] 6.3 Write `README.md` covering local commands, where contact details and tokens live, and GitHub Pages + `.pk` DNS setup steps (A records for the apex domain, `www` CNAME, custom domain field, Enforce HTTPS); verify that each command in it runs as described

## 7. Final verification

- [ ] 7.1 Run `npm run build` and `npm run preview` and click through every route at 320px, 390px, 768px and 1440px; verify there is no horizontal overflow, no console errors and no 404s for assets
- [ ] 7.2 Run Lighthouse (mobile) on `/` and one stub page; verify Accessibility and SEO scores are 100 and Best Practices is 95 or higher, and record the results
- [ ] 7.3 Turn on reduced motion in the OS or devtools; verify that no element animates on any page
