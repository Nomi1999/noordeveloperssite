## Purpose

Defines each concept building once, as validated data, so floor plans, 3D renders and the scroll-build hero all show the same building, and new building types can be added as content.

## Requirements

### Requirement: Single design definition
Each concept building SHALL be defined in exactly one design file, from which every floor plan, render input and displayed fact about that building is derived. No building dimension or fact SHALL be duplicated by hand elsewhere in the site or render pipeline.

#### Scenario: Moving a wall
- **WHEN** a wall is moved in a design file and the site and export are rebuilt
- **THEN** the floor plan, the exported render data and the computed facts all reflect the moved wall

### Requirement: Design data contents
A design SHALL describe: identity (slug, name, kind such as house), plot dimensions and, for a plot that is not a rectangle, its outline, structural column grid, levels (elevation, floor-to-floor height, slab thickness), walls per level (endpoints, thickness, kind), openings (host wall, position, width, height, sill, type), rooms (name, type, outline), fixed fixtures (kitchen counters, bathroom fittings, built-in wardrobes), stairs (dog-leg, straight, L-shaped or spiral), slab outlines with cantilevers and voids, roof features (parapet, stair room, water tanks), site works (boundary wall with gate, porch, driveway, lawn, planting positions) and facade elements, each with a material tag from a fixed vocabulary.

#### Scenario: New building type
- **WHEN** a new design of a kind not yet on the site (for example an apartment block) is added using the same data model
- **THEN** it validates, exports and produces floor plans without changes to the model's code

#### Scenario: Rectangular plot needs no outline
- **WHEN** a design gives only a plot width and depth
- **THEN** its plot is that rectangle and its export is byte-identical to one made before plot outlines existed

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

- The **1 Kanal house** stands on a five-sided corner plot of about 5,000 sq ft, labelled 1 Kanal, with streets on its front and right sides. It has a ground and a first floor plus a roof with water tanks behind a parapet and no stair room; an outdoor stair gives roof access. It contains five bedrooms, each with an attached bathroom, a study, a double-height stair lobby, a drawing room with a powder room beside it, a dining room, a TV lounge and a kitchen with a raw kitchen behind it on the ground floor, an upstairs TV lounge with a kitchenette, three first-floor terraces, a covered car porch for two cars, and a front lawn. It has no servant room, laundry or store.
- The **2 Kanal house** (75′×120′ plot) has a ground and a first floor plus a roof with a stair room and water tanks, at least six bedrooms with attached bathrooms, a double-height lounge, an upstairs family lounge, a covered car porch for at least three cars, and a larger lawn than the 1 Kanal.
- The **5 Marla house** (25′×45′ plot) has the same levels as the 2 Kanal and stands on the plot line on both sides. It contains at least three bedrooms, each with an attached bathroom, a drawing room, a TV lounge, a family lounge upstairs, a kitchen, and a covered car porch for at least one car.
- The **10 Marla house** (35′×65′ plot) has the same levels as the 2 Kanal and stands on the plot line on its left side, with an open side passage on its right behind the porch. It contains at least four bedrooms, each with an attached bathroom, a drawing room, a dining area, a TV lounge, a family lounge upstairs, a kitchen, a covered car porch for at least two cars, and a front lawn or planted strip.

The style of the 1 Kanal and 2 Kanal houses SHALL be contemporary: flat roofs with parapets, strong horizontal slabs, and a restrained palette of plaster, stone, wood and dark metal.

#### Scenario: Program check
- **WHEN** the computed facts of each design are listed
- **THEN** each design meets every count and feature in its program

#### Scenario: Storey limit
- **WHEN** the computed facts of any design are listed
- **THEN** its storey count is at most two

#### Scenario: No service rooms on the 1 Kanal only
- **WHEN** the rooms of the 1 Kanal and 2 Kanal are listed
- **THEN** the 1 Kanal has no servant room, laundry or store, and the 2 Kanal's rooms are unchanged

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

### Requirement: Non-rectangular plots
A design MAY declare its plot as a closed outline. Every rule and fact that depends on the plot SHALL then use that outline: the check for elements outside the plot, the plot area, and the boundary walls, which SHALL follow each edge of the outline. A design MAY declare a size label for its plot; without one, the size SHALL be computed from the area as before.

#### Scenario: Element outside an irregular plot
- **WHEN** an element sits inside the plot's bounding rectangle but outside its outline
- **THEN** the build fails and the error names the design, level and element

#### Scenario: Area from the outline
- **WHEN** the facts of a design with a plot outline are computed
- **THEN** the plot area is the area of the outline, not of its bounding rectangle

#### Scenario: Declared label
- **WHEN** a plot of about 5,000 sq ft declares the label "1 Kanal"
- **THEN** every place that shows the plot's size shows "1 Kanal"

### Requirement: Declared porch capacity
A porch MAY declare how many cars it holds, for a porch that parks cars partly on the driveway in front of it. The declared count SHALL replace the count computed from the porch's size, and SHALL suppress the warning that the porch is too small for a car.

#### Scenario: Short porch
- **WHEN** a porch 19′-9″ wide and 14′ deep declares two cars
- **THEN** its facts show two cars and no warning is printed for it

### Requirement: 1 Kanal matches its reference
The 1 Kanal SHALL reproduce the maintainer's supplied floor plans and elevation renders. Each room labelled on the plans SHALL measure within 3″ of its labelled size inside its walls, with two kinds of exception: the study, whose width gives way to the side terrace shown in the renders, and the three spaces whose label contradicts the walls drawn on the same plan (the first-floor front bedroom, the first-floor front bath and the driveway), which SHALL follow the drawn walls. Where plan and renders disagree, the renders SHALL decide the stone pier, the terrace door, the study corner window with its side terrace, and the entrance, which rises unbroken to the canopy with the left terrace stopping beside it; the plan SHALL decide everything else. The reference renders' cars and house number SHALL NOT be reproduced, and furniture SHALL NOT be modelled.

#### Scenario: Room sizes
- **WHEN** the clear size of each labelled room is compared with its size on the plans
- **THEN** every room is within 3″ on both sides, except the study and the three spaces that follow their drawn walls

#### Scenario: Maintainer review
- **WHEN** the generated floor plans are placed beside the supplied plans
- **THEN** the maintainer approves them before any render is made

### Requirement: Reference stays unnamed
The real project the 1 Kanal is drawn from, its client and the firm that drew the reference SHALL NOT be named in the site, its source, its docs or its OpenSpec artifacts, and the supplied plans and renders SHALL NOT be committed to the repository. The design SHALL be presented as a concept design, like every other design.

#### Scenario: Searching the repository
- **WHEN** the repository is searched for the names on the reference's title block, outside the existing content rules that ban them
- **THEN** there are no matches
