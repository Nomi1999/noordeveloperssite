## MODIFIED Requirements

### Requirement: Rooms covered
A design's walkthrough SHALL let the visitor stand in every room of the house on every storey that the design's room list contains: living and bedroom spaces, kitchens, bathrooms, dressing rooms, laundry and utility rooms, stair, lobby, passage and lounge areas, and any terrace or sky court. The only exceptions are rooms that the walkthrough names as left out, each with a reason. A room too large or irregular to read from one spot SHALL have more than one viewpoint. The 5 Marla walkthrough SHALL cover the porch, drawing room, TV lounge and stair, kitchen, bedroom 1 and its bath on the ground floor, and the master bedroom and its bath, balcony, family lounge, sky court, bedroom 2 and its bath and the laundry on the first floor. The 1 Kanal walkthrough SHALL cover, on the ground floor, the stair lobby with the main stair, the drawing room, powder room, dining room, kitchen and its entry, TV lounge and its lobby, raw kitchen, bedrooms 1 and 2 with their baths and dressing room, and the electrical room. On the first floor it SHALL cover bedrooms 3 and 4 with their baths and dressing room, the master bedroom with its dress and bath, the lobby, TV lounge, kitchenette, study, both passages, the link, the pier, the stair, and the right, stair and side terraces. It SHALL leave out only the front terrace over the porch and the outside-entry washroom, because neither can be reached from inside the house. Its double-height entrance hall SHALL be seen from below on the ground floor and from the first-floor passage and stair beside the void. The 10 Marla walkthrough SHALL cover, on the ground floor, the drawing room, foyer, TV lounge, dining room, kitchen, store, guest bath, and bedroom 1 and its bath, and on the first floor the master bedroom, dressing room and master bath, the laundry, the family lounge and stair head, the corridor, the closet, bedrooms 2 and 3 with their baths, and the terrace. It SHALL start at an outdoor viewpoint at the car gate, and SHALL leave out only the roof's stair room, which is not part of the tour, and the first-floor stair shaft, which has no floor to stand on and is seen from the stair's own spots. The 2 Kanal walkthrough SHALL cover, on the ground floor, the foyer, drawing room, powder room, dining room, the double-height lounge, the stair hall with the main stair, the kitchen, the back kitchen, bedroom 1 with its dressing room and bath, the store, bedroom 2 with its bath, and the laundry, and on the first floor the gallery round the void with the stair head, bedrooms 3, 4, 5 and 6 with their baths and dressing rooms, the master bedroom with its dressing room and bath, the family lounge, and the terrace over the porch. It SHALL start at an outdoor viewpoint at the car gate, with a second outdoor spot on the car porch, and SHALL leave out only the servant room and its bath, because neither can be reached from inside the house, the guard cabin at the gate, because it is a separate building entered from outside, and the roof's stair room, which is not part of the tour. Its double-height lounge SHALL be seen from the lounge floor looking up and from the gallery on the first floor looking down past the balustrade.

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

#### Scenario: Every 2 Kanal room reachable
- **WHEN** a visitor has used the walkthrough of the 2 Kanal house
- **THEN** every ground- and first-floor room except the servant suite, the guard cabin and the roof stair room can be reached, including the two smallest (the laundry and the powder room), and each of the seven bedrooms has a spot in it

#### Scenario: 2 Kanal lounge from both storeys
- **WHEN** a visitor stands in the 2 Kanal lounge and then on the first-floor gallery beside the void
- **THEN** the lounge's walls are seen rising 22 feet to the roof above, and from the gallery the lounge floor is seen below past a continuous balustrade, with the stair climbing beside it

#### Scenario: 2 Kanal outdoor start
- **WHEN** a visitor starts the 2 Kanal walkthrough
- **THEN** it opens at the car gate looking up the drive at the car porch and the glass terrace above it, and from the gate and the porch a circle at the main door leads into the foyer

#### Scenario: One door to the outside
- **WHEN** a room's only door opens to the outside of the house, as with the 2 Kanal servant room and guard cabin
- **THEN** that room is named as left out with that reason and the site build still passes
