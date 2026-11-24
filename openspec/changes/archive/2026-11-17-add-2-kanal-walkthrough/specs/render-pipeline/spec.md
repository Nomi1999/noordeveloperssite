## MODIFIED Requirements

### Requirement: Interior from design data
The pipeline SHALL be able to build the inside of a design's rooms from the same exported data and committed configuration as the exterior: finished walls (in paint or wallpaper, chosen per room), floor, ceiling with lighting, skirting, window and door trim, door leaves, and fixed fittings for kitchens and baths. Finishes SHALL be chosen per room in committed configuration, SHALL use only materials already allowed by the materials requirement, and SHALL NOT include furniture. Rooms and levels with no interior configuration SHALL be built as before, so existing exterior renders are unchanged. Where the design has a double-height space or a stairwell, the room below SHALL take its ceiling from the next slab that covers it, and every open edge on the floor above SHALL have a balustrade. Every interior stair in the design, whatever its shape, SHALL be built as a finished stair with treads, risers, a soffit and a balustrade, with no raw construction mass left in view. An outdoor stair seen from a viewpoint SHALL be finished in exterior materials with a rail or side wall. A bathtub in the design's export SHALL be built as a fixed fitting: a low apron clad in the room's own wall finish, an inset white basin, a ledge on the wall side and metal taps, no higher than about 0.55 m, and it SHALL appear in every view that sees it. A design with no bathtub SHALL be unchanged. A freestanding stone chimney named in the configuration of a double-height room SHALL be built from the room's floor to that void's ceiling, fluted in stone on its faces, and SHALL appear in every view that sees it. A design whose configuration names no chimney SHALL be unchanged.

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

#### Scenario: Built-in bathtub
- **WHEN** a panorama is rendered in a 2 Kanal bath that has a bathtub
- **THEN** the tub is present against its wall as a stone-clad built-in with an inset white basin and metal taps, standing no higher than about 0.55 m, with no gap where the exported fixture is

#### Scenario: No bathtub elsewhere
- **WHEN** a panorama is rendered in any 5 Marla, 1 Kanal or 10 Marla room
- **THEN** no bathtub fitting is added, because those designs have none

#### Scenario: Freestanding chimney in a double-height room
- **WHEN** a panorama is rendered in the 2 Kanal lounge
- **THEN** the fluted stone chimney stands on the floor against the glass wall and rises the full height to the roof slab, with stone flutes on its faces, and no other design has one
