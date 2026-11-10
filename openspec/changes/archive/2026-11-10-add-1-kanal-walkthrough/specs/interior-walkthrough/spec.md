## MODIFIED Requirements

### Requirement: Rooms covered
A design's walkthrough SHALL let the visitor stand in every room of the house on every storey that the design's room list contains: living and bedroom spaces, kitchens, bathrooms, dressing rooms, laundry and utility rooms, stair, lobby, passage and lounge areas, and any terrace or sky court. The only exceptions are rooms that the walkthrough names as left out, each with a reason. A room too large or irregular to read from one spot SHALL have more than one viewpoint. The 5 Marla walkthrough SHALL cover the porch, drawing room, TV lounge and stair, kitchen, bedroom 1 and its bath on the ground floor, and the master bedroom and its bath, balcony, family lounge, sky court, bedroom 2 and its bath and the laundry on the first floor. The 1 Kanal walkthrough SHALL cover, on the ground floor, the stair lobby with the main stair, the drawing room, powder room, dining room, kitchen and its entry, TV lounge and its lobby, raw kitchen, bedrooms 1 and 2 with their baths and dressing room, and the electrical room. On the first floor it SHALL cover bedrooms 3 and 4 with their baths and dressing room, the master bedroom with its dress and bath, the lobby, TV lounge, kitchenette, study, both passages, the link, the pier, the stair, and the right, stair and side terraces. It SHALL leave out only the front terrace over the porch and the outside-entry washroom, because neither can be reached from inside the house. Its double-height entrance hall SHALL be seen from below on the ground floor and from the first-floor passage and stair beside the void.

#### Scenario: Every room reachable
- **WHEN** a visitor has used the walkthrough of the 5 Marla house
- **THEN** every room in its room list can be reached, and none is missing

#### Scenario: Every 1 Kanal room reachable
- **WHEN** a visitor has used the walkthrough of the 1 Kanal house
- **THEN** every ground- and first-floor room except the two named exceptions can be reached, including the smallest (the electrical room and the link)

#### Scenario: Room missing
- **WHEN** a walkthrough has no viewpoint for a room that it does not name as left out
- **THEN** the site build fails and names the room

#### Scenario: Double-height hall from both storeys
- **WHEN** a visitor stands in the 1 Kanal entrance hall and then on the first floor beside the void
- **THEN** the hall's full height is visible looking up from below, and the hall floor is visible looking down past a balustrade from above

### Requirement: Moving between rooms
Each view SHALL show white circles on the floor for the viewpoints reachable from it: one for each other spot in the same room, where that spot is, and one at each door, opening, open boundary or stair that leads to the next room, labelled with the destination's room name. An open boundary is a stretch where two rooms on the same storey meet with no wall, and its circle SHALL sit at the middle of that stretch. A circle SHALL be drawn flatter and smaller the further away it is, SHALL carry an up or down mark when it leads to another storey, and SHALL be selectable by mouse, finger and keyboard. Larger rooms SHALL have more than one spot so that the whole space can be seen. Selecting a circle SHALL move the visitor there with a short turn-and-zoom movement (none when reduced motion is requested), and SHALL open the next view looking the way they were travelling through a door, or into the room when moving between spots in one room. The view SHALL open fully zoomed out and tilted slightly down so the circles are in view. Reachable views SHALL follow how the house is connected, so the visitor never moves through a wall.

#### Scenario: Through a doorway
- **WHEN** a visitor selects the circle on the drawing room door
- **THEN** the TV lounge view opens, facing away from the drawing room

#### Scenario: Back again
- **WHEN** a visitor has moved from the drawing room to the TV lounge
- **THEN** the TV lounge view shows a circle back to the drawing room

#### Scenario: Between floors
- **WHEN** a visitor is on the stair view on the ground floor
- **THEN** a circle takes them to the first-floor view at the top of the stair, the first-floor view has a circle back down, and the stair that comes up from below is visible there beside the stair that goes up

#### Scenario: Through an open boundary
- **WHEN** a visitor is in the 1 Kanal first-floor TV lounge, which opens onto the kitchenette with no wall between them
- **THEN** a circle at the middle of the open stretch takes them to the kitchenette, and the kitchenette view has one back

#### Scenario: Through a wall
- **WHEN** a walkthrough links two rooms with no door, opening, open boundary or stair between them
- **THEN** the site build fails and names the link
