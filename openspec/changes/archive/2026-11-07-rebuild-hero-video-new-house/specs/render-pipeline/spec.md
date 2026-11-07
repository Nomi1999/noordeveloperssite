## MODIFIED Requirements

### Requirement: Boundary hiding per shot
A shot MAY name plot sides whose boundary wall is left out of that shot, leaving a low kerb in its place. A keyed sequence MAY do the same, and the named sides SHALL then be left out of every one of its frames. Other shots of the design SHALL still show the wall.

#### Scenario: Open facade view
- **WHEN** a shot names the front and right sides
- **THEN** the facade and planting are seen over a low kerb on those sides, and a shot naming no sides shows the full boundary wall

#### Scenario: Open sequence
- **WHEN** a sequence config names sides to hide
- **THEN** every frame leaves those sides out, and the design's still shots are unaffected

#### Scenario: Sequence naming no sides
- **WHEN** a sequence config names no sides to hide
- **THEN** its frames show the full boundary wall

## ADDED Requirements

### Requirement: Sequence context overrides
A keyed sequence MAY override scene context settings such as the front road's width, in the same form as a still shot. The override SHALL apply to every frame of that sequence and SHALL NOT change any other shot or sequence.

#### Scenario: Camera on a wider road
- **WHEN** a sequence ends on a still's camera and that still widens the front road
- **THEN** the sequence can name the same width, and its last frame shows the same road and the same neighbours as the still
