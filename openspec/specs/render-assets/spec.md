## Purpose

Defines the rendered imagery the site ships (stills, share images and encoded frame sequences with their manifest) and the content rules every render follows.

## Requirements

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

### Requirement: Visual quality bar
Delivered renders SHALL show no visible noise, fireflies, denoiser blotches, texture stretching, light leaks at wall junctions or floating geometry at full delivered size. In sequences, consecutive frames SHALL NOT flicker.

#### Scenario: Pixel-level review
- **WHEN** a delivered still is inspected at 100% zoom
- **THEN** none of the listed artifacts is visible

### Requirement: Hero video encoding
The encoding tool SHALL turn a rendered frame sequence into the hero video for one orientation: an AV1 MP4 and an H.264 MP4 at the frames' own size, 24 frames per second, with no audio track and the index at the front of the file. It SHALL write or update a manifest describing them and SHALL report each file's size.

#### Scenario: Encoding a sequence
- **WHEN** the tool is run on a complete rendered sequence with an orientation
- **THEN** it writes both video files for that orientation, updates the manifest, and reports the size of each file

### Requirement: Hero video manifest
The hero manifest SHALL state: schema version 2, frames per second, frame count, the start and end frame of each construction phase, and for each orientation the video's dimensions and its sources in order of preference, each with URL, MIME type including codecs, and byte size.

#### Scenario: Player reads phase ranges
- **WHEN** a client reads the manifest
- **THEN** it can find which frames, and so which playback times, belong to each of the six phases without any other source

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
