## ADDED Requirements

### Requirement: Refined 5 Marla stills
The 5 Marla's four stills and its share image SHALL be replaced with AI-enhanced stills made from fast renders of the refined exterior, keeping every shot's camera. The maintainer SHALL approve the source renders before any image model call, and SHALL approve each still beside its source before delivery. Each still's alt text SHALL describe the delivered facade, with no mention of brick. Replacing them SHALL NOT change the delivered stills or share images of any other design, or the hero's video and posters.

#### Scenario: Sources approved first
- **WHEN** the 5 Marla's stills are generated
- **THEN** the maintainer has already approved all four source renders

#### Scenario: Stills approved
- **WHEN** the 5 Marla's stills are delivered
- **THEN** the maintainer has approved each one beside its source, and the render content rules hold

#### Scenario: Other images untouched
- **WHEN** the refined 5 Marla stills have been delivered
- **THEN** the stills and share images of the 1 Kanal, 2 Kanal and 10 Marla, and every file under `public/hero/`, are byte-identical to before
