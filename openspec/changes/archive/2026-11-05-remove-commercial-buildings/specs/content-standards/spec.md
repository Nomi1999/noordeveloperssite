## MODIFIED Requirements

### Requirement: Banned content audit
The build SHALL fail if built page text contains banned content. Banned content covers:
- prices or currency amounts (for example "PKR", "Rs", "lakh", "crore", "per sq ft");
- availability or sale-status words ("sold", "available now", "booking");
- regulatory terms ("approval", "NOC", "permit", authority names);
- real project or scheme names (including "Wapda City");
- trust-signal phrasing ("years of experience", "projects completed", "satisfied clients", "certified", "testimonial");
- claims of commercial work ("commercial", "plaza").

The banned list SHALL live in one editable file, and failures SHALL name the page and the matched text.

#### Scenario: Price slips into copy
- **WHEN** a page's copy includes "Starting from PKR"
- **THEN** the build fails and names that page and phrase

#### Scenario: Commercial work slips into copy
- **WHEN** a page's copy includes "commercial buildings"
- **THEN** the build fails and names that page and phrase
