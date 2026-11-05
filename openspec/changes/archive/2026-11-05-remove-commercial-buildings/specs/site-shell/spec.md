## MODIFIED Requirements

### Requirement: Route map
The site SHALL serve the following routes: `/`, `/what-we-build`, `/designs`, `/designs/1-kanal`, `/designs/2-kanal`, `/about` and `/contact`. Until real content exists, each non-home route SHALL render a placeholder page inside the shared layout.

#### Scenario: Visiting a planned route
- **WHEN** a visitor opens any route in the route map
- **THEN** the page loads with the shared header and footer and a page title

#### Scenario: Visiting the removed plaza address
- **WHEN** a visitor opens `/designs/commercial/`
- **THEN** the site's 404 page is shown
