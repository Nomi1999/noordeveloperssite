## ADDED Requirements

### Requirement: Fast source renders for enhancement
The pipeline SHALL provide one command that renders every still of a named design at 2048px wide with the fast engine, as source images for AI enhancement, skipping any that already exist. It SHALL NOT need Cycles or a dedicated GPU.

#### Scenario: Rendering a design's sources
- **WHEN** the maintainer runs the command for the 5 Marla design
- **THEN** its four shots are written to the render output folder at 2048px wide without opening Blender's window

#### Scenario: Re-running after an interruption
- **WHEN** the command is run again after two of the four shots were written
- **THEN** only the two missing shots are rendered

### Requirement: Neighbouring context fits the plot
Generated neighbouring houses SHALL be sized from the design's plot, so that each stays inside its own plot on any plot from 5 Marla to 2 Kanal. On a side where the design stands on the plot line, the neighbouring house SHALL also stand on the plot line, with no gap. Neighbouring houses SHALL fill the frame of every shot of a design, on small plots as well as large ones. The neighbours of the 1 Kanal and 2 Kanal houses SHALL be unchanged.

#### Scenario: Neighbours on a shallow plot
- **WHEN** the 5 Marla scene is built
- **THEN** no neighbouring house extends past the rear of its plot

#### Scenario: Attached house
- **WHEN** a shot of the 5 Marla house is rendered
- **THEN** the neighbouring houses meet it on both sides with no visible gap

#### Scenario: Existing designs unaffected
- **WHEN** the 1 Kanal scene is built before and after this change
- **THEN** its neighbouring houses have the same positions and sizes
