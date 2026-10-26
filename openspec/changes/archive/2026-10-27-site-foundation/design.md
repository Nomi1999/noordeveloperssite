## Context

The repository holds only OpenSpec files and the traced logo. Local toolchain: Node 24, npm 11. Current stable releases at the time of writing: `astro` 7.4.2, `@astrojs/sitemap` 3.7.4. Hosting is GitHub Pages (static only, public repo, custom domain at the root). See proposal.md for motivation and specs/ for requirements.

Later changes will add a heavy client-side piece (the scroll-scrubbed frame sequence on `/`). This foundation should therefore ship almost no JavaScript of its own, so the hero's loading budget isn't competing with anything.

## Goals / Non-Goals

**Goals:**
- A shell where later changes only add content and components, never restructure.
- Zero client-side framework: interactive behavior here is limited to the mobile menu.
- One place to edit contact details and one place to edit brand tokens.

**Non-Goals:**
- A light/dark theme switch. The brand palette is fixed and the site alternates dark and concrete sections by design, so it does not follow the OS color scheme.
- Contact forms, analytics, cookie banners, i18n.
- The real logo, imagery or page copy.

## Decisions

### Astro 7, static output, no UI framework integration
Pin `astro@7.4.2` exactly. Output is `static`, `site: "https://noordevelopers.pk"`, no `base`. Use `build.format: "directory"` with `trailingSlash: "always"`, so `/about/` maps to `about/index.html`, which is how GitHub Pages serves it, and canonical URLs stay consistent.
*Alternatives:* adding React/Svelte integrations now. Rejected: nothing in this change needs them, and the hero (later) will be a plain canvas script.
*Note for apply:* check Astro 7 docs for any config or API differences from earlier majors before writing code. Don't rely on memory of older versions.

### Plain CSS with custom properties, no Tailwind
Tokens live in `src/styles/tokens.css` as CSS custom properties. A small `global.css` holds reset, base typography and layout primitives (`.container`, `.section--dark`, `.section--concrete`). Component styles use Astro's scoped `<style>`.
*Why:* the design is bespoke (architect-drawing details, dimension lines) and a token file maps directly to the "single source of tokens" requirement. *Alternative:* Tailwind with a theme config. Rejected: utility classes add little for a small, highly custom site.

### Palette (starting values, tuned during build)
| Token | Value | Use |
|---|---|---|
| `--ink` | `#121212` | dark sections, text on light |
| `--ink-2` | `#1C1C1B` | raised surfaces on dark |
| `--concrete-700` | `#3A3936` | borders/rules on dark |
| `--concrete-500` | `#8A8780` | muted text on dark only |
| `--concrete-300` | `#C9C6BF` | rules on light |
| `--concrete-100` | `#E6E3DD` | concrete section background |
| `--paper` | `#F4F2EE` | light background, text on dark |
| `--noor` | `#F2A93B` | the single accent |

Contrast rule: `--noor` is used as **text only on dark backgrounds**. On light backgrounds it is a fill (button, rule, marker) with `--ink` text on top. `--concrete-500` is never used for body text on light backgrounds. Every allowed text pairing is listed in a comment in `tokens.css` with its contrast ratio, and checked during apply.

### Typography: Barlow Condensed / Barlow / IBM Plex Mono via Fontsource
- Display: **Barlow Condensed** 600/800. Its DIN-like condensed forms echo the logo wordmark, and it holds up at very large, very heavy sizes.
- Body: **Barlow** 400/500. Same family, so the system feels like one voice.
- Mono: **IBM Plex Mono** 400/500 for labels such as `01 — FOUNDATION` and dimensions like `50'-0"`.

Self-hosted through `@fontsource/*` packages, latin subset only, `font-display: swap`, with the display and body regular weights preloaded. *Alternative:* Big Shoulders Display. More characterful, but rounder than the wordmark. It can be revisited when the logo is redrawn.

### Contact configuration as a typed module
`src/config/site.ts` exports one typed object: `name`, `tagline`, `url`, `phone` (E.164, e.g. `+92300XXXXXXX`), `phoneDisplay`, `whatsapp` (digits only, for `wa.me`), `email`, `address` (street, city `Faisalabad`, region `Punjab`, country `PK`), `hours` (structured, for display and JSON-LD), `geo` (lat/lng, for a later map), `defaultWhatsAppMessage`. Every placeholder value carries a `// PLACEHOLDER(client)` comment.

A build-time check logs a clear **warning** (not an error) listing any remaining placeholders, so the site can still be deployed for review before the client sends details.

### CTA components and page-level WhatsApp message
- `CallButton.astro` → `tel:${phone}`, label "Call", accessible name "Call Noor Developers".
- `WhatsAppButton.astro` → `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, label "WhatsApp", accessible name "Message Noor Developers on WhatsApp". `wa.me` is used rather than `api.whatsapp.com` because it is the documented short form and works in app and browser.
- `BaseLayout.astro` accepts `title`, `description`, `ogImage?`, `whatsappMessage?`, and passes the message to the header CTAs, the sticky bar and the footer, so a page sets its message once.
- `StickyActionBar.astro` is shown below a breakpoint (`48rem`). `main` gets `padding-bottom: calc(bar-height + env(safe-area-inset-bottom))` at the same breakpoint. Above it, the bar is hidden and Call/WhatsApp sit in the header.

Icons are inline SVG (phone and WhatsApp glyphs), always next to a text label.

### Mobile menu: progressive enhancement, tiny inline script
The nav is a normal `<ul>` that is visible without JavaScript. With JS, a `<button aria-expanded aria-controls>` toggles it at narrow widths, handles Escape, and returns focus to the toggle. No library is used.

### SEO
- `Seo.astro` in the layout head: title pattern, description, canonical (`new URL(Astro.url.pathname, site)`), OG and Twitter tags, default share image `public/og-default.png` (1200×630, brand colors + wordmark, replaced by a render later).
- `@astrojs/sitemap@3.7.4` with a filter excluding `/404/`. Static `public/robots.txt` pointing to the sitemap.
- JSON-LD `GeneralContractor` (a schema.org subtype of `HomeAndConstructionBusiness`) on every page, built from `site.ts`. No ratings, reviews or `priceRange`.

### Route stubs
Each route in the route map exists as an `.astro` page using `BaseLayout` with a title, description and a placeholder section ("Coming soon" in the brand style). `/designs/*` pages are plain files for now. The `house-designs` change may turn them into a content collection with a dynamic route, which is why they live under one folder.

### Deployment: official Astro action + Pages deploy
`.github/workflows/deploy.yml`: triggers on push to `main` and `workflow_dispatch`. A `build` job uses `withastro/action` (pinned to a major version tag) with Node 24, and a `deploy` job uses `actions/deploy-pages`. Permissions are `pages: write, id-token: write`, with `concurrency: pages` and no cancelling of an in-progress deploy. Because the build job fails before upload, a broken build never replaces the live site. `public/CNAME` contains `noordevelopers.pk`.

## Risks / Trade-offs

- [Placeholder contact data deployed publicly would show fake numbers in search results and structured data] → Build warning lists placeholders. Placeholders use obviously fake formats (e.g. `+92 300 0000000`). Don't point the real domain at the site until real details are in.
- [Astro 7 is newer than my reliable knowledge] → Read the current Astro docs and upgrade guide during apply, and pin exact versions.
- [Amber accent fails contrast on light backgrounds] → Documented pairing rules in `tokens.css`, verified with a contrast check during apply.
- [Public repository exposes source] → Acceptable for a marketing site. No secrets are involved because there is no form or API.
- [`.pk` DNS setup happens outside this repo] → Out of scope. GitHub Pages needs A records for the apex domain and a `www` CNAME. These steps are listed in the README written in this change.
- [Font choice may shift once the logo is redrawn] → Fonts are swapped in one token file plus package imports.

## Migration Plan

New site, so there is nothing to migrate. Deploy sequence: push to GitHub → set Pages source to "GitHub Actions" in repo settings → first deploy at `<user>.github.io/<repo>` (assets may break there because there is no base path, which is expected) → buy the domain → configure DNS → set the custom domain in Pages settings → enable "Enforce HTTPS" once the certificate is issued. To roll back, re-run the workflow on an earlier commit or revert.

## Open Questions

- Real contact details and the office map location. These only fill in `site.ts` and don't change the design.
- Final accent hex value. It will be tuned against the first renders in the `render-pipeline` change.

## Apply Notes: Astro 7 docs check (2026-10-26)

Checked against the current docs (upgrade guides for v6 and v7, configuration reference, integrations reference, sitemap guide, GitHub Pages deploy guide). The design's assumptions hold. Differences and details to respect:

- **Node**: Astro 6+ needs Node ≥ 22.12. The local Node 24 and the workflow's Node 24 are fine.
- **`build.format` / `trailingSlash`**: `directory` is already the default, and `trailingSlash` defaults to `ignore`. Both are set explicitly anyway. The docs recommend this exact `directory` + `always` pairing so dev and build behave the same. `Astro.url` ends in `/` at build time under `directory`.
- **`compressHTML` now defaults to `'jsx'`** (new in v7): whitespace between inline elements is stripped by JSX rules, so `<span>a</span> <em>b</em>` can render as "ab". Components keep that default. Gaps between icons and labels use flex `gap`, and explicit `{" "}` is used where inline text needs a space.
- **Rust compiler** (v7 default): unclosed non-void tags and invalid nesting (for example a `<div>` inside a `<p>`) are build errors and are no longer auto-fixed. Markup must be valid.
- **`src/fetch.ts` is reserved** (v7 advanced routing). Don't use that filename.
- **Scripts and styles render in source order** (v6). `<script>` tags without `is:inline` are processed and bundled as modules. The mobile-menu script uses a processed `<script>` in `Header.astro`, which Astro dedupes and may inline when it is small. That still meets "tiny, no library".
- **Integration API**: `astro:config:setup` and `astro:build:done` both receive `logger` (`logger.warn` prints `[name] message`). The placeholder check is an inline integration in `astro.config.mjs` that warns in `astro:build:done`, so it shows in `npm run build` output.
- **Sitemap**: `@astrojs/sitemap` writes `sitemap-index.xml` plus `sitemap-0.xml`. The docs don't say the 404 page is excluded automatically, so `filter` excludes `/404/` and `/styleguide/` explicitly.
- **GitHub Pages**: the documented action versions are `actions/checkout@v7`, `withastro/action@v6` (default Node 24, which is set explicitly anyway) and `actions/deploy-pages@v5`. These match the latest releases (v7.0.1, v6.1.4, v5.0.1). The lockfile must be committed.
- Not relevant to this change: the Sätteri Markdown default, removal of `@astrojs/db`, `Astro.glob()` removal, Zod 4.

## Apply Notes: implementation deviations and results (2026-10-26)

- **Sticky-bar space is reserved on `body`, not `main`.** The footer comes after `main`, so padding on `main` would leave the footer under the bar, which breaks the "footer fully visible" scenario. `body` gets `padding-bottom: calc(var(--action-bar-height) + env(safe-area-inset-bottom))` below `48rem`. The bar has a fixed height equal to that value.
- **Nav collapses below `64rem`, not `48rem`.** Wordmark, four nav links and both CTAs don't fit in one row at 768px. Breakpoints are now: below `48rem`, a menu toggle plus the sticky bar; from `48rem` to `64rem`, a menu toggle with Call/WhatsApp in the header; from `64rem` up, the full nav with the CTAs. Without JS, the nav wraps onto its own row at any width below `64rem`.
- **Mobile-menu flash avoided** with a one-line inline `<head>` script that adds `.js` to `<html>`. The collapse CSS is scoped to `.js`, so the nav stays visible when JS is off.
- **Section ancestors** (for example Designs while on `/designs/1-kanal/`) get `aria-current="true"` and the same visual mark. Exact matches get `aria-current="page"`.
- **JSON-LD `logo`/`image`** temporarily point to `/og-default.png` until `brand-logo` delivers a logo file.
- **Temporary `public/favicon.svg`** (an amber "N" on ink) prevents a `/favicon.ico` 404. It will be replaced in `brand-logo`.
- **Lighthouse 13.5.0, mobile, local `npm run preview`:** `/` scored Performance 100, Accessibility 100, Best Practices 100, SEO 100. `/designs/1-kanal/` scored Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- **schema.org validator** (validator.schema.org, built `dist/index.html`): one `GeneralContractor` object, 0 errors, 0 warnings. All contact values match `site.ts`.
