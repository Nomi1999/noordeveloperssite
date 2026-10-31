# Noor Developers website

Marketing site for Noor Developers, a property developer and builder in Faisalabad. It is built with [Astro](https://astro.build) as a fully static site and deployed to GitHub Pages at `https://noordevelopers.pk`.

## Requirements

- Node.js 22.23.4 or newer (CI uses Node 24)
- npm 11

## Commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (versions are pinned exactly) |
| `npm run dev` | Start the dev server at `http://localhost:4321/` |
| `npm run build` | Build the production site into `dist/`, warn about any placeholder contact details, fail if a building design breaks a geometric rule or a design is missing a render, then run the content audit (fails on banned copy) |
| `npm run preview` | Serve `dist/` locally at `http://localhost:4321/`, exactly as it will be deployed (unknown paths show the 404 page) |
| `npm test` | Run the unit tests (design model, geometry, validation, floor plans, render export, render registry, content audit) and check that prefilled WhatsApp messages survive URL encoding |
| `npm run designs:export` | Write the render export, `render/data/<slug>.json` and `render/data/schema.json`; run after changing a design and commit the result |
| `npm run designs:review` | Build the site and print the plan review sheet to `review/plans-review.pdf` with headless Chrome (set `CHROME_PATH` if Chrome is not found) |
| `npm run render:og` | Re-render `public/og-default.png` from `brand/og/og-default.html` with headless Chrome (set `CHROME_PATH` if Chrome is not found) |

## Where things live

| What | Where |
|---|---|
| Contact details (phone, WhatsApp, email, address, hours, map location) | `src/config/site.ts`, the only place to edit them |
| Design tokens (colors, fonts, type scale, spacing, motion) | `src/styles/tokens.css`, including the list of allowed text/background color pairs |
| Reset, base typography, layout primitives, buttons | `src/styles/global.css` |
| Navigation links | `src/config/nav.ts` |
| Shared layout, header, footer, Call/WhatsApp buttons, mobile action bar | `src/layouts/` and `src/components/` |
| Pages (one file per route; `designs/[slug].astro` makes one page per design) | `src/pages/` |
| Page sections (offerings, fully finished, what we build, process, featured design, closing band, page intro) | `src/components/sections/` |
| Shared copy: offerings, the fully finished checklist, process steps, building types, About | `src/content/*.ts` |
| Hero copy | `src/components/hero/hero-copy.ts` |
| Design descriptions (one Markdown file per design) | `src/content/designs/<slug>.md` |
| Which renders belong to which design, with alt text and captions | `src/designs/renders.ts` |
| Banned words and phrases for the content audit | `src/content/content-rules.json` |
| Copy approvals | `src/content/APPROVALS.md` |
| Token reference page (not in the sitemap, `noindex`) | `/styleguide/` |
| Building designs, floor plans and the render export | `src/designs/` (see its `README.md`) |
| Every floor plan in both themes, and the A3 review sheet (not in the sitemap, `noindex`) | `/plans-preview/`, `/plans-review/` |
| Logo source material (not shipped) | `brand/source/` |

### Contact details are placeholders

Values in `src/config/site.ts` marked `// PLACEHOLDER(client)` are stand-ins. `npm run build` prints a warning naming each remaining one. To list them, run:

```sh
grep -rn "PLACEHOLDER(client)" src
```

When you replace a value, remove its marker. Don't point the real domain at the site while placeholders remain, because they would appear in search results and structured data.

### WhatsApp messages per page

Each page can set its own prefilled message through `BaseLayout`:

```astro
<BaseLayout title="…" description="…" whatsappMessage="Hello Noor Developers, I am interested in …">
```

Pages that set none use `defaultWhatsAppMessage` from `site.ts`.

### Content rules and the content audit

All copy is English, short and plain, addressed to the visitor as "you". It never mentions prices, availability or sale status, approvals or permits, real projects or schemes, or trust signals (years in business, project counts, testimonials, certifications), and it makes no unprovable claims ("best", "leading").

`npm run build` enforces this: after `astro build`, `scripts/audit-content.mjs` reads every page in `dist/` (visible text, alt and title text, descriptions and share tags, and prefilled WhatsApp messages) and fails the build naming the page, the category and the phrase. The banned list is `src/content/content-rules.json`. If a match is genuinely fine (for example "best suits"), add the exact phrase to `allow` there with a reason. Run the audit on its own with `node scripts/audit-content.mjs`.

### Adding a design or a building type

- **A design:** add it to `src/designs/` (see its README), render its stills into `src/assets/renders/<slug>/` and its share image into `public/og/<slug>.jpg`, list them in `src/designs/renders.ts`, and optionally write `src/content/designs/<slug>.md`. It then appears on `/designs/` and gets its own page, with no page code changes. The build fails if any image it lists is missing.
- **A building type** (an apartment block, say): add an entry to `src/content/building-types.ts`. It appears on the home page and on What We Build in the same layout as the others.

## Launch checklist

Work through this before pointing `noordevelopers.pk` at the site.

- [ ] **Contact details:** replace every `PLACEHOLDER(client)` value in `src/config/site.ts` with the client's real phone, WhatsApp, email, office address, postcode, hours and map location, and remove each marker.
- [ ] **Placeholder warning gone:** `npm run build` no longer prints the `placeholder-check` warning.
- [ ] **Map link:** on `/contact/`, "Open in Google Maps" opens the real office location.
- [ ] **Approvals recorded:** `src/content/APPROVALS.md` has an approval for the hero copy, the About copy and the fully finished checklist, and the client's confirmation of the checklist.
- [ ] **Build passes:** `npm test` and `npm run build` pass, including the content audit.
- [ ] **Buy the domain:** register `noordevelopers.pk` with a PKNIC-accredited registrar.
- [ ] **DNS records:** add the A, AAAA and `www` CNAME records listed under [Custom domain](#custom-domain-noordeveloperspk) below.
- [ ] **Pages custom domain:** in **Settings → Pages → Custom domain**, enter `noordevelopers.pk` and wait for the DNS check to pass.
- [ ] **Enforce HTTPS:** once GitHub has issued the certificate, tick **Enforce HTTPS**.
- [ ] **Share previews:** paste each page URL into a WhatsApp chat (or an Open Graph debugger) and check the title, description and image. Design pages show their own render; other pages show the branded image.
- [ ] **Lighthouse:** run Lighthouse (mobile) on every page of the live site and check Accessibility 100, SEO 100 and Best Practices 95 or above.

### Lighthouse results

Mobile, Lighthouse 12, run against `npm run preview` on 2026-10-31 (local server, so Performance on the live site will differ).

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 |
| `/what-we-build/` | 99 | 100 | 100 | 100 |
| `/designs/` | 100 | 100 | 100 | 100 |
| `/designs/1-kanal/` | 99 | 100 | 100 | 100 |
| `/designs/2-kanal/` | 99 | 100 | 100 | 100 |
| `/designs/commercial/` | 99 | 100 | 100 | 100 |
| `/about/` | 100 | 100 | 100 | 100 |
| `/contact/` | 100 | 100 | 100 | 100 |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. You can also start it manually from the **Actions** tab (**Deploy to GitHub Pages** → **Run workflow**). If the build fails, nothing is deployed and the previous version stays live.

### One-time GitHub setup

1. The repository must be public for free GitHub Pages hosting.
2. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`. The first deploy is served at `https://<user>.github.io/<repo>/`. Assets will look broken there, because the site is built for the domain root with no base path. That is expected.

### Custom domain (`noordevelopers.pk`)

`public/CNAME` already contains `noordevelopers.pk` and is copied into every build.

1. Register `noordevelopers.pk` with a PKNIC-accredited registrar, and use DNS hosting that supports A, AAAA and CNAME records (the registrar's DNS, or a provider such as Cloudflare set as the domain's nameservers).
2. Add these records:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` (apex) | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA (optional, for IPv6) | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
   | CNAME | `www` | `<user>.github.io` |

   If you use Cloudflare, set these records to **DNS only** (grey cloud) so GitHub can issue the certificate.
3. In **Settings → Pages → Custom domain**, enter `noordevelopers.pk` and save. GitHub then checks the DNS, which can take up to 24 hours to propagate.
4. When the certificate has been issued, tick **Enforce HTTPS**.
5. Optionally, verify the domain under your GitHub account's **Settings → Pages → Verified domains** so no other repository can claim it.

### Rollback

Revert the bad commit on `main`, or re-run the workflow from an earlier successful run in the Actions tab.
