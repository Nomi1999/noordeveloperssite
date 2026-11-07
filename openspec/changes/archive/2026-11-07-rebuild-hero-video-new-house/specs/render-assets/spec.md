## MODIFIED Requirements

### Requirement: Still set per design
The pipeline SHALL deliver these finished-building stills.

| Design | Stills |
|---|---|
| 1 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial, side-street view |
| 2 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 5 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 10 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |

Each still SHALL be delivered in 16:9 into the site's asset folder, so the site can generate responsive sizes. A still encoded straight from a render SHALL be at least 3200px wide; an AI-enhanced still (see below) SHALL be delivered at the model's full output size, at least 2048px wide. Neither is upscaled. Replacing the 1 Kanal stills SHALL NOT change the delivered stills of the other designs, or the hero's video and posters. Rebuilding the hero SHALL NOT change any delivered still or share image.

#### Scenario: Stills delivered
- **WHEN** the still set has been rendered and encoded
- **THEN** every listed still exists in the site asset folder at 3200px wide or more (2048px or more if AI-enhanced) and is used without upscaling

#### Scenario: Older stills untouched
- **WHEN** the new 1 Kanal stills have been delivered
- **THEN** the 2 Kanal, 5 Marla and 10 Marla still files are byte-identical to before

#### Scenario: Hero untouched
- **WHEN** the new 1 Kanal stills have been delivered
- **THEN** every file under `public/hero/` is byte-identical to before

#### Scenario: Stills untouched by the hero
- **WHEN** the rebuilt hero has been delivered
- **THEN** every still and share image of every design is byte-identical to before

### Requirement: Enhanced stills keep the facade lighting
An AI-enhanced still or hero poster of a design with facade lighting SHALL keep that lighting as rendered: the same strips, wall lights and downlights in the same places. The instruction against adding exterior lights SHALL remain in force for designs without facade lighting, and no enhanced image SHALL add lights its source does not show. The 1 Kanal's source renders SHALL be fast renders, not earlier final renders, and they SHALL be compared with the maintainer's elevation renders before any image call is made.

#### Scenario: 1 Kanal dusk still reviewed
- **WHEN** an enhanced dusk still of the 1 Kanal is compared side by side with its source
- **THEN** its strips, wall lights and downlights match the source in number and position

#### Scenario: Sources approved first
- **WHEN** the 1 Kanal's source renders exist and the maintainer has not yet approved them beside the elevation renders
- **THEN** no image call is made for them

#### Scenario: Hero poster reviewed
- **WHEN** a hero poster is compared side by side with its last frame
- **THEN** its strips, wall lights and downlights match the frame in number and position

## ADDED Requirements

### Requirement: Hero posters match the last frame
Each orientation's hero poster SHALL be that orientation's delivered video's own last frame, encoded with no image model and no design edit, with its largest size matching the video's frame size, so that the cross-fade from video to poster shows no visible jump. Changing the hero posters SHALL NOT change the prompt of any still.

#### Scenario: Cross-fade at the end of the video
- **WHEN** the video reaches its last frame and fades to the poster
- **THEN** the house stays in the same place at the same size through the fade

#### Scenario: Nothing added
- **WHEN** a hero poster is compared with the video's last frame
- **THEN** it shows only what that frame shows

#### Scenario: Still prompts unchanged
- **WHEN** the prompts for every still are compared before and after this change
- **THEN** they are byte-identical
