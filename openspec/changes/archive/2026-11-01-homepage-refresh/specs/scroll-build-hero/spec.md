## MODIFIED Requirements

### Requirement: Scroll-linked playback
While the hero section is in view, the visitor's scroll position through the section SHALL determine what is displayed. The first sixth of the scroll span SHALL be an opening state that shows the finished dusk house; across the rest of the span the displayed frame SHALL run from frame 0 to frame 191. The hero SHALL be four viewport heights tall. Scrolling back SHALL play the sequence in reverse and return to the opening state. The page SHALL use the browser's native scrolling: the hero SHALL NOT intercept, delay or override scroll input.

#### Scenario: Opening the page
- **WHEN** the home page loads at the top
- **THEN** the finished dusk house is shown with the headline and the Call and WhatsApp actions

#### Scenario: Leaving the opening state
- **WHEN** the visitor scrolls past the first sixth of the hero's scroll span
- **THEN** the dusk image dissolves into frame 0 (the blueprint) and the build plays forward with further scrolling

#### Scenario: Scrolling halfway
- **WHEN** the visitor has scrolled halfway through the part of the span after the opening state
- **THEN** a frame from the middle of the sequence (around frame 95) is shown

#### Scenario: Scroll input untouched
- **WHEN** the visitor uses a trackpad, mouse wheel, touch, keyboard or the scrollbar
- **THEN** the page scrolls exactly as it would without the hero

### Requirement: Immediate first view
Before any script runs, the hero SHALL show the finished dusk poster with the headline, the Faisalabad line and the scroll cue. The poster SHALL be the page's prioritized image.

#### Scenario: First paint on a slow connection
- **WHEN** the home page loads on a throttled mobile connection
- **THEN** the dusk poster, headline and scroll cue are visible before any sequence frame downloads

### Requirement: Phase overlays
For each of the six phases, the hero SHALL show an HTML overlay with the phase number and name in the monospace face (for example `02 — STRUCTURE`) and one short line of copy, over a scrim that keeps the copy at WCAG AA contrast in both orientations. The headline SHALL stay visible, at a reduced size, during the phases. The hero SHALL show a vertical ruler-style progress indicator with six ticks and a fill that tracks progress; each tick SHALL be a button that scrolls to the start of its phase. Overlay changes SHALL transition briefly. Text SHALL NOT be baked into the frames.

#### Scenario: Entering a new phase
- **WHEN** scrolling crosses from phase 02 into phase 03
- **THEN** the overlay changes to `03 — WALLS` with its line of copy, and the ruler fill passes the fourth tick

#### Scenario: Jumping to a phase
- **WHEN** the visitor activates the `04` tick
- **THEN** the page scrolls to the start of the Finishing phase

### Requirement: Final call to action
In the opening state and during the Move in phase, the hero SHALL show the Call and WhatsApp actions, using a WhatsApp message that mentions the visitor came from the home page. The Move in phase SHALL show the closing message ("Fully finished. Bring your furniture and move in." or approved equivalent).

#### Scenario: End of the sequence
- **WHEN** the visitor reaches the last frame
- **THEN** the closing message and both actions are visible and operable

### Requirement: Static mode
When the visitor prefers reduced motion, has Save-Data or reduced data enabled, is on a connection reported as 3G or slower, or JavaScript is unavailable, the hero SHALL render as a single screen without scroll-linked playback, and SHALL download no sequence frames. It SHALL show the finished dusk image, the headline, the six phases as a static list, and the Call and WhatsApp actions.

#### Scenario: Reduced motion
- **WHEN** a visitor with reduced motion enabled opens the home page
- **THEN** the hero is one screen tall, shows the finished dusk image and the six phases as a list, and the network log shows no sequence frame requests

#### Scenario: Slow connection
- **WHEN** the browser reports an effective connection type of 3G or slower
- **THEN** the hero renders in static mode and no sequence frames are requested

#### Scenario: JavaScript disabled
- **WHEN** the home page is opened with JavaScript disabled
- **THEN** the hero shows the poster, headline, phase list and actions, and the rest of the page is reachable by normal scrolling

### Requirement: Accessibility
The canvas SHALL be hidden from assistive technology. All phase text SHALL be present in the document in reading order. A skip link ("Skip to the homes") SHALL be the first focusable element in the hero, SHALL be visible next to the scroll cue in scrub mode, and SHALL move focus to the content after the hero.

#### Scenario: Keyboard user skips the hero
- **WHEN** a keyboard user activates "Skip to the homes"
- **THEN** focus and scroll position move to the first section after the hero

#### Scenario: Pointer or touch user skips the hero
- **WHEN** a visitor taps or clicks the visible "Skip to the homes" link
- **THEN** the page moves to the first section after the hero
