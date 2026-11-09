## ADDED Requirements

### Requirement: Interior from design data
The pipeline SHALL be able to build the inside of a design's rooms from the same exported data and committed configuration as the exterior: finished walls, floor, ceiling with lighting, skirting, window and door trim, door leaves, and fixed fittings for kitchens and baths. Finishes SHALL be chosen per room in committed configuration, SHALL use only materials already allowed by the materials requirement, and SHALL NOT include furniture. Rooms and levels with no interior configuration SHALL be built as before, so existing exterior renders are unchanged.

#### Scenario: Interior follows the design
- **WHEN** a room's size or an opening's position changes in the design data and the interior is rendered again
- **THEN** the walls, floor, ceiling, trim and door follow the change with no manual scene editing

#### Scenario: Exterior renders unaffected
- **WHEN** an exterior shot is rendered after the interior builder exists
- **THEN** the image is the same as before it was added

#### Scenario: Structure left showing
- **WHEN** a beam, column or party-wall face stands inside a built room
- **THEN** it is finished like the walls around it, with no raw structural material visible

### Requirement: Panorama render
The pipeline SHALL render a 360° equirectangular panorama from any named viewpoint in a design, at eye height above the finished floor, with no gaps or visible seams. Viewpoints SHALL be listed in a committed configuration file per design, with the room, position, starting direction and the viewpoints reachable from it. The panorama SHALL be written as a 2:1 image, with a fixed, documented relation between image direction and compass direction in the house, and SHALL be renderable with Cycles. The command SHALL accept the design, viewpoint and quality preset, and SHALL be runnable through npm scripts.

#### Scenario: One panorama
- **WHEN** the maintainer runs the panorama command for the 5 Marla drawing room viewpoint with Cycles
- **THEN** a 2:1 equirectangular image is written to the render output folder without opening Blender's window

#### Scenario: Seams
- **WHEN** a panorama is viewed in a 360° viewer
- **THEN** no seam, gap or change of exposure is visible anywhere in it

#### Scenario: Not mirrored
- **WHEN** a viewer turns right in a panorama
- **THEN** they see what a person standing at that point and turning right in the house would see, so a marker computed from the plan lands on the door it names

#### Scenario: Unknown viewpoint
- **WHEN** the command is given a viewpoint that is not in the design's viewpoint file
- **THEN** it stops and lists the available viewpoints

### Requirement: Resumable, time-limited panorama sets
Every panorama image SHALL be written atomically (to a temporary name, then renamed). A command for a whole design's panoramas SHALL render every viewpoint in turn, skip those whose final image already exists, and be able to run under a time limit without leaving an incomplete image in place.

#### Scenario: Interrupted overnight run
- **WHEN** a run of all viewpoints is stopped halfway through the fifth panorama and run again
- **THEN** the four finished panoramas are not rendered again and the fifth is rendered

#### Scenario: Time limit
- **WHEN** the run is stopped by its time limit
- **THEN** no incomplete panorama image is left where a finished one is expected

### Requirement: Review of panoramas
The pipeline SHALL produce, for a set of panoramas, an overview image showing each one with its room name, so the maintainer can approve finishes and lighting before the set goes on the site.

#### Scenario: Reviewing a set
- **WHEN** all 5 Marla panoramas have been rendered and the overview command is run
- **THEN** a single image shows every panorama labelled with its room
