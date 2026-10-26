## Purpose

Provides the shared frame of every page (header, navigation, footer, 404 page and the route map) so content changes can add pages without reworking the site structure.

## ADDED Requirements

### Requirement: Route map
The site SHALL serve the following routes: `/`, `/what-we-build`, `/designs`, `/designs/1-kanal`, `/designs/2-kanal`, `/designs/commercial`, `/about` and `/contact`. Until real content exists, each non-home route SHALL render a placeholder page inside the shared layout.

#### Scenario: Visiting a planned route
- **WHEN** a visitor opens any route in the route map
- **THEN** the page loads with the shared header and footer and a page title

### Requirement: Header and navigation
Every page SHALL show a header containing the company logo linking to `/` and navigation links to What We Build, Designs, About and Contact. On narrow screens the navigation SHALL collapse into a menu toggle that is operable by keyboard and screen readers.

#### Scenario: Current page indication
- **WHEN** a visitor is on a page linked from the navigation
- **THEN** that link is visually marked as current and exposes `aria-current="page"`

#### Scenario: Mobile menu
- **WHEN** a visitor on a narrow screen activates the menu toggle
- **THEN** the navigation links become visible, focus moves into the menu, and the toggle reports its expanded state

#### Scenario: Closing the mobile menu
- **WHEN** the mobile menu is open and the visitor presses Escape
- **THEN** the menu closes and focus returns to the toggle

### Requirement: Footer
Every page SHALL show a footer with the company name, tagline, the contact details from the contact configuration, Call and WhatsApp actions, and the current year in the copyright line. The footer SHALL NOT contain social links, prices, certifications, statistics or regulatory content.

#### Scenario: Footer contact details
- **WHEN** the contact configuration changes
- **THEN** the footer on every page shows the new details after rebuild

### Requirement: Branded 404 page
Requests for unknown paths SHALL return a 404 page in the site's design that links back to the home page and offers Call and WhatsApp actions.

#### Scenario: Unknown path
- **WHEN** a visitor opens a path that does not exist
- **THEN** the branded 404 page is shown with a link to `/`

### Requirement: Skip link and landmarks
Every page SHALL provide a "skip to content" link as the first focusable element and use header, nav, main and footer landmarks.

#### Scenario: Keyboard user skips navigation
- **WHEN** a keyboard user presses Tab once on page load and activates the skip link
- **THEN** focus moves to the start of the main content
