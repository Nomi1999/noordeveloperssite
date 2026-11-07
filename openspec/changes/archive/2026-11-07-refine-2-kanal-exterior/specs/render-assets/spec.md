## ADDED Requirements

### Requirement: Refined 2 Kanal stills
The 2 Kanal's four stills and its share image SHALL be replaced with AI-enhanced stills made from fast renders of the refined exterior, keeping each shot's camera except `front-dusk`. That camera moves to a more frontal view, which the maintainer chose after the model redrew the angled view as a frontal one on every attempt. A shot MAY leave out a plot edge's boundary, and that edge's gates are then left out too. The 2 Kanal SHALL also have a `street-open` shot without its front boundary, so that the ground floor can be reviewed unobstructed. The maintainer SHALL approve the source renders before any image model call, and SHALL approve each still beside its source before delivery. Replacing them SHALL NOT change the delivered stills or share images of any other design, or the hero's video and posters.

#### Scenario: Sources approved first
- **WHEN** the 2 Kanal's stills are generated
- **THEN** the maintainer has already approved all four source renders

#### Scenario: Stills approved
- **WHEN** the 2 Kanal's stills are delivered
- **THEN** the maintainer has approved each one beside its source, and the Render content rules hold

#### Scenario: Other images untouched
- **WHEN** the refined 2 Kanal stills have been delivered
- **THEN** the stills and share images of the 1 Kanal, 5 Marla and 10 Marla, and every file under `public/hero/`, are byte-identical to before
