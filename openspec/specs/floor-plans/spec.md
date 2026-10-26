## Purpose

Presents each concept design's levels as crisp architectural floor plans in the site's industrial drawing style, readable on any screen and accessible without sight of the drawing.

## Requirements

### Requirement: Architectural drawing content
Each floor plan SHALL show walls as solid filled sections, door openings with swing arcs, windows as thin multi-line symbols, fixed fixtures (kitchen counters, bathroom fittings, built-in wardrobes), stairs with direction arrow, each room's name and dimensions in feet and inches, overall dimension strings for the building, a north arrow, a scale bar and a title (design name and level). Movable furniture SHALL NOT be drawn.

#### Scenario: Reading a room
- **WHEN** a visitor looks at any room on a plan
- **THEN** its name and its width × depth in feet and inches are visible inside it

### Requirement: Concept design labelling
Every floor plan SHALL carry the note "Concept design. Indicative only." in its title area. It SHALL NOT show prices, regulatory references, approval stamps or real project names.

#### Scenario: Plan title block
- **WHEN** any floor plan is displayed
- **THEN** its title block shows the design name, level name and the concept design note

### Requirement: Build-time generation
Floor plans SHALL be generated as inline SVG when the site is built. No client-side script SHALL be needed to display them.

#### Scenario: JavaScript disabled
- **WHEN** a design page is viewed with JavaScript disabled
- **THEN** all floor plans are fully visible

### Requirement: Themed drawing style
Plans SHALL be available in a dark style (light linework on near-black, blueprint-like) and a light style (dark linework on off-white), using only design-system colors and the monospace face for labels, with the accent color reserved for highlights such as the north arrow or a selected room.

#### Scenario: Plan on a dark section
- **WHEN** a plan is placed in a dark section
- **THEN** it uses the dark style and its labels meet AA contrast

### Requirement: Legible on small screens
On narrow screens a plan SHALL keep labels at a readable size by rendering at a minimum drawing width inside a horizontally scrollable region, with a visible hint that it can be scrolled. A larger view SHALL be available.

#### Scenario: Plan on a 390px phone
- **WHEN** a plan is viewed on a 390px-wide screen
- **THEN** room labels are at least 11 CSS px tall, and the visitor can scroll the plan sideways or open a larger view

### Requirement: Accessible alternative
Each plan SHALL have an accessible name (design and level) and be followed by a text room schedule listing every room with its dimensions.

#### Scenario: Screen reader user
- **WHEN** a screen reader user reaches a floor plan
- **THEN** they hear the plan's name and can read the room schedule as a table
