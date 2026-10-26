## 1. Choreography

- [ ] 1.1 Extend `run.py` and `shots.py` to read per-frame keyframes for camera, lens, `build` and `time_of_day` from a sequence config, with spline interpolation; verify a 6-keyframe test config renders a smooth 24-frame EEVEE preview
- [ ] 1.2 Write `render/shots/1-kanal-hero-landscape.json` (192 frames, phase eases and holds, light arc, ~70° orbit descending to eye level); verify a contact sheet at every 8th frame matches the six-phase table
- [ ] 1.3 Write `render/shots/1-kanal-hero-portrait.json` with its own framing (whole house visible at the end, calm top area); verify with a contact sheet
- [ ] 1.4 Verify camera continuity by plotting per-frame camera displacement for both paths and confirming there are no spikes at phase boundaries

## 2. Preview approval

- [ ] 2.1 Render EEVEE previews (960×540 and 540×960) of both full sequences and encode them to MP4; verify both videos play through all six phases
- [ ] 2.2 Review the previews with the maintainer (first impression of frame 0, pacing, light arc, final frame) and apply changes; record approval in `render/README.md` before section 3

## 3. Final render and encode

- [ ] 3.1 Render the landscape sequence at 1920×1080 with the chosen engine in resumable mode; verify 192 frames exist and a contact sheet shows no flicker, noise or floating geometry
- [ ] 3.2 Render the portrait sequence at 1080×1920; verify the same way
- [ ] 3.3 Run `encode-renders.mjs` for both sequences into `public/hero/` with `manifest.json`; verify the manifest has phase ranges 0–31 … 160–191, posters 0 and 191, and record per-tier byte totals in `render/README.md`
- [ ] 3.4 Flip through the encoded AVIF frames at full size checking for compression artifacts in the dusk gradients; raise quality for the affected tier until clean

## 4. Hero markup and static mode

- [ ] 4.1 Create `hero-copy.ts` with headline, phase names and lines, and the closing message; verify the component reads copy only from it
- [ ] 4.2 Build `ScrollBuildHero.astro` with the static-mode default markup (skip link, `<picture>` poster with reduced-motion and orientation sources, headline, phase list, Call/WhatsApp with a home-page message, `#after-hero` target); verify with JS disabled that the hero is one screen tall and complete
- [ ] 4.3 Add the inline head script that sets `html.hero-scrub` (JS on, no reduced motion, no Save-Data), and the scrub-mode CSS (tall section, sticky `100svh` stage, one phase visible, ruler); verify both modes by toggling reduced motion in devtools

## 5. Player

- [ ] 5.1 Implement scroll progress, target frame and eased drawing with rAF gated by IntersectionObserver; verify with a debug overlay that frame ≈ 95 at mid-section and that no rAF runs when the hero is off-screen
- [ ] 5.2 Implement orientation, tier and format selection, with orientation switching only on real orientation change; verify in devtools device mode, including rotation and address-bar resize
- [ ] 5.3 Implement manifest loading and the stride-pass queue (concurrency 6, low priority, starts after poster decode) with nearest-loaded fallback; verify in the network panel with Slow 4G that passes run sparse-to-dense and the canvas is never blank
- [ ] 5.4 Implement the decoded LRU window (±24 desktop, ±10 mobile/low-memory) with `close()` on eviction and the poster-to-canvas handover after the first draw; verify with a debug counter that decoded frames never exceed the window across five full scrubs
- [ ] 5.5 Wire phase overlays (`data-phase`), ruler fill and the Move in CTA from manifest ranges; verify every phase label and the CTA appear at the right frames
- [ ] 5.6 Verify the player bundle is under 15 KB gzipped

## 6. Verification

- [ ] 6.1 Write a headless Chrome check script that scrolls to each phase midpoint and screenshots (landscape and portrait); verify the screenshots show the correct phase label and frame
- [ ] 6.2 Test on a real iPhone (Safari) and a mid-range Android (Chrome): smoothness, rotation, five full scrubs without a reload, and the final CTAs open the dialer and WhatsApp; record results
- [ ] 6.3 Verify static mode: with reduced motion and with Save-Data there are no frame requests, the dusk image shows (reduced motion), and the phase list and actions are visible
- [ ] 6.4 Run Lighthouse mobile on `/`; verify LCP is the poster, hero-attributable TBT is under 50 ms, and Accessibility is 100
- [ ] 6.5 Verify "Skip the animation" is the hero's first focusable element and moves focus to `#after-hero`
