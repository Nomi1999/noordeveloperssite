## Why

The home page needs one moment that makes Noor Developers memorable and shows what they do without a single photo. A house that builds itself as the visitor scrolls, from blueprint lines on an empty plot to a finished home glowing at dusk, tells the whole story ("we design, build and finish homes") and ends where the site wants every visitor to go: Call or WhatsApp.

## What Changes

- Choreograph and render the hero sequence of the 1 Kanal design in Blender, using the `render-pipeline` rig:
  - 192 frames across six phases: Design, Foundation, Structure, Walls, Finishing, Move in.
  - A continuous camera move with no cuts.
  - A day-long light arc: blue-hour dawn with glowing blueprint lines, daylight construction, golden-hour finishing, dusk with lit windows.
  - Separate landscape and portrait camera paths.
- Approve the choreography from a low-res preview video before the overnight final renders.
- Encode the sequence into tiers and formats with its manifest.
- Build the scroll-scrubbed hero player for the home page:
  - Native scroll, sticky full-screen canvas, smoothed frame stepping.
  - Progressive loading, so it is playable early and never blank.
  - Orientation, size-tier and format selection.
  - A bounded number of decoded frames, to stay within iPhone memory limits.
  - HTML phase labels with an architect-ruler progress indicator.
  - Call and WhatsApp actions on the final frame.
- Provide a static fallback for reduced motion, Save-Data and no JavaScript, plus a "skip the animation" link.

## Capabilities

### New Capabilities
- `hero-sequence`: what the rendered sequence shows: phases, frame budget, camera, light arc, orientations, poster frames.
- `scroll-build-hero`: how the home page plays it: scroll mapping, loading, memory, overlays, actions, fallbacks and accessibility.

### Modified Capabilities
<!-- None -->

## Impact

- New `render/shots/1-kanal-hero-{landscape,portrait}.json` and the hero animation config.
- New `public/hero/**` frames (roughly 20–30 MB per landscape high tier across formats on disk; a visitor downloads one orientation, one tier and one format only).
- New `src/components/hero/ScrollBuildHero.astro`, `hero-player.ts`, `hero-copy.ts`; the home page uses the hero.
- Machine time: the final sequence takes one or two overnight renders if Cycles is chosen for sequences.
- Depends on `render-pipeline` (rig, encoder, manifest format, engine decision) and `site-foundation` (Call and WhatsApp components).
