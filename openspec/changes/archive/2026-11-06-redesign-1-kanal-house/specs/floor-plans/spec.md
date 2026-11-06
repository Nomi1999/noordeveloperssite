## ADDED Requirements

### Requirement: Plot outline on the plan
A floor plan SHALL draw the plot line and the boundary walls along the design's real plot outline, including any slanted edge or cut corner.

#### Scenario: Five-sided plot
- **WHEN** a plan of a design with a five-sided plot is viewed
- **THEN** the plot line shows all five edges, and the boundary wall follows them

#### Scenario: Rectangular plot unchanged
- **WHEN** a plan of a design with a rectangular plot is generated
- **THEN** its plot line is the same rectangle as before

### Requirement: L-shaped and spiral stairs on the plan
L-shaped and spiral stairs SHALL be drawn with their treads and a direction arrow, in the same style as other stairs.

#### Scenario: Spiral stair
- **WHEN** a plan containing a spiral stair is viewed
- **THEN** its radial treads and its direction of travel are visible
