## Purpose

Defines the rendered imagery the site ships (stills, share images and encoded frame sequences with their manifest) and the content rules every render follows.

## Requirements

### Requirement: Still set per design
The pipeline SHALL deliver these finished-building stills.

| Design | Stills |
|---|---|
| 1 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| 2 Kanal | front three-quarter day, front three-quarter dusk, street-level eye view, elevated aerial |
| Commercial plaza | street view day, street view dusk, elevated corner view |

Each still SHALL be delivered in 16:9 into the site's asset folder, so the site can generate responsive sizes. A still encoded straight from a render SHALL be at least 3200px wide; an AI-enhanced still (see below) SHALL be delivered at the model's full output size, at least 2048px wide. Neither is upscaled.

#### Scenario: Stills delivered
- **WHEN** the still set has been rendered and encoded
- **THEN** every listed still exists in the site asset folder at 3200px wide or more (2048px or more if AI-enhanced) and is used without upscaling

### Requirement: AI-enhanced stills
A still or the hero's opening poster MAY be replaced by a photoreal version made by an image model from Noor's own render of the same shot (`scripts/enhance-renders.mjs`). It SHALL keep the render's design, camera, framing and time of day, apart from design changes the maintainer has asked for, which the script records in `DESIGN_EDITS`. It SHALL still be presented as a concept, never as a photograph of built work. The Render content rules apply to it.

#### Scenario: Enhanced still reviewed
- **WHEN** an AI-enhanced still is reviewed before delivery
- **THEN** it is compared side by side with its source render, and the design, framing and time of day match apart from the recorded design changes

### Requirement: Render content rules
Renders SHALL contain no text, logos, watermarks, people, vehicles with readable plates, recognizable real places or brand names. Neighboring buildings SHALL be generic and visually subdued so the design is always the focus.

#### Scenario: Still review
- **WHEN** a still is reviewed before delivery
- **THEN** it contains none of the excluded content and the design is the clear subject

### Requirement: Share images
Each design SHALL have a 1200×630 share image cropped from one of its stills, with the subject kept clear of the edges.

#### Scenario: Design page shared
- **WHEN** a design page URL is shared
- **THEN** its preview uses that design's share image

### Requirement: Frame sequence encoding
The encoding tool SHALL turn a rendered frame sequence into web-ready frames in AVIF and WebP at two size tiers per orientation (landscape 1920×1080 and 1280×720; portrait 1080×1920 and 720×1280). It SHALL write a manifest describing them.

#### Scenario: Encoding a sequence
- **WHEN** the tool is run on a complete rendered sequence
- **THEN** it writes every frame in both formats and both tiers, plus a manifest, and reports the total bytes per tier and format

### Requirement: Sequence manifest
A sequence manifest SHALL state: schema version, frame count, orientations, and for each orientation and tier the dimensions, formats, URL pattern and total bytes. It SHALL also give the poster frame index for each orientation, and the start and end frame of each construction phase.

#### Scenario: Player reads phase ranges
- **WHEN** a client reads the manifest
- **THEN** it can find which frames belong to each of the six phases without any other source

### Requirement: Visual quality bar
Delivered renders SHALL show no visible noise, fireflies, denoiser blotches, texture stretching, light leaks at wall junctions or floating geometry at full delivered size. In sequences, consecutive frames SHALL NOT flicker.

#### Scenario: Pixel-level review
- **WHEN** a delivered still is inspected at 100% zoom
- **THEN** none of the listed artifacts is visible
