## Purpose

Turns exported design data into photoreal architectural renders through a scripted, reproducible Blender pipeline, including day-to-dusk lighting and a construction-progress control for the scroll-build hero.

## Requirements

### Requirement: Scene generated from design data
The render scene SHALL be built entirely by scripts from a design's exported JSON and committed configuration. No hand-edited Blender file SHALL be a source of truth. Running the pipeline again with the same inputs SHALL produce the same scene.

#### Scenario: Design changes
- **WHEN** a design is changed, re-exported and re-rendered
- **THEN** the render reflects the change with no manual scene editing

#### Scenario: Unsupported export version
- **WHEN** the pipeline is given a design export with an unsupported schema version
- **THEN** it stops before building anything and names the expected and found versions

### Requirement: Headless command-line operation
The pipeline SHALL run without the Blender interface from a single command that takes the design, shot, engine, quality preset and an optional frame range. The command SHALL be runnable through npm scripts.

#### Scenario: Preview render of one shot
- **WHEN** the maintainer runs the command for the 1 Kanal design, shot `front-day`, EEVEE, preview quality
- **THEN** a single image is written to the render output folder without opening Blender's window

### Requirement: Materials from tags with licensed assets
Every material tag in the design vocabulary SHALL map to a physically based material. Every external texture, sky map or model SHALL be CC0-licensed and listed in a lockfile with its source URL, license and checksum. A fetch command SHALL download all locked assets.

#### Scenario: Missing asset
- **WHEN** a render runs and a locked asset has not been downloaded
- **THEN** the pipeline stops with a message naming the asset and the fetch command

#### Scenario: License audit
- **WHEN** the lockfile is reviewed
- **THEN** every entry is marked CC0 with a source URL

### Requirement: Time of day
The scene SHALL expose one time-of-day control from 0 (clear daylight) to 1 (dusk). At dusk, the sky darkens to blue hour, the sun is low and warm, and interior spaces visible through glazing emit warm light in the brand accent's color family.

#### Scenario: Dusk render
- **WHEN** a shot is rendered with time of day at 1
- **THEN** every window of a finished building facing the camera shows warm interior light, and exterior surfaces read as blue-hour lit

### Requirement: Construction progress phases
The scene SHALL expose one construction-progress control from 0 to 6 that moves the building through these phases in order:

| Range | Phase |
|---|---|
| 0–1 | Design: plan linework draws itself onto the empty plot |
| 1–2 | Foundation: excavation, footings and plinth |
| 2–3 | Structure: columns rise and slabs form, level by level |
| 3–4 | Walls: brick infill and parapets build up |
| 4–5 | Finishing: plaster, cladding, glazing, railings, gate and landscaping |
| 5–6 | Complete |

At every value, nothing SHALL appear before the element that supports it, and textures SHALL NOT visibly stretch while elements build up.

#### Scenario: Mid-structure
- **WHEN** a shot is rendered with progress at 2.5
- **THEN** the foundation is complete, ground-floor columns and slab are present, upper-level columns are partly risen, and no walls or finishes are visible

#### Scenario: Support order
- **WHEN** progress is stepped through every 0.05 increment
- **THEN** no slab, wall or finish is visible without its supporting element beneath it

### Requirement: Engines and quality presets
The pipeline SHALL support EEVEE and Cycles with at least a preview and a final quality preset each. Final presets SHALL use a fixed sampling seed and denoising so consecutive frames do not flicker.

#### Scenario: Engine switch
- **WHEN** the same shot is rendered with EEVEE and with Cycles
- **THEN** both renders show the same framing, materials and lighting direction

### Requirement: Resumable rendering
Frame renders SHALL be written atomically (to a temporary name, then renamed), and a frame-range render SHALL skip frames whose final files already exist, so an interrupted overnight render can be resumed.

#### Scenario: Interrupted render
- **WHEN** a 192-frame render is stopped at frame 100 and the same command is run again
- **THEN** rendering continues from frame 100 and no incomplete frame file remains from the interruption

### Requirement: Review contact sheets
The pipeline SHALL produce a contact sheet image for any rendered set of stills or frames, labelled with shot, frame number, progress and time of day.

#### Scenario: Reviewing a sequence
- **WHEN** a frame range has been rendered
- **THEN** a single contact sheet shows evenly sampled frames with their labels
