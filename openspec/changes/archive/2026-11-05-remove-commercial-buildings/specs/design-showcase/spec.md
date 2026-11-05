## MODIFIED Requirements

### Requirement: Designs index
`/designs/` SHALL list every design in the design registry as a card with its primary render, name, kind, plot size and two or three key facts. Every card SHALL be labelled as a concept design. The cards SHALL fill the width of the page, with no empty column beside them, when the registry holds two designs.

#### Scenario: New design added
- **WHEN** a new design is added to the registry with its renders
- **THEN** it appears on the index and gets its own detail page with no page code changes

#### Scenario: Two designs on a wide screen
- **WHEN** a visitor opens `/designs/` on a wide screen with two designs in the registry
- **THEN** the two cards sit side by side and fill the width of the page

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
