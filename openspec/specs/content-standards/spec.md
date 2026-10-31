## Purpose

Keeps all site copy within the client's rules (no prices, no regulatory content, no real projects, no trust signals) and in one consistent voice, enforced automatically and approved by people before launch.

## Requirements

### Requirement: Banned content audit
The build SHALL fail if built page text contains banned content. Banned content covers:
- prices or currency amounts (for example "PKR", "Rs", "lakh", "crore", "per sq ft");
- availability or sale-status words ("sold", "available now", "booking");
- regulatory terms ("approval", "NOC", "permit", authority names);
- real project or scheme names (including "Wapda City");
- trust-signal phrasing ("years of experience", "projects completed", "satisfied clients", "certified", "testimonial").

The banned list SHALL live in one editable file, and failures SHALL name the page and the matched text.

#### Scenario: Price slips into copy
- **WHEN** a page's copy includes "Starting from PKR"
- **THEN** the build fails and names that page and phrase

### Requirement: Voice and language
All copy SHALL be in English, in short, plain, confident sentences, addressed to the visitor as "you", with no superlatives that imply unprovable claims ("best", "No. 1", "leading").

#### Scenario: Unprovable superlative
- **WHEN** copy includes "the best builders in Faisalabad"
- **THEN** the content audit flags it

### Requirement: Shared copy in data files
Reusable copy (the fully finished checklist, offerings, process steps, building types, hero copy) SHALL be defined once in data files and reused wherever it appears.

#### Scenario: Editing a checklist item
- **WHEN** a fully finished item is edited in its data file
- **THEN** every page showing the checklist shows the edited item after rebuild

### Requirement: Copy approval
The fully finished checklist, the About copy, and the hero headline and phase lines SHALL be approved by the maintainer, with the client's confirmation for the checklist, before launch. Approval SHALL be recorded in the repository.

#### Scenario: Launch readiness
- **WHEN** launch readiness is checked
- **THEN** a recorded approval exists for each of the three items

### Requirement: Restrained motion
Any section reveal motion SHALL be short and subtle (dimension-line rules drawing in, content rising a few pixels), SHALL run only on first view, and SHALL NOT delay access to content by more than 400 ms. With reduced motion, all content SHALL be visible immediately with no motion.

#### Scenario: Reduced motion on content pages
- **WHEN** reduced motion is on and a visitor scrolls any content page
- **THEN** all content is visible immediately and nothing animates
