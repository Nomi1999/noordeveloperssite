## MODIFIED Requirements

### Requirement: Neighbouring context fits the plot
Generated neighbouring houses SHALL be sized from the design's plot, so that each stays inside its own plot on any plot from 5 Marla to 2 Kanal. On a side where the design stands on the plot line, the neighbouring house SHALL also stand on the plot line, with no gap. Neighbouring houses SHALL fill the frame of every shot of a design, on small plots as well as large ones, except where a street runs along that side. The neighbours of the 2 Kanal, 5 Marla and 10 Marla houses SHALL be unchanged.

#### Scenario: Neighbours on a shallow plot
- **WHEN** the 5 Marla scene is built
- **THEN** no neighbouring house extends past the rear of its plot

#### Scenario: Attached house
- **WHEN** a shot of the 5 Marla house is rendered
- **THEN** the neighbouring houses meet it on both sides with no visible gap

#### Scenario: Existing designs unaffected
- **WHEN** the 2 Kanal scene is built before and after this change
- **THEN** its neighbouring houses have the same positions and sizes

## ADDED Requirements

### Requirement: Plot outline in the scene
The plot ground, its landscaping and its boundary walls SHALL follow the design's plot outline, including slanted edges and cut corners, with no gaps at the corners.

#### Scenario: Cut corner
- **WHEN** the aerial shot of a design with a cut corner is rendered
- **THEN** the boundary wall follows the cut and the ground beyond it is street, not plot

### Requirement: Corner street
A design's render context MAY declare a street along its right side. The scene SHALL then build a road and footpaths along that side, joined to the front street, with no neighbouring house on that side or between the plot and the street.

#### Scenario: Side view
- **WHEN** the side-street shot of a corner design is rendered
- **THEN** the side facade and side boundary wall are seen across an open road, with no house in the way

#### Scenario: Other designs
- **WHEN** a design declares no side street
- **THEN** its scene has the front street only, as before

### Requirement: Dusk facade lighting
Facade elements MAY be declared as LED strips, wall lights or wall-wash downlights. LED strips SHALL glow, wall lights SHALL throw light both up and down the wall behind them, and wall-wash downlights SHALL leave scallops of light on the wall below. All SHALL be off by day and SHALL fade in together with the interior lights, and they SHALL NOT appear before the finishes in the construction phases.

#### Scenario: Dusk still
- **WHEN** the 1 Kanal is rendered at dusk
- **THEN** the LED lines glow on the pier and the feature wall, the wall lights make up-and-down cones of light, and the soffit downlights are lit

#### Scenario: Day still
- **WHEN** the 1 Kanal is rendered by day
- **THEN** none of these lights is lit, and the fittings read as dark metal or unlit strips

### Requirement: Boundary hiding per shot
A shot MAY name plot sides whose boundary wall is left out of that shot, leaving a low kerb in its place. Other shots of the design SHALL still show the wall.

#### Scenario: Open facade view
- **WHEN** a shot names the front and right sides
- **THEN** the facade and planting are seen over a low kerb on those sides, and a shot naming no sides shows the full boundary wall
