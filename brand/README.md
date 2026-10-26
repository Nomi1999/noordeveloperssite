# Brand

Polished vector redraw of the Noor Developers logo. Same structure as the original; no new elements.

| Path | What |
| --- | --- |
| `source/logo-traced.svg` | Original auto-trace. Reference only, never shipped. |
| `master/` | Hand-built geometry on a 1000-unit grid (same grid as the 2000px render of the original). |
| `scripts/` | `npm run brand:build` regenerates `master/` and every output below. |
| `dist/` | Logo family SVGs and icons (copied into `src/assets/brand/` and `public/`). |
| `review/` | Before/after sheet, overlays, font comparison. |

## Build
`npm run brand:build` = `make-mark` (houses, arc, monogram) + `make-type` (wordmark, tagline) + `build-logo`
(lockups, icons, manifest) + `check-mark` (symmetry and arc checks).

## Usage notes
- Lockups: `stacked`, `horizontal` (two-line wordmark), `mark`, `monogram`; each single-color (`currentColor`) and `-accent`
  (monogram in `var(--noor)`).
- Below 24px tall use the monogram only. Omit the tagline when its cap height would be under 9px.
- Icons use the monogram in amber on ink. Favicon sizes use heavier-stroke cuts (`monogram-bold`, `monogram-xs`)
  because the full-weight ribbons turn to mush at 16-32px.
- Wordmark font: Big Shoulders Display (see `review/wordmark-winner.md`); it is also the site's display font.

## Deliberate differences from the original
- Right-hand house is an exact mirror of the left (the original was about 25 units off).
- Chimney moved ~28 units left so it still sits on the centre roof after mirroring.
- Monogram centred on the axis (it was 7.5 units right).
- Wordmark and tagline outlined from Big Shoulders Display with even tracking.

## Sign-off
Status: **approved by the maintainer on 2026-10-27** (reviewed `review/sheet.png`; no tweaks requested).
