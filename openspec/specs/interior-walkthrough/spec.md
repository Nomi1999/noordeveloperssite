## Purpose

Lets a visitor walk through a finished house as a series of 360° views, moving between rooms the way an apartment-complex tour does, so they can see what the inside of a Noor Developers house is like before they call.

## Requirements

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

### Requirement: Finished, unfurnished interiors
Every view SHALL show a finished house with no furniture, because Noor Developers delivers a finished house and the client brings only furniture. Views SHALL show finishes, fixed fittings, doors, windows, lighting and the view out of each window. They SHALL NOT show furniture, appliances other than fixed kitchen and bath fittings, people, brands or text.

#### Scenario: No furniture in view
- **WHEN** a visitor looks in every direction in any room
- **THEN** no sofa, bed, table or other loose furniture is visible

### Requirement: Looking around
In each view the visitor SHALL be able to turn through a full horizontal circle and look up and down, by dragging with a mouse or a finger, with the keyboard arrow keys, and (where the device offers it and the visitor allows it) by moving the device. The visitor SHALL be able to zoom in and out within a fixed range. A view SHALL open facing a chosen direction per room, so the first thing in view is the room's main feature.

#### Scenario: Dragging
- **WHEN** a visitor drags across a view
- **THEN** the view turns with the drag and stops when the drag ends

#### Scenario: Keyboard
- **WHEN** a keyboard user focuses the viewer and presses an arrow key
- **THEN** the view turns in that direction

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

### Requirement: Floor-plan map
The walkthrough SHALL show a small floor plan of the current storey with a marker for where the visitor is and which way they are facing, and SHALL let the visitor select any other viewpoint on it to go there. It SHALL have a control to switch storey, labelled with the level name. The plan SHALL be drawn from the same design data as the floor plans elsewhere on the page.

#### Scenario: Jumping from the map
- **WHEN** a visitor selects the kitchen on the map
- **THEN** the kitchen view opens and the map marker moves to the kitchen

#### Scenario: Turning updates the map
- **WHEN** a visitor turns the view
- **THEN** the facing indicator on the map turns with it

### Requirement: Room names and context
The walkthrough SHALL show the current room's name and storey at all times, and SHALL label the house as a concept design. It SHALL show no prices, availability, trust signals or regulatory wording, and its copy SHALL follow the site's voice rules.

#### Scenario: Room label
- **WHEN** a view is open
- **THEN** its room name and storey are visible without interaction

### Requirement: Loading
A walkthrough SHALL NOT download any panorama until the visitor starts it. Once started, the first view SHALL show a loading state until its image has loaded, and the views reachable from the current one SHALL be loaded in the background so that most moves show no wait. A failed image load SHALL show an error message and a way to retry, and SHALL NOT leave a blank or frozen viewer.

#### Scenario: Page opened, tour not started
- **WHEN** a visitor opens the design page and does not start the walkthrough
- **THEN** no panorama image is requested

#### Scenario: Neighbouring rooms ready
- **WHEN** a visitor has been in a view for a few seconds on a normal connection
- **THEN** selecting a circle opens the next view without a loading state

#### Scenario: Image fails
- **WHEN** a panorama cannot be loaded
- **THEN** the viewer shows a message and a retry control, and the rest of the page keeps working

### Requirement: Works without JavaScript
Without JavaScript, the walkthrough section SHALL show a still image of every room in tour order, each with its room name and an alternative text describing the room. It SHALL NOT show a broken or empty viewer.

#### Scenario: JavaScript off
- **WHEN** a visitor opens the 5 Marla page with JavaScript disabled
- **THEN** the walkthrough section lists a still and name for each room

### Requirement: Accessible and device-friendly
Every control (start, markers, map, storey switch, zoom, fullscreen, close) SHALL be reachable and usable by keyboard, have an accessible name, and show a visible focus state. Controls SHALL be large enough to use by touch. The walkthrough SHALL fit a phone screen in portrait, SHALL be usable in fullscreen, and SHALL NOT trap keyboard focus. Where a visitor has asked for reduced motion, transitions between views SHALL be instant instead of animated. Each room SHALL have a text description available to assistive technology.

#### Scenario: Keyboard-only tour
- **WHEN** a keyboard user tabs through the walkthrough
- **THEN** they can start it, select a circle and change storey, and can leave it again with Tab or Escape

#### Scenario: Phone in portrait
- **WHEN** a visitor opens the walkthrough on a 360px wide screen
- **THEN** the view, the room name and the map are all usable without horizontal page scrolling

### Requirement: Self-contained, no tracking
The viewer SHALL be served from the site itself, with no third-party scripts, styles, fonts or images, and SHALL NOT set cookies or send analytics or any visitor data to anyone.

#### Scenario: Network requests
- **WHEN** a visitor starts the walkthrough
- **THEN** every request goes to the site's own domain

### Requirement: Calls to action
The walkthrough section SHALL keep the design page's Call and WhatsApp actions within reach, with the prefilled message naming the design, and SHALL NOT replace the page's call-to-action section.

#### Scenario: Contacting from the tour
- **WHEN** a visitor on a phone is in the walkthrough
- **THEN** the sticky Call and WhatsApp bar remains visible or reachable
