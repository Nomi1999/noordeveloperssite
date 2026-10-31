## Context

By the time this change starts, the site has:
- a shell, tokens and CTA components (`site-foundation`);
- the logo (`brand-logo`);
- a design registry with computed facts and `FloorPlan.astro` (`house-designs`);
- eleven stills and share images in `src/assets/renders/` (`render-pipeline`);
- `ScrollBuildHero.astro` (`scroll-build-hero`).

See proposal.md for motivation and specs/ for requirements.

## Goals / Non-Goals

**Goals:**
- Pages that feel built rather than templated: big condensed type, hard rules, mono annotations, renders shown large.
- Every page ends at Call and WhatsApp, and the sticky bar is always there on phones.

**Non-Goals:**
- Forms, embedded maps, blog, testimonials, galleries of real projects.
- New imagery. This change only uses renders that already exist.

## Decisions

### Section components plus copy data
Sections live in `src/components/sections/` (`Offerings`, `FullyFinished`, `WhatWeBuild`, `Process`, `FeaturedDesign`, `CtaBand`, `PageIntro`). Copy lives in `src/content/` as typed TS modules (`offerings.ts`, `fully-finished.ts`, `process.ts`, `building-types.ts`). `hero-copy.ts` stays where `scroll-build-hero` put it. Pages are thin compositions of sections.
*Alternative:* Astro content collections with Markdown. Rejected for this copy: it's short, structured and reused, so typed modules fit better. Designs get per-slug Markdown blurbs (`src/content/designs/<slug>.md`) for their longer descriptions.

### Visual language
- **Section header:** a mono index (`02 / 06`) and label, a heavy condensed heading, and a thin rule with dimension-line end ticks.
- **Dark sections** (`--ink`) carry a faint 1-unit blueprint grid background (CSS gradients, opacity ~4%). Concrete sections (`--concrete-100`) carry none.
- **Renders** sit edge to edge or in hard-edged frames with mono captions (`1 KANAL — DUSK — CONCEPT`).
- **The accent** appears only in small doses: CTA fills, index numbers, the checklist tick marks.
- **Fully finished checklist:** a grid of items with mono category labels and a square accent tick. Compact variant on home (top 8 items plus a "see everything included" link to What We Build).

### Fully finished checklist (draft, needs client confirmation)
| Group | Items |
|---|---|
| Structure and services | RCC frame and brick masonry; concealed electrical wiring with switches, sockets and lights fitted; hot and cold water plumbing; gas lines; roof waterproofing and heat insulation; overhead and underground water tanks |
| Interiors | tiled or marble floors throughout; false ceilings with lighting; interior and exterior paint; solid wood doors; aluminium or uPVC windows with glazing; built-in bedroom wardrobes; staircase with railing |
| Kitchen and bathrooms | fitted kitchen cabinets and countertops; tiled bathrooms with sanitary ware, vanities and mirrors; water heating connection |
| Outside | boundary wall and main gate; car porch; landscaped lawn |
| Not included | Furniture |

Every item is generic on purpose: no brands, no grades.

### Dynamic design route
`src/pages/designs/[slug].astro` uses `getStaticPaths()` over the design registry, so the slugs `1-kanal`, `2-kanal` and `commercial` keep the existing URLs. The three stub files are removed. Each design maps to its stills through a registry entry (`renders: { lead, gallery[], share }`), which is validated at build so a missing image fails the build.

### Level switcher
Server-rendered: all levels output as sections. With JS, a small script turns them into an ARIA tabs pattern (`role="tablist"`, roving tabindex, arrow keys) and hides inactive panels. Without JS, the levels simply stack.

### Gallery dialog
Each thumbnail is `<a href="full.jpg">`. With JS, clicks open a native `<dialog>` (`showModal()`, which traps focus) with the large image, a close button and Escape support, and focus returns to the trigger on close. Images use Astro `<Picture>` with AVIF/WebP and `sizes`.

### Contact map link
`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` built from `site.ts` `geo`, falling back to the encoded address. No iframe, so there are no third-party requests, which matches the spec's network check.

### Content audit
`scripts/audit-content.mjs` runs after `astro build`:
- It parses every `dist/**/*.html`, extracts visible text (excluding `script`/`style`) and attribute text (`alt`, `aria-label`, `title`, `content` of meta description/OG tags), and matches against `content-rules.json`.
- Matching uses word boundaries and is **case-sensitive for short tokens** like `Rs` and `NOC`, so words like "floors" don't trigger false positives. Other phrases are case-insensitive.
- Banned categories cover prices and currency, sale status, regulatory terms, real names, trust signals and unprovable superlatives.
- Failures list the page, category and matched text, and the process exits non-zero.

The npm `build` script becomes `astro build && node scripts/audit-content.mjs`, so CI enforces it.

### Motion
CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports` for section reveals and dimension rules drawing in, so there's no JS, and browsers without support simply show content. All of it is wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Risks / Trade-offs

- [Thin About copy without facts or trust signals] → Lean on what's true and distinctive: Faisalabad, end-to-end, fully finished, the meaning of Noor. Keep it short rather than padded. The client reviews it.
- [The checklist promises something the client doesn't deliver] → Client confirmation is a recorded launch requirement. Items are generic, with no brands or grades.
- [Audit false positives block deploys] → Word-boundary and case rules, an allowlist for specific phrases in the rules file, and clear failure messages.
- [Placeholder contact details at launch] → `site-foundation`'s placeholder warning plus the launch checklist task here.

## Migration Plan

Replace stub pages section by section, and remove the three `/designs/*` stub files when the dynamic route lands (same URLs, so the sitemap is unchanged). Final launch checklist: real contact details, audit passing, Lighthouse checks, approvals recorded. Then the maintainer points the domain at the site.
