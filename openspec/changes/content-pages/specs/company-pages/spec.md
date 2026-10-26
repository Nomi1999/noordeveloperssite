## Purpose

Introduces Noor Developers as a company and gives visitors every way to reach them, without trust signals or third-party embeds.

## ADDED Requirements

### Requirement: About page
`/about/` SHALL describe Noor Developers as a Faisalabad-based developer and builder of houses and commercial buildings, explain the meaning of *Noor* (light) and its connection to the brand, and describe their approach: design-led, built end to end, handed over fully finished. It SHALL NOT include years in business, project counts, statistics, testimonials, certifications, team photos or named real projects.

#### Scenario: About content check
- **WHEN** the About page is audited
- **THEN** it contains none of the excluded content types

### Requirement: Contact page
`/contact/` SHALL show prominent Call and WhatsApp actions first, then the phone number, WhatsApp number, email, office address and opening hours, all from the contact configuration. It SHALL provide an "Open in Google Maps" link built from the configured location. It SHALL NOT embed third-party maps, forms or widgets.

#### Scenario: Contact page network check
- **WHEN** the contact page loads
- **THEN** no request is made to any domain other than the site's own

#### Scenario: Opening the map
- **WHEN** a visitor selects "Open in Google Maps"
- **THEN** Google Maps opens at the configured office location

### Requirement: Email and phone are actionable
On the contact page, the email address SHALL be a `mailto:` link and the phone number a `tel:` link.

#### Scenario: Tapping the email
- **WHEN** a visitor taps the email address
- **THEN** their email app opens a new message to that address
