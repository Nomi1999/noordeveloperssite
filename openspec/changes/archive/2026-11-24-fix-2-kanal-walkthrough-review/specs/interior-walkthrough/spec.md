## ADDED Requirements

### Requirement: Routes only where a person can walk
A walkthrough's links SHALL follow routes a person can walk upright: through doors, openings, open sides between rooms and stairs, never under a stair landing or flight.

#### Scenario: 2 Kanal hall
- **WHEN** the visitor stands at the front of the 2 Kanal hall
- **THEN** the links lead to the lounge and the kitchen only, and the back hall, the stair foot, the bedrooms, the store and the laundry are reached from the lounge through its open side by Bedroom 1

#### Scenario: Walking past a solid stair base
- **WHEN** a walking tour lists a stair as `level/stair` in `solidStairs` (only the 2 Kanal lists `ground/stair`)
- **THEN** a line of sight between two spots on that floor that crosses the stair's footprint offers no walk, while spots standing on the stair (with `rise`) keep their links, and every other tour's links are unchanged

#### Scenario: Bath 4
- **WHEN** the visitor is in Bedroom 4
- **THEN** Bath 4's door is clear of the wardrobe and the visitor can walk through it
