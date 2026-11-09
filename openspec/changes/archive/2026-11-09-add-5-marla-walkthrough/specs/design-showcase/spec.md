## ADDED Requirements

### Requirement: Walkthrough section
A design detail page SHALL show a walkthrough section, placed after the floor plans, when the design has a walkthrough, and SHALL show nothing new when it does not. The section SHALL state that the walkthrough shows the concept design finished and without furniture, that the client brings their own, and SHALL offer a clear control to start it. Adding a walkthrough to another design SHALL need only content (its panoramas, viewpoints and room descriptions), not new page code.

#### Scenario: Design with a walkthrough
- **WHEN** a visitor opens `/designs/5-marla/`
- **THEN** a walkthrough section appears after the floor plans with a control to start it

#### Scenario: Design without one
- **WHEN** a visitor opens `/designs/1-kanal/`
- **THEN** the page has no walkthrough section and is otherwise unchanged

#### Scenario: Another design later
- **WHEN** panoramas and viewpoints are added for a second design
- **THEN** its page shows the walkthrough section with no page code changes
