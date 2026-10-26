## Purpose

Defines Noor Developers' logo family, a polished redraw of the original traced logo, and how it is used across the site and on browser and device icons.

## Requirements

### Requirement: Structural fidelity to the original logo
The redrawn logo SHALL keep every element of the original and their arrangement: a central gabled house with a chimney on its right roof slope, two smaller gabled houses flanking it as mirror images, the "ND" monogram with rising building bars inside the central house, a ground arc spanning beneath the houses, the "NOOR DEVELOPERS" wordmark below, and the "BUILDING THE FUTURE" tagline below that. No element SHALL be added or removed.

#### Scenario: Overlay comparison
- **WHEN** the redrawn stacked lockup is overlaid on a render of the original at the same scale
- **THEN** every element is in the same position and proportion, and the only visible differences are cleaned edges, symmetry and spacing corrections

#### Scenario: Client sign-off
- **WHEN** the redraw is complete
- **THEN** a side-by-side before/after sheet exists, and the maintainer has approved it before the site uses the new logo

### Requirement: Clean vector construction
Every logo file SHALL be pure vector with a transparent background, no embedded raster images, no text elements that depend on installed fonts (text is outlined), a single fill color per variant, and a file size under 20 KB.

#### Scenario: File inspection
- **WHEN** any logo SVG is inspected
- **THEN** it contains no `<image>`, no `<text>`, no background rectangle, no inline styles beyond fills, and is under 20 KB

### Requirement: Geometric polish
The two flanking houses SHALL be exact mirror images about the logo's vertical center axis. Roof edges SHALL be straight lines, strokes of the same role SHALL share one width, and the wordmark and tagline SHALL have even letter spacing and be horizontally centered on the mark.

#### Scenario: Symmetry check
- **WHEN** the left flanking house is mirrored across the center axis
- **THEN** it coincides with the right flanking house

### Requirement: Logo family
The brand SHALL provide four lockups: stacked (mark above wordmark and tagline), horizontal (mark beside wordmark, tagline optional), mark only (houses, monogram and arc), and monogram only. Each lockup SHALL exist in a single-color version that inherits the current text color, and in an accent version where only the monogram uses the brand accent color.

#### Scenario: Recoloring with CSS
- **WHEN** a single-color logo is placed inline in an element whose text color is changed
- **THEN** the whole logo takes that color

#### Scenario: Accent version on dark background
- **WHEN** the accent version is shown on the near-black background
- **THEN** the monogram is in the accent color and everything else is in the off-white

### Requirement: Small-size legibility
At small sizes the site SHALL switch to a simpler lockup instead of shrinking detail. Below 24px tall, only the monogram SHALL be used. The tagline SHALL be omitted wherever it would render smaller than 9px cap height.

#### Scenario: Browser tab
- **WHEN** the site is open in a browser tab
- **THEN** the favicon shows the monogram, crisp at 16px and 32px

### Requirement: Icon set
The site SHALL provide an SVG favicon, a multi-size ICO fallback (16 and 32px), a 180px Apple touch icon, and 192px and 512px icons referenced from a web app manifest. All of them SHALL be built from the monogram on a solid brand background with safe padding.

#### Scenario: Add to home screen
- **WHEN** a visitor adds the site to a phone home screen
- **THEN** the icon shows the monogram on the brand background, uncropped

### Requirement: Site usage
The header SHALL show the horizontal lockup and the footer SHALL show the stacked lockup (or horizontal on narrow screens). The logo link SHALL have the accessible name "Noor Developers home". The default share image SHALL show the real logo.

#### Scenario: Screen reader on the header logo
- **WHEN** a screen reader focuses the header logo link
- **THEN** it announces "Noor Developers home" and not the SVG's internals

#### Scenario: Original never shipped
- **WHEN** the production build output is inspected
- **THEN** the traced original logo file is not present
