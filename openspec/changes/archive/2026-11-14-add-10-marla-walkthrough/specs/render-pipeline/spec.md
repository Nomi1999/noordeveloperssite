## MODIFIED Requirements

### Requirement: Interior from design data
The pipeline SHALL be able to build the inside of a design's rooms from the same exported data and committed configuration as the exterior: finished walls (in paint or wallpaper, chosen per room), floor, ceiling with lighting, skirting, window and door trim, door leaves, and fixed fittings for kitchens and baths. Finishes SHALL be chosen per room in committed configuration, SHALL use only materials already allowed by the materials requirement, and SHALL NOT include furniture. Rooms and levels with no interior configuration SHALL be built as before, so existing exterior renders are unchanged. Where the design has a double-height space or a stairwell, the room below SHALL take its ceiling from the next slab that covers it, and every open edge on the floor above SHALL have a balustrade. Every interior stair in the design, whatever its shape, SHALL be built as a finished stair with treads, risers, a soffit and a balustrade, with no raw construction mass left in view. An outdoor stair seen from a viewpoint SHALL be finished in exterior materials with a rail or side wall.

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

#### Scenario: Paint or wallpaper per room
- **WHEN** the 10 Marla drawing room is configured with a wallpaper and its foyer with a paint colour
- **THEN** the drawing room's wall faces show the wallpaper pattern and the foyer's walls show the paint colour, each filling its room up to the ceiling with the door, window and trim openings cut out cleanly

#### Scenario: Wallpaper pattern is scaled and aligned
- **WHEN** a wallpaper covers a wall
- **THEN** its pattern repeat is the same size on every wall of the room, runs upright, starts square at the room corner, and shows no stretching at openings or corners

### Requirement: Interior style per design
Each design's interior configuration SHALL define its own finish style: the palette, wall, floor and ceiling treatments, trim and door style, metal finish, feature-wall kinds, bathroom and kitchen finishes, and light colour. One design's style SHALL NOT change another design's interior. Walls SHALL be finishable per room in paint (any colour) or a wallpaper pattern, with every room still taking the design's wall colour if none is set. Style elements that are new to the builder (such as wallpaper, per-room paint, tray ceilings with an indirect cove, brass inlays,  flush full-height doors, shadow-gap skirting, linear light slots, frameless glass balustrades, floating vanities, wall-hung WCs, handleless cabinetry and pendant lights) SHALL be off unless a design's configuration turns them on.

#### Scenario: Distinct looks
- **WHEN** the 1 Kanal drawing room and the 5 Marla drawing room are rendered
- **THEN** they show different finish styles, each from its own design's configuration

#### Scenario: Existing style unchanged
- **WHEN** a 5 Marla panorama is rendered with the CUDA backend after the new style elements exist
- **THEN** the image matches the one rendered before they existed to within one level per channel, differing no more than a repeat render of the earlier code does (Cycles on a GPU is not bit-identical from run to run)

#### Scenario: Third distinct look
- **WHEN** the 10 Marla drawing room is rendered next to the 1 Kanal and 5 Marla drawing rooms
- **THEN** it shows the dark, tonal look of its own configuration: ink and ivory walls, wallpaper in the drawing room, satin brass and smoked walnut

#### Scenario: One theme across rooms
- **WHEN** every 10 Marla room is rendered
- **THEN** each uses only the theme's materials (ink, ivory, brass and smoked walnut), and no wallpaper pattern or paint colour falls outside that palette
