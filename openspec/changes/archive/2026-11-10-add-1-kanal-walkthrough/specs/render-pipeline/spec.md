## MODIFIED Requirements

### Requirement: Interior from design data
The pipeline SHALL be able to build the inside of a design's rooms from the same exported data and committed configuration as the exterior: finished walls, floor, ceiling with lighting, skirting, window and door trim, door leaves, and fixed fittings for kitchens and baths. Finishes SHALL be chosen per room in committed configuration, SHALL use only materials already allowed by the materials requirement, and SHALL NOT include furniture. Rooms and levels with no interior configuration SHALL be built as before, so existing exterior renders are unchanged. Where the design has a double-height space or a stairwell, the room below SHALL take its ceiling from the next slab that covers it, and every open edge on the floor above SHALL have a balustrade. Every interior stair in the design, whatever its shape, SHALL be built as a finished stair with treads, risers, a soffit and a balustrade, with no raw construction mass left in view. An outdoor stair seen from a viewpoint SHALL be finished in exterior materials with a rail or side wall.

#### Scenario: Interior follows the design
- **WHEN** a room's size or an opening's position changes in the design data and the interior is rendered again
- **THEN** the walls, floor, ceiling, trim and door follow the change with no manual scene editing

#### Scenario: Exterior renders unaffected
- **WHEN** an exterior shot is rendered after the interior builder exists
- **THEN** the image is the same as before it was added

#### Scenario: Structure left showing
- **WHEN** a beam, column or party-wall face stands inside a built room
- **THEN** it is finished like the walls around it, with no raw structural material visible

#### Scenario: Double-height space
- **WHEN** a panorama is rendered in a room under a void in the slab above
- **THEN** the room's walls continue up to the higher ceiling, the slab edge is finished, and a balustrade runs along the void's edge on the upper floor

#### Scenario: Indoor and outdoor stairs
- **WHEN** the 1 Kanal's dog-leg main stair and its L-shaped terrace stair to the roof are seen in panoramas
- **THEN** the main stair is a finished interior stair with a balustrade, the terrace stair is a finished exterior stair with a rail or side wall, and neither shows the exported solid mass under its steps

## ADDED Requirements

### Requirement: Interior style per design
Each design's interior configuration SHALL define its own finish style: the palette, wall, floor and ceiling treatments, trim and door style, metal finish, feature-wall kinds, bathroom and kitchen finishes, and light colour. One design's style SHALL NOT change another design's interior. Style elements that are new to the builder (such as flush full-height doors, shadow-gap skirting, linear light slots, frameless glass balustrades, floating vanities, wall-hung WCs, handleless cabinetry and pendant lights) SHALL be off unless a design's configuration turns them on.

#### Scenario: Distinct looks
- **WHEN** the 1 Kanal drawing room and the 5 Marla drawing room are rendered
- **THEN** they show different finish styles, each from its own design's configuration

#### Scenario: Existing style unchanged
- **WHEN** a 5 Marla panorama is rendered with the CUDA backend after the new style elements exist
- **THEN** the image matches the one rendered before they existed to within one level per channel, differing no more than a repeat render of the earlier code does (Cycles on a GPU is not bit-identical from run to run)

### Requirement: GPU backend for panoramas
When a panorama is rendered on a GPU, the pipeline SHALL use the fastest backend the machine offers, trying OptiX before CUDA and the others, and SHALL report the backend and device it used. The maintainer SHALL be able to force a particular backend, so that regression renders can be compared pixel for pixel with earlier ones. When no GPU backend is available, rendering SHALL fall back to the CPU and say so.

#### Scenario: OptiX available
- **WHEN** a panorama is rendered with the GPU option on a machine whose NVIDIA GPU supports OptiX
- **THEN** it renders with OptiX and the log names OptiX and the device

#### Scenario: Forced backend
- **WHEN** the maintainer forces CUDA for a regression render
- **THEN** the render uses CUDA even though OptiX is available

#### Scenario: No GPU
- **WHEN** the GPU option is given on a machine with no supported GPU
- **THEN** the panorama renders on the CPU and the log says no GPU was found
