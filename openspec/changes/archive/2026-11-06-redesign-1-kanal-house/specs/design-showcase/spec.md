## ADDED Requirements

### Requirement: Describing an irregular plot
Wherever the site shows a plot's dimensions, a plot with an outline SHALL be described by its width range and depth, because a single width × depth would misstate it. A rectangular plot SHALL still be shown as width × depth.

#### Scenario: Corner plot on the designs index
- **WHEN** the 1 Kanal card is shown on `/designs/`
- **THEN** its plot reads as a width range and a depth in feet and inches, labelled 1 Kanal

#### Scenario: Rectangular plot
- **WHEN** the 2 Kanal card is shown on `/designs/`
- **THEN** its plot reads `75'-0" × 120'-0"`, as before
