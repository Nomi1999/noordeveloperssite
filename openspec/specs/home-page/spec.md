## Purpose

Defines what the home page shows after the scroll-build hero, so a visitor quickly understands Noor Developers' offer and is led to Call or WhatsApp.

## Requirements

### Requirement: Section order
After the hero, the home page SHALL present these sections in order:

1. Two ways to work with Noor
2. Fully finished
3. What we build
4. How we work
5. Featured design
6. Closing call to action

#### Scenario: Reading the home page
- **WHEN** a visitor scrolls past the hero
- **THEN** the six sections appear in the listed order

### Requirement: Two ways to work
The home page SHALL present the two offerings side by side (stacked on phones), each with an image from the site's own renders:
- **Buy a Noor home**: houses Noor Developers build on their own plots and sell finished, shown with a finished house.
- **Build on your plot**: Noor designs, architects and builds on the client's land, shown with the blueprint frame on the empty plot.

Each offering SHALL have a one-line summary and a link to the What We Build page. Home page section headers SHALL NOT carry section numbers or eyebrow labels.

#### Scenario: Offerings visible
- **WHEN** the section is in view
- **THEN** both offerings are shown with their images, summaries and links

### Requirement: Fully finished section
The home page SHALL explain that every Noor build is handed over fully finished, so the owner only brings furniture, and SHALL show the shared fully finished checklist in a compact form.

#### Scenario: Checklist source
- **WHEN** the shared checklist data changes
- **THEN** the home page section shows the updated items after rebuild

### Requirement: What we build section
The home page SHALL show houses and commercial buildings, each with a render and a link: houses to the designs index, commercial to the commercial plaza design. The houses card SHALL say they build houses of all sizes, mainly 1 Kanal and 2 Kanal.

#### Scenario: Navigating to designs
- **WHEN** a visitor selects the houses card
- **THEN** they arrive at the designs index

### Requirement: How we work section
The home page SHALL show what happens after a visitor gets in touch as four numbered steps: talk to us, meet at the office, review the design, follow it to the keys. The build itself is shown by the hero and SHALL NOT be repeated as a step. Each step SHALL have a one-sentence description and SHALL make only claims the maintainer has confirmed (no visits to houses under construction). The steps SHALL NOT mention approvals, permits or any regulatory process.

#### Scenario: Process steps
- **WHEN** the section is in view
- **THEN** four numbered steps are shown in order, each with a short description

### Requirement: Featured design and closing call to action
The home page SHALL feature the 1 Kanal design with its dusk render, key facts and a link to its page. It SHALL end with a full-width call-to-action band over a dusk render, with a short headline, the Call and WhatsApp actions, and the confirmed reassurance statements and opening hours from the contact configuration.

#### Scenario: Closing band
- **WHEN** the visitor reaches the end of the home page content
- **THEN** a call-to-action band with both actions, the reassurance statements and the opening hours is visible above the footer
