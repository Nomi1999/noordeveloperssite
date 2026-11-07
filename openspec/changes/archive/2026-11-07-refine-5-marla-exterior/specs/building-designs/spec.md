## ADDED Requirements

### Requirement: 5 Marla exterior finishes
The 5 Marla's exterior SHALL be a light, warm combination of large-format beige tile with visible joints, sand plaster, timber slats and grey stone, with black metal and thin charcoal lines as its only dark accents. There SHALL be no bronze. There SHALL be no exposed brick. The street bay SHALL be beige tile with a thin charcoal reveal line at each floor. The balcony frame and the side returns SHALL be sand plaster, with timber slats on the balcony's street-facing cheek. The porch pier under the balcony frame SHALL be the same sand plaster as the frame, and the roof edge SHALL have a thin charcoal cap. The black metal jaali across the balcony SHALL stay. Wall lights and soffit downlights SHALL be declared in the design data. No exterior wall or parapet SHALL be white plaster. The house's rooms, openings and plan geometry SHALL NOT change.

#### Scenario: Exterior materials
- **WHEN** the materials of the 5 Marla's exterior walls, parapets and facade elements are listed
- **THEN** none is `brick-cladding` or `plaster-white`, and beige tile, sand plaster, timber slats and grey stone are all present

#### Scenario: Rooms unchanged
- **WHEN** the 5 Marla's rooms, openings and levels are compared before and after this change
- **THEN** they are the same

#### Scenario: Still distinct
- **WHEN** the lead stills of all four designs are viewed together
- **THEN** the 5 Marla is the light, warm house, and is clearly different from the 10 Marla and from the 1 Kanal and 2 Kanal

### Requirement: 5 Marla boundary finishes
The 5 Marla's front boundary SHALL be a solid wall: a sand-plaster base with beige tile above it to a charcoal cap, grey stone piers with charcoal caps, and wall lights. It SHALL have no slatted or gapped panel, and no timber on the wall itself. The car gate SHALL be black with timber doors, and SHALL have a wicket door beside its main leaf within the same opening. No strip of the base wall SHALL show at the foot of a pier. The planting strip in the front paving SHALL carry shrubs. The boundary's side and rear walls SHALL NOT change in position, and the plot line SHALL stay respected by every panel and pier.

#### Scenario: Front boundary
- **WHEN** the front boundary is viewed from the street
- **THEN** it shows a solid beige tile wall on a sand base, grey stone capped piers either side of a black gate with timber doors and a wicket door, and at least one wall light

#### Scenario: Piers
- **WHEN** a pier is viewed from the street
- **THEN** it is one colour from its foot to its cap, with no band of the base wall at its foot

#### Scenario: Inside the plot
- **WHEN** the design is checked
- **THEN** no boundary panel, pier or light stands outside the plot

### Requirement: Boundary panel material
The helper that builds a boundary's finished panels SHALL let a design choose the panel material, the boundary's top and the height of its hood. A design that chooses none SHALL get grey stone tile to 7 ft as before.

#### Scenario: Default unchanged
- **WHEN** the 1 Kanal and 2 Kanal are exported after this change
- **THEN** their exported data is byte-identical to before

#### Scenario: Chosen material
- **WHEN** a design chooses a panel material for its boundary wall
- **THEN** the exported panels use that material
