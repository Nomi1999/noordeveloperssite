## Purpose

Defines the rendered construction sequence of the 1 Kanal house that the home page hero scrubs through: its phases, camera, light and orientations.

## Requirements

### Requirement: Six-phase sequence
The sequence SHALL have 192 frames split into six equal phases of 32 frames, in this order:

| # | Phase | Shows |
|---|---|---|
| 00 | Design | glowing plan linework draws itself onto the empty plot |
| 01 | Foundation | excavation, footings, plinth |
| 02 | Structure | columns and slabs, level by level |
| 03 | Walls | brick infill and parapets |
| 04 | Finishing | plaster, cladding, glazing, railings, gate, landscaping |
| 05 | Move in | the finished house, lights coming on |

Within each phase, the build motion SHALL ease in and out, with a short hold at the phase's end, so each phase reads as a complete step.

#### Scenario: Phase boundaries
- **WHEN** frame 63 (the last frame of phase 01) is viewed
- **THEN** the foundation and plinth are complete and no columns have started rising

### Requirement: Continuous camera
The camera SHALL move continuously across all 192 frames without cuts or jumps: from an elevated three-quarter view over the plot at the start, orbiting and descending to the street-level view of the finished facade at the end. Camera velocity SHALL change smoothly, with no sudden accelerations at phase boundaries. The landscape path SHALL end exactly on the camera of the approved front-dusk still of the 1 Kanal: the same position, target and lens. The portrait path SHALL end from the same position, with its own lens and framing.

#### Scenario: Scrubbing across a boundary
- **WHEN** frames 95, 96 and 97 are viewed in order
- **THEN** the camera position changes by a similar small amount between each pair

#### Scenario: Landscape end view
- **WHEN** rendered landscape frame 191 is viewed beside the approved front-dusk still's source render
- **THEN** the house sits in the same place at the same size in both

### Requirement: Light arc
The sequence SHALL move through a day: blue-hour dawn during Design (the blueprint lines glow in the brand accent), daylight during Foundation, Structure and Walls, golden hour during Finishing, and dusk during Move in, when the interior lights and the facade lighting come on and the windows glow warm. The dusk at the end SHALL use the lighting of the approved front-dusk still.

#### Scenario: Final frame
- **WHEN** rendered frame 191 is viewed
- **THEN** it shows the finished house at dusk with every camera-facing window lit, and its strips, wall lights and downlights lit as in the approved front-dusk still's source render

#### Scenario: No facade lights before Move in
- **WHEN** any rendered frame before the Move in phase is viewed
- **THEN** no interior or facade light is lit

### Requirement: Two orientations
The sequence SHALL be rendered twice with separate camera paths: landscape 16:9 for wide screens and portrait 9:16 for phones. Each path SHALL be framed so the house is the clear subject. Both SHALL keep a calm area for overlay text (lower-left in landscape, top in portrait) free of key detail.

#### Scenario: Portrait framing
- **WHEN** portrait frames are viewed on a phone
- **THEN** the whole house is visible at the end of the sequence and the top area is calm enough for text

### Requirement: Posters
For each orientation, frame 0 SHALL serve as the initial poster (also the static image when JavaScript is unavailable or Save-Data is on), and frame 191 SHALL serve as the static image for visitors who prefer reduced motion.

#### Scenario: Static fallback with reduced motion
- **WHEN** the hero is shown in static mode because the visitor prefers reduced motion
- **THEN** it uses that orientation's frame 191

### Requirement: Approval before final render
Before each costly step, the maintainer SHALL approve what that step builds on. An every-8th-frame contact sheet of each orientation SHALL be approved before the full sequence is rendered. A preview video of each orientation's full sequence SHALL be approved before the posters are generated and before any final-quality sequence is rendered. A poster that is not the video's own last frame SHALL be approved beside that frame before it is encoded for the site.

#### Scenario: Preview review
- **WHEN** the choreography is ready
- **THEN** preview videos for both orientations exist and approval is recorded before the final render begins

#### Scenario: Test sheet before the full render
- **WHEN** the camera path and lighting have been changed
- **THEN** no full sequence is rendered until the contact sheets of both orientations have been approved

#### Scenario: Posters after the videos
- **WHEN** the preview videos have not yet been approved
- **THEN** no image call is made for the hero posters

### Requirement: Open boundary in the sequence
The sequence SHALL show the 1 Kanal as currently drawn, with the boundary wall left out on the same sides as the approved front-dusk still (front, corner and right) on every frame. Those sides SHALL show only a low kerb in every phase. The other sides SHALL keep their walls.

#### Scenario: Walls phase
- **WHEN** any rendered frame of the Walls phase is viewed
- **THEN** the front, corner and right edges of the plot show no wall above the kerb, and the house's own walls are in full view

#### Scenario: Current house
- **WHEN** any rendered frame from Structure onward is viewed
- **THEN** it shows the redrawn house on its five-sided plot and nothing of the earlier house

### Requirement: Delivered video is an approved restyle
The delivered hero videos SHALL be AI restyles of the rendered sequences that the maintainer has approved, at 192 frames and 24 fps, 1920×1080 landscape (upscaled from the approved restyle) and 540×960 portrait, with no cuts. The requirements on the camera path, light arc, build order and house design SHALL apply to the rendered source, and a restyle MAY differ from it where the maintainer has accepted the difference. The accepted differences SHALL be recorded in `render/README.md`, and a replacement restyle SHALL be approved before it is delivered.

#### Scenario: Delivered files
- **WHEN** the manifest and video files under `public/hero/` are read
- **THEN** both orientations have 192 frames at 24 fps at their stated sizes, and the phase ranges are unchanged

#### Scenario: Accepted differences recorded
- **WHEN** a delivered restyle differs from its rendered source
- **THEN** the difference is reported to the maintainer before approval and listed in `render/README.md`
