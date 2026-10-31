## Purpose

Plays the construction sequence on the home page as the visitor scrolls, polished on every device, with fallbacks for reduced motion, slow connections and no JavaScript, and ending in the Call and WhatsApp actions.

## ADDED Requirements

### Requirement: Scroll-linked playback
While the hero section is in view, the visitor's scroll position through the section SHALL determine the displayed frame: the top of the section shows frame 0 and its end shows frame 191. Scrolling back SHALL play the sequence in reverse. The page SHALL use the browser's native scrolling: the hero SHALL NOT intercept, delay or override scroll input.

#### Scenario: Scrolling halfway
- **WHEN** the visitor has scrolled through half of the hero section
- **THEN** a frame from the middle of the sequence (around frame 95) is shown

#### Scenario: Scroll input untouched
- **WHEN** the visitor uses a trackpad, mouse wheel, touch, keyboard or the scrollbar
- **THEN** the page scrolls exactly as it would without the hero

### Requirement: Smooth frame stepping
Frame changes SHALL be drawn in step with the display refresh and eased toward the scroll target, so fast scrolling doesn't produce visible jumps. The hero SHALL do no per-frame work when it is out of view.

#### Scenario: Hero scrolled away
- **WHEN** the hero section is entirely out of the viewport
- **THEN** no animation-frame callbacks run for it

### Requirement: Immediate first view
Before any script runs, the hero SHALL show the poster image with the headline and a scroll cue. The poster SHALL be the page's prioritized image.

#### Scenario: First paint on a slow connection
- **WHEN** the home page loads on a throttled mobile connection
- **THEN** the poster, headline and scroll cue are visible before any sequence frame downloads

### Requirement: Progressive loading
Sequence frames SHALL load in passes of increasing density (sparse frames across the whole sequence first, then filling the gaps), starting nearest the current position. Whenever the exact frame isn't loaded, the nearest loaded frame SHALL be shown. The hero SHALL never show a blank canvas.

#### Scenario: Scrolling before loading finishes
- **WHEN** the visitor scrolls to the middle of the hero while only a sparse set of frames has loaded
- **THEN** the nearest loaded frame is shown, and it is replaced by the exact frame once that frame arrives

### Requirement: Orientation, tier and format selection
The player SHALL choose the portrait sequence for viewports taller than they are wide and the landscape sequence otherwise. It SHALL choose the higher size tier only when the displayed size times the device pixel ratio needs it and the visitor hasn't requested reduced data. It SHALL use AVIF where supported and WebP otherwise. It SHALL download frames of only one orientation, tier and format at a time, and switch orientation only when the viewport's orientation actually changes.

#### Scenario: Phone rotated
- **WHEN** a phone is rotated from portrait to landscape while viewing the hero
- **THEN** the hero switches to the landscape sequence at the matching frame, and does not reload on mere address-bar resizing

### Requirement: Bounded memory
The player SHALL keep compressed frames in memory but hold only a bounded window of decoded frames around the current position, releasing decoded frames outside it. The window SHALL be smaller on devices that report low memory or are mobile.

#### Scenario: Repeated full scrubs on an iPhone
- **WHEN** a visitor scrubs the whole sequence back and forth five times in iOS Safari
- **THEN** the tab does not reload or crash and the number of decoded frames never exceeds the window size

### Requirement: Phase overlays
For each of the six phases, the hero SHALL show an HTML overlay with the phase number and name in the monospace face (for example `02 — STRUCTURE`) and one short line of copy. It SHALL also show a vertical ruler-style progress indicator with six ticks and a fill that tracks progress. Overlay changes SHALL transition briefly. Text SHALL NOT be baked into the frames.

#### Scenario: Entering a new phase
- **WHEN** scrolling crosses from phase 02 into phase 03
- **THEN** the overlay changes to `03 — WALLS` with its line of copy, and the ruler fill passes the fourth tick

### Requirement: Final call to action
During the Move in phase, the hero SHALL show the closing message ("Fully finished. Bring your furniture and move in." or approved equivalent) with the Call and WhatsApp actions, using a WhatsApp message that mentions the visitor came from the home page.

#### Scenario: End of the sequence
- **WHEN** the visitor reaches the last frame
- **THEN** the closing message and both actions are visible and operable

### Requirement: Static mode
When the visitor prefers reduced motion, has Save-Data enabled, or JavaScript is unavailable, the hero SHALL render as a single screen without scroll-linked playback, and SHALL download no sequence frames. It SHALL show the headline, the six phases as a static list, and the Call and WhatsApp actions. With reduced motion, the image SHALL be the finished dusk frame.

#### Scenario: Reduced motion
- **WHEN** a visitor with reduced motion enabled opens the home page
- **THEN** the hero is one screen tall, shows the finished dusk image and the six phases as a list, and the network log shows no sequence frame requests

#### Scenario: JavaScript disabled
- **WHEN** the home page is opened with JavaScript disabled
- **THEN** the hero shows the poster, headline, phase list and actions, and the rest of the page is reachable by normal scrolling

### Requirement: Accessibility
The canvas SHALL be hidden from assistive technology. All phase text SHALL be present in the document in reading order. A "Skip the animation" link SHALL be the first focusable element in the hero and SHALL move focus to the content after the hero.

#### Scenario: Keyboard user skips the hero
- **WHEN** a keyboard user activates "Skip the animation"
- **THEN** focus and scroll position move to the first section after the hero

### Requirement: Loading budget
The hero's script SHALL be under 15 KB compressed. Sequence downloads SHALL start only after the poster has rendered, and SHALL be lower priority than the page's own assets.

#### Scenario: Lighthouse on mobile
- **WHEN** Lighthouse mobile is run on the home page
- **THEN** Largest Contentful Paint is the poster and Total Blocking Time attributable to the hero is under 50 ms
