## 1. Reference and measurement

- [x] 1.1 Render `brand/source/logo-traced.svg` at 2000px with headless Chrome to `brand/review/original.png`; verify the PNG shows the full logo uncropped
- [x] 1.2 Measure and record key coordinates on a 1000-unit grid (apexes, eaves, wall edges, chimney, arc endpoints and sag, monogram bounds, wordmark and tagline baselines and cap heights) in `brand/master/measurements.md`; verify by plotting the points over the original render

## 2. Master geometry

- [x] 2.1 Draw the left flanking house and center house with chimney as clean polygons in `brand/master/mark.svg`, generate the right house by mirroring, and flatten; verify the symmetry check (mirrored left house coincides with the right) and the overlay against the original
- [x] 2.2 Draw the ground arc as a single symmetric cubic path; verify it overlays the original arc within 1% of logo width
- [x] 2.3 Rebuild the ND monogram with uniform stroke width and consistent corners, expanded to fills; verify the overlay against the original and legibility at 32px

## 3. Wordmark and tagline

- [x] 3.1 Build an overlay comparison of the original wordmark against Barlow Condensed, Saira Extra Condensed, Antonio, Teko, Oswald and Big Shoulders Display; verify a winner is chosen and recorded with its overlay image in `brand/review/`
- [x] 3.2 Set "NOOR DEVELOPERS" and "BUILDING THE FUTURE" in the chosen family with even tracking, outline them with `opentype.js` into `brand/master/`, and apply any manual glyph corrections; verify there are no `<text>` elements and both lines are centered on the mark axis
- [x] 3.3 If the chosen family is not Barlow Condensed, switch the display font token and package and re-check headings on `/styleguide/`; verify the build passes and fonts are self-hosted

## 4. Logo family and icons

- [x] 4.1 Write `brand/scripts/build-logo.mjs` composing stacked, horizontal, mark and monogram lockups (single-color and accent) and optimizing them with `svgo`; verify each output is under 20 KB with no `<image>`, `<text>` or background rect
- [x] 4.2 Extend the script to produce `favicon.svg`, `favicon.ico` (16/32), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` and `site.webmanifest`; verify the icons are crisp at 16px and 32px and that the 512 icon survives a circular maskable crop
- [x] 4.3 Add an npm script `brand:build` and confirm it regenerates every output from the master; verify a change to the master shows up in all variants after one run

## 5. Review

- [x] 5.1 Build `brand/review/sheet.html` (original vs redraw, overlay, variants on ink/paper/concrete, icon sizes) and render it to PNG; verify it opens and shows everything listed
- [x] 5.2 Present the sheet to the maintainer and record approval (or requested tweaks, applied and re-rendered) in `brand/README.md`; verify approval is recorded before section 6

## 6. Site integration

- [x] 6.1 Create `Logo.astro` (props `variant`, `accent`; inline SVG, `aria-hidden`) and use it in the header (horizontal) and footer (stacked, horizontal on narrow screens) with link name "Noor Developers home"; verify with a screen reader or accessibility tree and at 320px width
- [x] 6.2 Add favicon, apple-touch-icon and manifest links to the layout head; verify in Chrome and Safari tabs and with the Lighthouse installability/icon checks
- [x] 6.3 Regenerate `public/og-default.png` with the stacked lockup on ink; verify 1200×630 and a WhatsApp/Facebook debugger-style preview render
- [x] 6.4 Verify `brand/source/logo-traced.svg` is absent from `dist/`, and that `npm run build` passes
