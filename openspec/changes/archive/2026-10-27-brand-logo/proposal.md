## Why

The only logo Noor Developers have is an automatic trace of a raster image: 1 MB, 1,511 paths, dozens of grey shades from antialiasing, wobbly edges and a baked-in white background. It can't be used on the dark, bold pages of the site, as a favicon, or in share images. The client wants the same logo polished, not replaced.

## What Changes

- Redraw the logo as clean vector geometry with the same structure: three roof silhouettes with the chimney, the "ND" monogram with rising building bars, the ground arc, the "NOOR DEVELOPERS" wordmark and the "BUILDING THE FUTURE" tagline.
- Polish only: true mirror symmetry for the side houses, straight edges, consistent stroke weights, even letter spacing. No new elements.
- Produce a logo family: stacked lockup (the original layout), horizontal lockup, mark only, and monogram only, each in single-color and accent versions.
- Generate favicons and app icons from the monogram.
- Replace the site's temporary text wordmark in the header and footer with the horizontal lockup, and regenerate the default share image with the real logo.
- Keep the traced original as reference material only. It is never shipped.

## Capabilities

### New Capabilities
- `brand-identity`: the logo family (geometry, variants, colors, file properties), icon set, and how the logo appears on the site.

### Modified Capabilities
<!-- None. site-shell already requires "the company logo" in the header; this change supplies it. -->

## Impact

- New `brand/` directory: source SVGs, the logo build script, and a review sheet.
- New site assets: logo SVGs used by the header and footer, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, 192/512 icons, `site.webmanifest`, and a regenerated `og-default.png`.
- Dev dependencies for outlining text and rasterizing icons (`opentype.js`, `svgo`, `sharp`).
- May change the display font token if the wordmark's closest open-license match turns out not to be Barlow Condensed.
- Depends on `site-foundation` (header, footer, tokens).
