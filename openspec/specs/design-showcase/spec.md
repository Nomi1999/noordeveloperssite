## Purpose

Shows Noor Developers' concept designs, with renders, facts and floor plans, as proof of what they can build, and turns interest in a design into a call or WhatsApp message.

## Requirements

### Requirement: Designs index
`/designs/` SHALL list every design in the design registry as a card with its primary render, name, kind, plot size and two or three key facts. Every card SHALL be labelled as a concept design. The cards SHALL fill the width of the page, with no empty column beside them, when the registry holds an even number of designs. The index SHALL list the designs in the order 1 Kanal, 2 Kanal, 5 Marla, 10 Marla.

#### Scenario: New design added
- **WHEN** a new design is added to the registry with its renders
- **THEN** it appears on the index and gets its own detail page with no page code changes

#### Scenario: Two designs on a wide screen
- **WHEN** a visitor opens `/designs/` on a wide screen with two designs in the registry
- **THEN** the two cards sit side by side and fill the width of the page

#### Scenario: Four designs on a wide screen
- **WHEN** a visitor opens `/designs/` on a wide screen with four designs in the registry
- **THEN** the cards sit in two rows of two that fill the width of the page, with the Kanal houses in the first row and the Marla houses in the second

### Requirement: Design detail page
Each design SHALL have a page at `/designs/<slug>/` with:
- a large lead render;
- a gallery of its other renders;
- a key facts panel computed from design data (plot size, covered area, storeys, plus bedrooms and bathrooms for houses);
- floor plans for every level;
- the fully finished checklist;
- a call-to-action section.

The page SHALL state that the design is a concept and can be built on the visitor's own plot or adapted to it.

#### Scenario: Facts match the design
- **WHEN** a design's data changes
- **THEN** its facts panel and floor plans update after rebuild without editing the page

### Requirement: Level switcher
Floor plans SHALL be presented with one level visible at a time and a control to switch levels, labelled by level name. Without JavaScript, all levels SHALL be shown one after another.

#### Scenario: Switching levels
- **WHEN** a visitor selects "First floor"
- **THEN** the first floor plan and its room schedule are shown, and the control marks it as selected for assistive technology

### Requirement: Render gallery
Selecting a gallery image SHALL open it large in an accessible dialog that can be closed with Escape or a close button, with focus returned to the selected image. Without JavaScript, selecting an image SHALL open the full-size image directly.

#### Scenario: Keyboard gallery use
- **WHEN** a keyboard user opens a gallery image and presses Escape
- **THEN** the dialog closes and focus returns to that image

### Requirement: Design-specific actions
The Call and WhatsApp actions on a design page, including the sticky mobile bar, SHALL use a prefilled WhatsApp message naming that design. Each design page SHALL use that design's share image.

#### Scenario: WhatsApp from the 2 Kanal page
- **WHEN** the visitor uses WhatsApp on `/designs/2-kanal/`
- **THEN** the prefilled message names the 2 Kanal design
