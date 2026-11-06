## MODIFIED Requirements

### Requirement: Still set per design
The pipeline SHALL deliver these finished-building stills.

| Design | Stills |
|---|---|
| 1 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial, side-street view |
| 2 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 5 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 10 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |

Each still SHALL be delivered in 16:9 into the site's asset folder, so the site can generate responsive sizes. A still encoded straight from a render SHALL be at least 3200px wide; an AI-enhanced still (see below) SHALL be delivered at the model's full output size, at least 2048px wide. Neither is upscaled. Replacing the 1 Kanal stills SHALL NOT change the delivered stills of the other designs, or the hero's video and posters.

#### Scenario: Stills delivered
- **WHEN** the still set has been rendered and encoded
- **THEN** every listed still exists in the site asset folder at 3200px wide or more (2048px or more if AI-enhanced) and is used without upscaling

#### Scenario: Older stills untouched
- **WHEN** the new 1 Kanal stills have been delivered
- **THEN** the 2 Kanal, 5 Marla and 10 Marla still files are byte-identical to before

#### Scenario: Hero untouched
- **WHEN** the new 1 Kanal stills have been delivered
- **THEN** every file under `public/hero/` is byte-identical to before

## ADDED Requirements

### Requirement: Enhanced stills keep the facade lighting
An AI-enhanced still of a design with facade lighting SHALL keep that lighting as rendered: the same strips, wall lights and downlights in the same places. The instruction against adding exterior lights SHALL remain in force for designs without facade lighting, and no enhanced still SHALL add lights its source does not show. The 1 Kanal's source renders SHALL be fast renders, not earlier final renders, and they SHALL be compared with the maintainer's elevation renders before any image call is made.

#### Scenario: 1 Kanal dusk still reviewed
- **WHEN** an enhanced dusk still of the 1 Kanal is compared side by side with its source
- **THEN** its strips, wall lights and downlights match the source in number and position

#### Scenario: Sources approved first
- **WHEN** the 1 Kanal's source renders exist and the maintainer has not yet approved them beside the elevation renders
- **THEN** no image call is made for them
