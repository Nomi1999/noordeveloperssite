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
| `npm run build` | Build the production site into `dist/`, warn about any placeholder contact details, and fail if a building design breaks a geometric rule |
| `npm run preview` | Serve `dist/` locally at `http://localhost:4321/`, exactly as it will be deployed (unknown paths show the 404 page) |
| `npm test` | Run the unit tests (design model, geometry, validation, floor plans, render export) and check that prefilled WhatsApp messages survive URL encoding |
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
| Pages (one file per route) | `src/pages/` |
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
