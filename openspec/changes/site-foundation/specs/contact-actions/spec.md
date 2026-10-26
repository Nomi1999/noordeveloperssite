## Purpose

Makes calling or messaging Noor Developers on WhatsApp the easiest action on every page, driven by a single source of company contact data.

## ADDED Requirements

### Requirement: Central contact configuration
All company contact data (company name, address, phone number, WhatsApp number, email, office hours and map location) SHALL be defined in a single configuration file, and every page, component and structured-data block SHALL read from it. Until the client supplies real details, the file SHALL hold clearly marked placeholder values.

#### Scenario: Updating the phone number
- **WHEN** the phone number is changed in the contact configuration and the site is rebuilt
- **THEN** every Call link, displayed number and structured-data entry uses the new number

#### Scenario: Placeholders are identifiable
- **WHEN** the contact configuration still holds placeholder values
- **THEN** each placeholder is marked so it can be found by searching the codebase

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

#### Scenario: Wide screens
- **WHEN** the viewport is wide enough for the desktop layout
- **THEN** the sticky bar is not shown and Call/WhatsApp actions are available in the header

### Requirement: Accessible action labels
Call and WhatsApp actions SHALL have text labels (not icons only) and SHALL be reachable and operable by keyboard with a visible focus indicator.

#### Scenario: Screen reader announces actions
- **WHEN** a screen reader focuses a Call or WhatsApp action
- **THEN** it announces what the action does (for example "Call Noor Developers")
