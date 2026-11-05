## Purpose

Defines each concept building once, as validated data, so floor plans, 3D renders and the scroll-build hero all show the same building, and new building types can be added as content.

## Requirements

### Requirement: Single design definition
Each concept building SHALL be defined in exactly one design file, from which every floor plan, render input and displayed fact about that building is derived. No building dimension or fact SHALL be duplicated by hand elsewhere in the site or render pipeline.

#### Scenario: Moving a wall
- **WHEN** a wall is moved in a design file and the site and export are rebuilt
- **THEN** the floor plan, the exported render data and the computed facts all reflect the moved wall

### Requirement: Design data contents
A design SHALL describe: identity (slug, name, kind such as house), plot dimensions, structural column grid, levels (elevation, floor-to-floor height, slab thickness), walls per level (endpoints, thickness, kind), openings (host wall, position, width, height, sill, type), rooms (name, type, outline), fixed fixtures (kitchen counters, bathroom fittings, built-in wardrobes), stairs, slab outlines with cantilevers and voids, roof features (parapet, stair room, water tanks), site works (boundary wall with gate, porch, driveway, lawn, planting positions) and facade elements, each with a material tag from a fixed vocabulary.

#### Scenario: New building type
- **WHEN** a new design of a kind not yet on the site (for example an apartment block) is added using the same data model
- **THEN** it validates, exports and produces floor plans without changes to the model's code

### Requirement: Units and coordinates
Design data SHALL use feet as the unit, with the origin at the plot's front-left corner as seen from the street, x along the street frontage and y into the plot. Displayed dimensions SHALL be formatted in feet and inches (for example `16'-6"`).

#### Scenario: Dimension formatting
- **WHEN** a length of 16.5 feet is displayed
- **THEN** it is shown as `16'-6"`

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

### Requirement: Derived facts
Covered area per level and in total, number of storeys, bedrooms and bathrooms SHALL be computed from the design data, along with counts and areas of any other room types a design contains.

#### Scenario: Adding a bedroom
- **WHEN** a room of type bedroom is added to a design
- **THEN** the computed bedroom count increases by one with no other edits

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

### Requirement: Render export
Each design SHALL be exportable as a JSON file carrying a schema version, with wall segments already split around openings and all derived facts included, so the renderer does no geometric reasoning of its own about openings.

#### Scenario: Export is reproducible
- **WHEN** the export is run twice without design changes
- **THEN** the output files are byte-identical

#### Scenario: Schema change
- **WHEN** the export format changes incompatibly
- **THEN** the schema version increases and the renderer refuses older-version files with a clear message

### Requirement: Distinct facades for the marla houses
The 5 Marla and 10 Marla houses SHALL each have their own facade, drawn from modern Pakistani houses. Each SHALL be recognisably different from the other and from the 1 Kanal and 2 Kanal houses. Neither SHALL use the older houses' combination of white plaster walls, dark metal fins, a stone pier and a glass-railed terrace over the porch. Each facade SHALL be defined in its design's data, like every other element of the design.

#### Scenario: Designs side by side
- **WHEN** the lead stills of all four designs are viewed together
- **THEN** a viewer can tell the 5 Marla and 10 Marla houses apart from each other and from the two Kanal houses by their materials and composition, without reading their names
