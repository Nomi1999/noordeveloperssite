## RENAMED Requirements

- FROM: `### Requirement: Two concept designs`
- TO: `### Requirement: Concept designs`

## MODIFIED Requirements

### Requirement: Automatic validation
The build SHALL fail with a message naming the design, level and element when a design breaks a geometric rule: an element outside the plot, an opening extending past its host wall's ends or above its height, a room outline that is not closed or that overlaps another room on the same level, a stair whose outline does not line up between the levels it connects, or a level whose walls are not supported by the level below (except declared cantilevers). Room sizes below the minimums for the design's plot size SHALL produce warnings. Plots of 10 Marla (2,250 sq ft) and larger SHALL use the minimums in the design document. Smaller plots SHALL use these compact minimums:

| Room | Smaller side | Area |
|---|---|---|
| Master bedroom | 12′ | 168 sq ft |
| Bedroom | 11′ | 132 sq ft |
| Drawing room, lounge | 12′ | 156 sq ft |
| Kitchen | 8′ | 80 sq ft |

#### Scenario: Opening wider than its wall
- **WHEN** a window is placed so it extends past the end of its host wall
- **THEN** the build fails and the error names the design, level and opening

#### Scenario: Undersized bedroom
- **WHEN** a bedroom's smaller dimension is below the minimum for its plot size
- **THEN** the build succeeds but prints a warning naming the room

#### Scenario: Compact bedroom on a small plot
- **WHEN** a bedroom of 11′×12′ is on a 5 Marla plot
- **THEN** no warning is printed for it

#### Scenario: Same bedroom on a larger plot
- **WHEN** a bedroom of 11′×12′ is on a 10 Marla plot
- **THEN** a warning names the room

### Requirement: Concept designs
The project SHALL include four designs, none taller than two storeys. A roof level with a stair room and water tanks SHALL NOT count as a storey.

- The **1 Kanal house** (50′×90′ plot) has a ground and a first floor plus a roof with a stair room and water tanks. It contains at least five bedrooms, each with an attached bathroom, a drawing room, a dining area, a TV lounge, a main kitchen and a back kitchen, a servant room with a bathroom, a covered car porch for at least two cars, and a front lawn.
- The **2 Kanal house** (75′×120′ plot) has the same levels, at least six bedrooms with attached bathrooms, a double-height lounge, an upstairs family lounge, a covered car porch for at least three cars, and a larger lawn.
- The **5 Marla house** (25′×45′ plot) has the same levels and stands on the plot line on both sides. It contains at least three bedrooms, each with an attached bathroom, a drawing room, a TV lounge, a family lounge upstairs, a kitchen, and a covered car porch for at least one car.
- The **10 Marla house** (35′×65′ plot) has the same levels and stands on the plot line on its left side, with an open side passage on its right behind the porch. It contains at least four bedrooms, each with an attached bathroom, a drawing room, a dining area, a TV lounge, a family lounge upstairs, a kitchen, a covered car porch for at least two cars, and a front lawn or planted strip.

The style of the 1 Kanal and 2 Kanal houses SHALL be contemporary: flat roofs with parapets, strong horizontal slabs, and a restrained palette of plaster, stone, wood and dark metal.

#### Scenario: Program check
- **WHEN** the computed facts of each design are listed
- **THEN** each design meets every count and feature in its program

#### Scenario: Storey limit
- **WHEN** the computed facts of any design are listed
- **THEN** its storey count is at most two

## ADDED Requirements

### Requirement: Distinct facades for the marla houses
The 5 Marla and 10 Marla houses SHALL each have their own facade, drawn from modern Pakistani houses. Each SHALL be recognisably different from the other and from the 1 Kanal and 2 Kanal houses. Neither SHALL use the older houses' combination of white plaster walls, dark metal fins, a stone pier and a glass-railed terrace over the porch. Each facade SHALL be defined in its design's data, like every other element of the design.

#### Scenario: Designs side by side
- **WHEN** the lead stills of all four designs are viewed together
- **THEN** a viewer can tell the 5 Marla and 10 Marla houses apart from each other and from the two Kanal houses by their materials and composition, without reading their names
