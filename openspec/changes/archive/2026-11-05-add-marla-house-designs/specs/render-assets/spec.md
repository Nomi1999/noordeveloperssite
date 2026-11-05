## MODIFIED Requirements

### Requirement: Still set per design
The pipeline SHALL deliver these finished-building stills.

| Design | Stills |
|---|---|
| 1 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 2 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 5 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 10 Marla | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |

Each still SHALL be delivered in 16:9 into the site's asset folder, so the site can generate responsive sizes. A still encoded straight from a render SHALL be at least 3200px wide; an AI-enhanced still (see below) SHALL be delivered at the model's full output size, at least 2048px wide. Neither is upscaled. Adding the 5 Marla and 10 Marla stills SHALL NOT change the delivered stills of the 1 Kanal and 2 Kanal houses.

#### Scenario: Stills delivered
- **WHEN** the still set has been rendered and encoded
- **THEN** every listed still exists in the site asset folder at 3200px wide or more (2048px or more if AI-enhanced) and is used without upscaling

#### Scenario: Older stills untouched
- **WHEN** the 5 Marla and 10 Marla stills have been delivered
- **THEN** the 1 Kanal and 2 Kanal still files are byte-identical to before

### Requirement: AI-enhanced stills
A still or the hero's opening poster MAY be replaced by a photoreal version made by an image model from Noor's own render of the same shot (`scripts/enhance-renders.mjs`). The source render MAY be a fast render at 2048px or wider. The model SHALL be the one named on the command line or, failing that, by `IMAGE_MODEL` in the environment or `.env`; with neither set, the script SHALL stop and say so. The script SHALL always read the source render, never a previously enhanced image, and SHALL act only on the shots or designs it is told to. It SHALL keep the render's design, camera, framing and time of day, apart from design changes the maintainer has asked for, which the script records in `DESIGN_EDITS`. It SHALL still be presented as a concept, never as a photograph of built work. The Render content rules apply to it.

#### Scenario: Enhanced still reviewed
- **WHEN** an AI-enhanced still is reviewed before delivery
- **THEN** it is compared side by side with its source render, and the design, framing and time of day match apart from the recorded design changes

#### Scenario: No model configured
- **WHEN** the script is run with no model on the command line and no `IMAGE_MODEL` set
- **THEN** it stops before making any call and names the setting it needs

#### Scenario: Source render missing
- **WHEN** a shot is requested and its source render does not exist
- **THEN** that shot fails with a message naming the render command, no call is made for it, and the script does not fall back to the delivered still

#### Scenario: No shots named
- **WHEN** the generate or encode command is run without naming any shots or designs
- **THEN** it stops and changes no images
