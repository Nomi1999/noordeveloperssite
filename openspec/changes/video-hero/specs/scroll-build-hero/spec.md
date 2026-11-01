## ADDED Requirements

### Requirement: Autoplay playback
In motion mode the hero SHALL be one screen tall below the header. It SHALL open on the video's first frame (the blueprint) with the headline and the Design phase overlay, and SHALL start loading and playing the build video as soon as the hero script runs and the hero is in view, with no hold on a still image. It SHALL play once, from frame 0 to the last frame. At the end the video SHALL fade out to the finished dusk poster. The page's scrolling SHALL NOT be affected.

#### Scenario: Opening the page
- **WHEN** the home page loads at the top
- **THEN** the blueprint is shown with the headline and `01 — DESIGN`, and the build plays straight away

#### Scenario: End of the video
- **WHEN** the video reaches its last frame
- **THEN** it fades back to the dusk poster and stays there

#### Scenario: Autoplay refused
- **WHEN** the browser refuses to start the video without a gesture
- **THEN** the blueprint and the Design phase stay, and the playback button offers Play

### Requirement: Playback control
While motion mode is active and the video is ready, the hero SHALL show one button that pauses the video while it plays, resumes it while paused, and replays it from the start after it ends, labelled for its current action and at least 44px tall. A pause by the visitor SHALL persist until they resume it.

#### Scenario: Pausing the build
- **WHEN** the visitor activates Pause during playback
- **THEN** the video stops on its current frame and the button offers Play

#### Scenario: Replaying
- **WHEN** the visitor activates Replay after the video has ended
- **THEN** the video plays again from the blueprint

### Requirement: Off-screen pause
The video SHALL pause while the hero is out of the viewport or the tab is hidden, and SHALL resume when it is back unless the visitor paused it or it has ended. The hero SHALL do no per-frame work while the video is not playing.

#### Scenario: Hero scrolled away
- **WHEN** the hero section is scrolled entirely out of the viewport during playback
- **THEN** the video pauses, and it resumes when the hero is scrolled back into view

### Requirement: Video sources
The player SHALL choose the portrait video for viewports taller than they are wide and the landscape video otherwise, and the first source in the manifest the browser reports it can play. It SHALL download only one orientation and format, and switch orientation only when the viewport's orientation actually changes, keeping the playback position.

#### Scenario: Phone rotated
- **WHEN** a phone is rotated from portrait to landscape while the hero is on screen
- **THEN** the hero switches to the landscape video at the same time position, and does not reload on mere address-bar resizing

#### Scenario: Browser without AV1
- **WHEN** the browser cannot play the AV1 source
- **THEN** it plays the H.264 source

## MODIFIED Requirements

### Requirement: Immediate first view
Before any script runs, the hero SHALL show its first view with the headline: in motion mode the video's first frame (the blueprint) and the Design phase overlay; in static mode the finished dusk poster, the Faisalabad line and the six phases. The first-frame image SHALL be loaded only in motion mode, and the video's first frame SHALL replace it without a visible change.

#### Scenario: First paint on a slow connection
- **WHEN** the home page loads on a throttled mobile connection in motion mode
- **THEN** the blueprint and headline are visible before the video has downloaded

### Requirement: Phase overlays
For each of the six phases, the hero SHALL show an HTML overlay with the phase number, counted from 01, and name in the monospace face (for example `03 — STRUCTURE`) and one short line of copy, over a scrim that keeps the copy at WCAG AA contrast in both orientations, following the playing frame. The headline SHALL stay visible, at a reduced size, during the phases. The hero SHALL show a vertical ruler-style progress indicator with six ticks and a fill that tracks playback; each tick SHALL be a button that seeks the video to the start of its phase and plays from there, with a target at least 44px tall where the ruler is tall enough for six. The current tick SHALL show its phase name, and the ruler labels SHALL stay at WCAG AA contrast over every frame. Overlay changes SHALL transition briefly. Text SHALL NOT be baked into the video.

#### Scenario: Entering a new phase
- **WHEN** playback crosses from phase 02 into phase 03
- **THEN** the overlay changes to `03 — STRUCTURE` with its line of copy, and the ruler fill passes the third tick

#### Scenario: Jumping to a phase
- **WHEN** the visitor activates the `04` tick
- **THEN** the video seeks to the start of the Walls phase and plays on

### Requirement: Final call to action
During the Move in phase, including after the video ends, and throughout the static hero, the hero SHALL show the Call and WhatsApp actions, using a WhatsApp message that mentions the visitor came from the home page. The Move in phase SHALL show the closing message ("Fully finished. Bring your furniture and move in." or approved equivalent).

#### Scenario: End of the sequence
- **WHEN** the video has ended
- **THEN** the closing message and both actions are visible and operable

### Requirement: Static mode
When the visitor prefers reduced motion, has Save-Data or reduced data enabled, is on a connection reported as 3G or slower, or JavaScript is unavailable, the hero SHALL render as a single screen without video, and SHALL download no video. It SHALL show the finished dusk image, the headline, the six phases as a static list, and the Call and WhatsApp actions.

#### Scenario: Reduced motion
- **WHEN** a visitor with reduced motion enabled opens the home page
- **THEN** the hero is one screen tall, shows the finished dusk image and the six phases as a list, and the network log shows no video requests

#### Scenario: Slow connection
- **WHEN** the browser reports an effective connection type of 3G or slower
- **THEN** the hero renders in static mode and no video is requested

#### Scenario: JavaScript disabled
- **WHEN** the home page is opened with JavaScript disabled
- **THEN** the hero shows the poster, headline, phase list and actions, and the rest of the page is reachable by normal scrolling

### Requirement: Accessibility
The video SHALL be hidden from assistive technology. All phase text SHALL be present in the document in reading order. A skip link ("Skip past the build") SHALL be the first focusable element in the hero, SHALL be visible when focused, and SHALL move focus to the content after the hero.

#### Scenario: Keyboard user skips the hero
- **WHEN** a keyboard user activates "Skip past the build"
- **THEN** focus and scroll position move to the first section after the hero

#### Scenario: Pointer or touch user skips the hero
- **WHEN** a visitor scrolls, swipes or uses the scrollbar on the hero
- **THEN** the page scrolls past the one-screen hero as it would past any section

### Requirement: Loading budget
The hero's script SHALL be under 15 KB compressed. The video manifest SHALL be embedded in the page, so the video download starts without waiting for another request. The first-frame image SHALL be under 30 KB.

#### Scenario: Lighthouse on mobile
- **WHEN** Lighthouse mobile is run on the home page
- **THEN** Largest Contentful Paint is the hero's first view and Total Blocking Time attributable to the hero is under 50 ms

## REMOVED Requirements

### Requirement: Scroll-linked playback
**Reason**: The hero plays the build as a video instead of scrubbing frames with the scroll position.
**Migration**: See Autoplay playback.

### Requirement: Smooth frame stepping
**Reason**: The browser's video decoder steps frames; there is no eased canvas drawing.
**Migration**: See Off-screen pause for the no-work-when-hidden rule.

### Requirement: Progressive loading
**Reason**: One video file per orientation replaces individually loaded frames.
**Migration**: See Video sources.

### Requirement: Orientation, tier and format selection
**Reason**: There are no frame tiers; the video has one size per orientation and the format comes from `canPlayType`.
**Migration**: See Video sources.

### Requirement: Bounded memory
**Reason**: No decoded frames are held by the page; the browser's video pipeline manages memory.
**Migration**: None.
