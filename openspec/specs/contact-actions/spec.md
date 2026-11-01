## Purpose

Makes calling or messaging Noor Developers on WhatsApp the easiest action on every page, driven by a single source of company contact data.

## Requirements

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

### Requirement: Call action
The site SHALL provide a Call action that opens the device dialer with the company phone number in international format via a `tel:` link.

#### Scenario: Visitor taps Call on a phone
- **WHEN** a visitor taps a Call action
- **THEN** the device dialer opens with the company number prefilled

### Requirement: WhatsApp action with prefilled message
The site SHALL provide a WhatsApp action linking to a WhatsApp chat with the company number, with a prefilled message. Each page SHALL be able to set its own message (for example naming the design being viewed), with a sensible default when a page sets none.

#### Scenario: WhatsApp from a design page
- **WHEN** a visitor activates the WhatsApp action on a design page whose message mentions that design
- **THEN** WhatsApp opens a chat with the company number and the message text names that design

#### Scenario: WhatsApp from a page without a custom message
- **WHEN** a visitor activates the WhatsApp action on a page that sets no message
- **THEN** WhatsApp opens with the default greeting message

#### Scenario: Message encoding
- **WHEN** a prefilled message contains spaces, punctuation or non-ASCII characters
- **THEN** the message arrives in WhatsApp exactly as written

### Requirement: Sticky mobile action bar
On narrow screens, every page SHALL show a bar fixed to the bottom of the viewport with Call and WhatsApp actions. The bar SHALL NOT cover page content: the page SHALL reserve space for it, including the device's safe-area inset.

#### Scenario: Scrolling to the end of a page on a phone
- **WHEN** a visitor on a phone scrolls to the bottom of any page
- **THEN** the footer content is fully visible above the action bar

#### Scenario: Other Call and WhatsApp buttons on screen
- **WHEN** a section with its own Call and WhatsApp buttons (the closing contact band or the footer) is on screen on a phone
- **THEN** the action bar slides out of view and out of the tab order, and returns when that section leaves the screen

#### Scenario: Wide screens
- **WHEN** the viewport is wide enough for the desktop layout
- **THEN** the sticky bar is not shown and Call/WhatsApp actions are available in the header

### Requirement: Accessible action labels
Call and WhatsApp actions SHALL have text labels (not icons only) and SHALL be reachable and operable by keyboard with a visible focus indicator.

#### Scenario: Screen reader announces actions
- **WHEN** a screen reader focuses a Call or WhatsApp action
- **THEN** it announces what the action does (for example "Call Noor Developers")

### Requirement: Consistent action order
Wherever the Call and WhatsApp actions appear together, Call SHALL come first and WhatsApp second. Where there is room (outside the header and the mobile action bar), the Call action SHALL show the phone number.

#### Scenario: Closing band on desktop
- **WHEN** a desktop visitor views the closing call-to-action band
- **THEN** the Call action, showing the phone number, precedes the WhatsApp action
