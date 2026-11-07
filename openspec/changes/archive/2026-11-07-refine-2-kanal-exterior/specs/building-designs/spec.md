## ADDED Requirements

### Requirement: 2 Kanal exterior finishes
The 2 Kanal's street-facing and lawn-facing walls SHALL be finished in a combination of grey stone tile, travertine, beige tile, charcoal plaster, timber soffits, black metal fins and black granite, with visible tile joints, LED lines and wall lights. The walls behind the porch and the terrace SHALL be travertine only, as the maintainer chose. No exterior wall of the house SHALL be white plaster, and white SHALL appear on the exterior only on the boundary's base. The composition SHALL follow the 2 Kanal's own massing, and its rooms SHALL NOT change.

#### Scenario: Exterior materials
- **WHEN** the materials of the 2 Kanal's exterior walls, parapets and facade elements are listed
- **THEN** no exterior wall or parapet is `plaster-white`, and every listed finish material is present

#### Scenario: Rooms unchanged
- **WHEN** the 2 Kanal's rooms and openings are compared before and after this change
- **THEN** they are the same

### Requirement: 2 Kanal terrace enclosure
The glass railing of the 2 Kanal's terrace over the porch SHALL close every open side of the terrace: the left side, the front and the right side. Each end of the railing SHALL meet a wall, with no gap. The railing SHALL be part of the design data, so that floor plans and renders both show it without any image edit.

#### Scenario: All open sides closed
- **WHEN** the railing's path is compared with the terrace's outline
- **THEN** it runs along the left, front and right edges and both ends reach a wall of the house

#### Scenario: Seen in the stills
- **WHEN** a still that shows the terrace is reviewed
- **THEN** glass closes all three open sides

### Requirement: 2 Kanal boundary finishes
The 2 Kanal's boundary SHALL have a white base with finished panels above it, to a total height of 7 ft. The front SHALL be grey stone tile throughout, with no timber, and SHALL have a metal lattice screen, wall lights and black granite gate piers that the white base does not show on. The sides and rear SHALL be plain plaster. Both gates SHALL be closed black metal gates 7 ft high.

#### Scenario: Front boundary
- **WHEN** the front boundary is viewed from the street
- **THEN** it shows grey stone on a white base either side of closed black metal gates 7 ft high, between piers that are black granite to the ground

### Requirement: 2 Kanal columns clear of openings
No structural column of the 2 Kanal SHALL stand in a window or door, and every column SHALL be as deep as the wall it stands in, so that none shows through glass or stands proud of the cladding. This was reported by the maintainer: a column ran through the porch's dining window and the terrace's sliding door.

#### Scenario: Openings clear
- **WHEN** the exported columns of every level are compared with its exterior windows and doors
- **THEN** no column overlaps any of them

#### Scenario: Flush columns
- **WHEN** the 2 Kanal's column size is read
- **THEN** it is 9" by 9", the thickness of an exterior wall

### Requirement: Gate height
A gate MAY declare its own height. A gate that declares none SHALL take the boundary's height. A declared height SHALL NOT change the boundary wall's height or plan. A gate MAY also declare that it has no posts, for a design that draws its own piers beside the gate; a gate that declares nothing SHALL keep its posts.

#### Scenario: Declared height
- **WHEN** a gate declares a height of 7 ft on a boundary 1.1 ft high
- **THEN** the exported gate is 7 ft high and the exported walls are 1.1 ft high

#### Scenario: No declared height
- **WHEN** a gate declares no height
- **THEN** the exported gate is as high as the boundary, and the exports of designs without a declared gate height are byte-identical to before

#### Scenario: Gate without posts
- **WHEN** a closed gate declares that it has no posts
- **THEN** the render shows its leaf between the design's own piers, with no posts
