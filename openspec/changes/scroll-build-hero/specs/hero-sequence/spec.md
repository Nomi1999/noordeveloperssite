## Purpose

Defines the rendered construction sequence of the 1 Kanal house that the home page hero scrubs through: its phases, camera, light and orientations.

## ADDED Requirements

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
The camera SHALL move continuously across all 192 frames without cuts or jumps: from an elevated three-quarter view over the plot at the start, orbiting and descending to a street-level three-quarter view of the finished facade at the end. Camera velocity SHALL change smoothly, with no sudden accelerations at phase boundaries.

#### Scenario: Scrubbing across a boundary
- **WHEN** frames 95, 96 and 97 are viewed in order
- **THEN** the camera position changes by a similar small amount between each pair

### Requirement: Light arc
The sequence SHALL move through a day: blue-hour dawn during Design (the blueprint lines glow in the brand accent), daylight during Foundation, Structure and Walls, golden hour during Finishing, and dusk during Move in, when the interior lights come on and the windows glow warm.

#### Scenario: Final frame
- **WHEN** frame 191 is viewed
- **THEN** it shows the finished house at dusk with every camera-facing window lit

### Requirement: Two orientations
The sequence SHALL be rendered twice with separate camera paths: landscape 16:9 for wide screens and portrait 9:16 for phones. Each path SHALL be framed so the house is the clear subject. Both SHALL keep a calm area for overlay text (lower-left in landscape, top in portrait) free of key detail.

#### Scenario: Portrait framing
- **WHEN** portrait frames are viewed on a phone
- **THEN** the whole house is visible at the end of the sequence and the top area is calm enough for text

### Requirement: Posters
For each orientation, frame 0 SHALL serve as the initial poster, and frame 191 SHALL serve as the static fallback image.

#### Scenario: Static fallback
- **WHEN** the hero is shown in static mode
- **THEN** it uses that orientation's frame 191

### Requirement: Approval before final render
A low-resolution preview video of each orientation's full sequence SHALL be approved by the maintainer before the final-quality sequence is rendered.

#### Scenario: Preview review
- **WHEN** the choreography is ready
- **THEN** preview videos for both orientations exist and approval is recorded before the final render begins
