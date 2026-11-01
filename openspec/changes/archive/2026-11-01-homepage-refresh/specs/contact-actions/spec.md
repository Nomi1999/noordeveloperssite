## MODIFIED Requirements

### Requirement: Central contact configuration
All company contact data (company name, address, phone number, WhatsApp number, email, office hours, map location and the confirmed reassurance statements) SHALL be defined in a single configuration file, and every page, component and structured-data block SHALL read from it. Until the client supplies real details, the file SHALL hold clearly marked placeholder values. A value that is not yet known SHALL be empty, and pages SHALL omit it rather than print stand-in text. A build run with `NOOR_LAUNCH=1` SHALL fail while any placeholder remains; other builds SHALL warn.

#### Scenario: Updating the phone number
- **WHEN** the phone number is changed in the contact configuration and the site is rebuilt
- **THEN** every Call link, displayed number and structured-data entry uses the new number

#### Scenario: Placeholders are identifiable
- **WHEN** the contact configuration still holds placeholder values
- **THEN** each placeholder is marked so it can be found by searching the codebase

#### Scenario: Launch build with placeholders
- **WHEN** `NOOR_LAUNCH=1 npm run build` runs while a placeholder remains
- **THEN** the build fails and names every placeholder field

#### Scenario: Unknown address
- **WHEN** the office street address is empty
- **THEN** the footer, contact page and structured data omit the street line

## ADDED Requirements

### Requirement: Consistent action order
Wherever the Call and WhatsApp actions appear together, Call SHALL come first and WhatsApp second. Where there is room (outside the header and the mobile action bar), the Call action SHALL show the phone number.

#### Scenario: Closing band on desktop
- **WHEN** a desktop visitor views the closing call-to-action band
- **THEN** the Call action, showing the phone number, precedes the WhatsApp action
