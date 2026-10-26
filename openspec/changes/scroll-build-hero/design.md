## Context

`render-pipeline` provides:
- a scene whose `build` (0–6) and `time_of_day` (0–1) properties drive the construction rig and lighting;
- resumable frame rendering;
- an encoder that writes AVIF/WebP tiers and a manifest with phase ranges;
- a recorded engine decision.

`site-foundation` provides the Call and WhatsApp components and tokens. See proposal.md for motivation and specs/ for requirements.

## Goals / Non-Goals

**Goals:**
- Feel: weighty, calm, cinematic. Smooth on a mid-range Android phone, not only on a desktop.
- Progressive enhancement: the HTML alone is a complete, good-looking hero.

**Non-Goals:**
- Scroll-jacking or smooth-scroll libraries. Native scroll is kept on purpose.
- Sound, video files, WebGL.
- Sequences for the 2 Kanal or commercial designs.

## Decisions

### Choreography as data
`render/shots/1-kanal-hero-<orientation>.json` holds keyframes for camera position, target and lens, plus `build` and `time_of_day` per frame. Within each 32-frame phase:
- `build` rises from phase start to end over frames ~3–27 with ease-in-out, then holds, so the visitor has a moment to read the label.

`time_of_day` follows the arc:
| Frames | Value |
|---|---|
| 0–31 | 0.95 → 0.9 (blue hour; the accent blueprint lines glow) |
| 32–48 | eases to 0 |
| 48–127 | 0 (daylight) |
| 128–159 | 0 → 0.55 (golden) |
| 160–191 | 0.55 → 1.0 (dusk; interior lights ramp in) |

The camera follows a spline through 5–6 key positions with constant-ish angular speed: an orbit of ~70°, descending from ~18 m to ~1.6 m eye height. Lens moves from ~28 mm to ~35 mm. The portrait path sits further back and higher, so the whole house fits vertically.

*Alternative:* a separate keyframed `.blend` file. Rejected, because the pipeline rule is that no hand-edited `.blend` is a source of truth.

### Preview first, final overnight
1. EEVEE preview at 960×540 and 540×960, encoded to MP4 by Blender's FFmpeg output for approval.
2. Final render at full tier size (1920×1080 and 1080×1920) with the chosen engine, using the resumable frame mode.
3. `encode-renders.mjs` produces AVIF/WebP at both tiers plus `public/hero/manifest.json`.

Cycles estimate: ~1–3 min per frame on this CPU → 192 frames ≈ 3–10 h per orientation. Run one orientation per night.

### Page structure (progressive enhancement)
```html
<section class="hero" data-hero>
  <a class="skip" href="#after-hero">Skip the animation</a>
  <div class="hero__stage">                          <!-- sticky 100svh when scrubbing -->
    <picture>                                         <!-- poster, fetchpriority=high -->
      <source media="(prefers-reduced-motion: reduce) and (orientation: portrait)" srcset="portrait f191">
      <source media="(prefers-reduced-motion: reduce)" srcset="landscape f191">
      <source media="(orientation: portrait)" srcset="portrait f0">
      <img src="landscape f0" alt="…">
    </picture>
    <canvas aria-hidden="true"></canvas>
    <h1>headline</h1>
    <ol class="hero__phases">six phases, in DOM order</ol>
    <div class="hero__ruler" aria-hidden="true"></div>
    <div class="hero__cta">Call · WhatsApp</div>
  </div>
</section>
<div id="after-hero" tabindex="-1">
```
The default CSS is static mode: 100svh tall, phases shown as a list, CTA visible. A tiny inline `<head>` script adds `html.hero-scrub` when JS is on, reduced motion is off and Save-Data is off. Only under that class does the section become `calc(6 * 100svh + 100svh)` tall with a sticky stage, show one phase at a time and hide the list layout. `<picture>` media queries pick the reduced-motion poster without JS. Units are `svh` so mobile address-bar changes don't resize the stage.

### Player (`hero-player.ts`, vanilla, < 15 KB gz)
- **Progress:** `p = clamp((scrollY − sectionTop) / (sectionHeight − innerHeight))`. Target frame `= p × 191`. The shown frame eases toward the target with exponential smoothing (time constant ~90 ms). rAF runs only while the target and shown frame differ and the section intersects the viewport (IntersectionObserver).
- **Selection:** orientation by `innerWidth < innerHeight`. Tier: high if `stageWidth × min(dpr, 2) > 1400` (landscape) or `> 800` (portrait), and `!saveData`. Format: AVIF if a 1×1 AVIF data URI decodes, else WebP. The orientation is re-evaluated only on an orientation change event or when the aspect ratio crosses 1.
- **Loading:** fetch `manifest.json`, then a queue in passes with strides 32, 16, 8, 4, 2, 1, each pass ordered by distance from the current frame. Concurrency 6, `fetch(..., { priority: 'low' })`, starting after the poster's `decode()` resolves. Responses are stored as `Blob`s (compressed, ~100 KB each).
- **Decoding:** an LRU of `ImageBitmap`s (`createImageBitmap(blob)`) for frames within ±W of the current frame. W = 24 on desktop, 10 on mobile or when `deviceMemory ≤ 4`. Evicted bitmaps are `close()`d. A 1920×1080 bitmap is about 8 MB, so the mobile window stays around 170 MB at most.
- **Drawing:** the canvas backing store is the stage size × min(dpr, 2), drawn with cover-fit via `drawImage`. If the exact bitmap isn't decoded, the nearest decoded one is drawn. The canvas is revealed (poster faded out) only once the first decoded frame is drawn.
- **Overlays:** the phase index comes from the manifest ranges. Changing phase toggles `data-phase` on the stage, and CSS handles transitions (opacity and a 12px rise, 300 ms). The ruler fill is `transform: scaleY(p)`. The CTA shows during the Move in phase.

### Copy lives in one file
`hero-copy.ts` holds the headline, the six phase names and lines, and the closing message. Draft:
| Phase | Line |
|---|---|
| 00 Design | "Every home starts as a drawing, shaped around your plot and your family." |
| 01 Foundation | "Solid ground first." |
| 02 Structure | "A concrete frame rises, floor by floor." |
| 03 Walls | "Brick by brick, the rooms take shape." |
| 04 Finishing | "Floors, kitchens, baths, wardrobes, lights. Every detail done." |
| 05 Move in | "Fully finished. Bring your furniture and move in." |

The headline (draft): "We design, build and finish homes." Final wording is approved in the `content-pages` review.

## Risks / Trade-offs

- [iOS Safari memory kills the tab] → Compressed blobs plus a small decoded window, tested on a real iPhone (task). If needed, drop to the low tier on iOS.
- [Scrubbing feels steppy at 192 frames over 600svh] → Smoothing plus phase holds. If still steppy, render 288 frames (render cost +50%). The manifest-driven player needs no code change.
- [Cycles sequence takes too long] → The engine decision in `render-pipeline` may pick EEVEE for sequences. Otherwise, one orientation per night.
- [Poster is an empty plot, a weak first impression] → Frame 0 is a blue-hour plot with glowing accent linework plus a bold headline. That is deliberate, and it's the most "industrial blueprint" image on the site. It is checked in the preview approval.
- [Large `public/hero` in git] → Roughly 100–150 MB across both orientations, both tiers and both formats. That's within GitHub limits (files are far below 100 MB each). Can move to Git LFS later if it bothers the maintainer, but note that GitHub Pages deploys with LFS need the checkout to fetch LFS.

## Open Questions

- Final headline and phase copy. Decided in the `content-pages` review, and only text changes.
