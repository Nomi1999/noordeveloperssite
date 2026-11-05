## MODIFIED Requirements

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
