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

### Requirement: Fast source renders for enhancement
The pipeline SHALL provide one command that renders every still of a named design at 2048px wide with the fast engine, as source images for AI enhancement, skipping any that already exist. It SHALL NOT need Cycles or a dedicated GPU.

#### Scenario: Rendering a design's sources
- **WHEN** the maintainer runs the command for the 5 Marla design
- **THEN** its four shots are written to the render output folder at 2048px wide without opening Blender's window

#### Scenario: Re-running after an interruption
- **WHEN** the command is run again after two of the four shots were written
- **THEN** only the two missing shots are rendered

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
