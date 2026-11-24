## ADDED Requirements

### Requirement: Kitchen wall units clear of openings, with an optional hood
Wall units over a kitchen counter SHALL stop either side of any window or door in the wall behind them, whatever the cabinetry style. A room configured with `hood` SHALL also leave a gap in the wall units over each hob set into the counter and fill it with a chimney hood in the design's metal finish. No configuration SHALL get a hood unless it sets the key.

#### Scenario: Window behind the wall units
- **WHEN** the 2 Kanal kitchen's side counter, with the side window behind it, is rendered
- **THEN** the wall units run either side of the window and none covers it

#### Scenario: Hood over the hob
- **WHEN** the 2 Kanal kitchen's hob counter is rendered
- **THEN** wall units run either side of a dark-metal chimney hood over the hob, its flue rising to the ceiling

#### Scenario: Other houses unchanged
- **WHEN** the 5 Marla, 1 Kanal and 10 Marla kitchens are rendered again
- **THEN** their images match the earlier renders within one level per pixel

### Requirement: Solid stair base and open flight foot
A stair named in a design's `solidStairs` SHALL be built solid from the floor to its treads, with no slot between its flights and its light clear of the base, so no low space under a landing reads as a way through. With `openFlightFoot`, the balustrade round a stairwell SHALL stay open where a flight to the floor above starts at the hole's edge. Both SHALL be off unless a design's configuration turns them on.

#### Scenario: 2 Kanal main stair
- **WHEN** the 2 Kanal hall is seen from the front of the hall
- **THEN** the stair stands on a plastered solid base with the landing rail above it, and no space under the landing is visible

#### Scenario: Roof flight foot
- **WHEN** the 2 Kanal stair head is seen from the gallery
- **THEN** the foot of the flight to the roof is open, and glass runs only along the open sides of the stairwell

### Requirement: Notched double-height void
A double-height void that reaches the slab's outline, and so is exported as a notch rather than a hole, SHALL open the ceiling of the room below it exactly as a void that is a hole does: no ceiling, slots or downlights inside it.

#### Scenario: 2 Kanal lounge
- **WHEN** the lounge is seen from the family lounge or the gallery on the first floor
- **THEN** the lounge floor and its chimney are visible past the balustrade, with no ceiling across the void
