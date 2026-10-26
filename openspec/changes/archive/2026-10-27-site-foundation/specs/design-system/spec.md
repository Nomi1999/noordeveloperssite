## Purpose

Defines the shared visual language of the Noor Developers site (color, typography, spacing and motion) so every page reads as one bold, industrial brand and stays accessible.

## ADDED Requirements

### Requirement: Single source of design tokens
The site SHALL define all brand colors, font families, type scale, spacing scale and motion durations as named tokens in one place, and components SHALL use these tokens instead of literal values.

#### Scenario: Changing the accent color
- **WHEN** the accent color token is changed in the token source
- **THEN** every accent usage across all pages updates without editing any component

### Requirement: Brand palette
The palette SHALL consist of a near-black, a range of warm (not blue-tinted) concrete greys, an off-white, and exactly one warm amber/gold accent representing light. No other hues SHALL be used for UI elements.

#### Scenario: Palette audit
- **WHEN** the built CSS is inspected for color values
- **THEN** every color resolves to a palette token

### Requirement: Text contrast
All body text and interactive labels SHALL meet WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large text) against the background they sit on.

#### Scenario: Accent used for text
- **WHEN** the accent color is used for text or a button label
- **THEN** the foreground/background pair meets the AA ratio for that text size

### Requirement: Typography roles
The site SHALL use three type roles: a heavy condensed display face for headings, a readable sans-serif for body text, and a monospace face for labels, specifications and dimension annotations. Fonts SHALL be served from the site's own origin.

#### Scenario: Fonts load without third-party requests
- **WHEN** any page loads
- **THEN** no font is requested from a domain other than the site's own

#### Scenario: Font fallback
- **WHEN** a web font has not loaded yet
- **THEN** text is visible immediately in a fallback font

### Requirement: Reduced motion
Every non-essential animation and transition SHALL be disabled or reduced to an instant change when the visitor's system requests reduced motion.

#### Scenario: Visitor prefers reduced motion
- **WHEN** the operating system's reduced-motion setting is on
- **THEN** no element animates position, scale or opacity over time

### Requirement: Responsive layout
Every page SHALL render without horizontal scrolling from 320px viewport width upward, with at least 16px side gutters on small screens.

#### Scenario: Smallest supported phone
- **WHEN** a page is viewed at 320px wide
- **THEN** no content overflows horizontally and text remains readable without zooming
