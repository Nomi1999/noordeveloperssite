## MODIFIED Requirements

### Requirement: Rooms covered
A design's walkthrough SHALL let the visitor stand in every room of the house on every storey that the design's room list contains: living and bedroom spaces, kitchens, bathrooms, dressing rooms, laundry and utility rooms, stair, lobby, passage and lounge areas, and any terrace or sky court. The only exceptions are rooms that the walkthrough names as left out, each with a reason. A room too large or irregular to read from one spot SHALL have more than one viewpoint. The 5 Marla walkthrough SHALL cover the porch, drawing room, TV lounge and stair, kitchen, bedroom 1 and its bath on the ground floor, and the master bedroom and its bath, balcony, family lounge, sky court, bedroom 2 and its bath and the laundry on the first floor. The 1 Kanal walkthrough SHALL cover, on the ground floor, the stair lobby with the main stair, the drawing room, powder room, dining room, kitchen and its entry, TV lounge and its lobby, raw kitchen, bedrooms 1 and 2 with their baths and dressing room, and the electrical room. On the first floor it SHALL cover bedrooms 3 and 4 with their baths and dressing room, the master bedroom with its dress and bath, the lobby, TV lounge, kitchenette, study, both passages, the link, the pier, the stair, and the right, stair and side terraces. It SHALL leave out only the front terrace over the porch and the outside-entry washroom, because neither can be reached from inside the house. Its double-height entrance hall SHALL be seen from below on the ground floor and from the first-floor passage and stair beside the void. The 10 Marla walkthrough SHALL cover, on the ground floor, the drawing room, foyer, TV lounge, dining room, kitchen, store, guest bath, and bedroom 1 and its bath, and on the first floor the master bedroom, dressing room and master bath, the laundry, the family lounge and stair head, the corridor, the closet, bedrooms 2 and 3 with their baths, and the terrace. It SHALL start at an outdoor viewpoint at the car gate, and SHALL leave out only the roof's stair room, which is not part of the tour, and the first-floor stair shaft, which has no floor to stand on and is seen from the stair's own spots.

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

#### Scenario: Every 10 Marla room reachable
- **WHEN** a visitor has used the walkthrough of the 10 Marla house
- **THEN** every ground- and first-floor room can be reached, the terrace included, and the roof's stair room and the first-floor stair shaft are the named exceptions

#### Scenario: Outdoor start
- **WHEN** a visitor starts the 10 Marla walkthrough
- **THEN** it opens at the car gate looking at the porch, and from the gate and from the car porch a circle at the main door leads into the TV lounge

## ADDED Requirements

### Requirement: Walking links
A walkthrough MAY set `walking: true`. The tour SHALL then offer, from every spot, each other spot on the same level and at the same height that the visitor can see within 30 feet, nearest first. A line of sight passes open floor, inside doors (rendered standing open), arches and glass sliding doors, including a glass sliding door out to a terrace; it is stopped by a wall, by a solid door in an outside wall (which stays shut), and by a hole in the floor such as a stairwell or a double-height void; a spot standing within 10 degrees of a nearer one is left out and reached through it. Each such marker is drawn on the destination spot, links across levels and links without a line of sight stay as authored, and the viewer keeps the visitor's heading when they move. A stair with a landing part way up SHALL have spots on the landing, so the visitor climbs from the foot of the stair to the landing, to the foot of the second flight, and to the top; a landing spot sees only spots at its own height. A walkthrough that does not set `walking` is unchanged. The 10 Marla and 1 Kanal set it; the 5 Marla does not.

#### Scenario: Seeing through a doorway
- **WHEN** two spots on one level have a clear line between them, passing walls only at a door, arch or sliding door
- **THEN** each offers the other as a place to walk to, with its marker on the other spot

#### Scenario: Not through a wall
- **WHEN** a wall with no opening on the line separates two spots
- **THEN** neither offers the other, unless an authored link joins them

#### Scenario: Through glass, not through a shut front door
- **WHEN** a spot inside the 10 Marla family lounge looks out through the glass sliding door to the terrace, and a spot on the car porch faces the closed main door
- **THEN** the lounge spot and the terrace spots offer each other, and the porch reaches the TV lounge only through the authored link at the main door

#### Scenario: Climbing by the landing
- **WHEN** a visitor stands at the foot of the 10 Marla or 1 Kanal stair
- **THEN** the stair leads to a spot on the landing, then to the foot of the second flight, then to the top of the stair on the floor above, and the same way back down

#### Scenario: A small house is left as it was
- **WHEN** a walkthrough does not set `walking`
- **THEN** its links, marker positions and marker heights are those it was authored with

### Requirement: Doorway spots
In a `walking` tour, each doorway between rooms that the visitor passes through SHALL have a spot just inside it, so the visitor walks door to door along a path of spots.


#### Scenario: Walking from room to room
- **WHEN** a visitor stands at a spot and looks through a doorway to the next room
- **THEN** a spot just inside that doorway is offered, and from it the next room's spots are in view
