## Context

See proposal.md. The frames are the approved EEVEE previews (960×540 and 540×960, 192 frames); the maintainer reviewed them as an 8 s, 24 fps MP4 and chose that pace, play-once and synced captions. A first version held the dusk poster for 1.5 s before the video; the maintainer asked for the video to start immediately instead.

## Decisions

- **Immediate start.** The hero script runs as soon as the page is parsed: the manifest is embedded in `data-manifest`, so it sets the video source at once and calls `play()` while the hero is in view. Before the video's first frame arrives, motion-mode CSS paints that frame (`public/hero/first/<orientation>.webp`, about 17 KB) as the video element's background; static visitors never match that rule, so never fetch it. The dusk poster is hidden in motion mode until the end.
- **No swap at the start.** In motion mode `data-phase="intro"` (before playback) is styled as the Design phase: compact headline, `01 — DESIGN`, actions folded away. The opening line and reassurance are static-mode only, so nothing cross-fades as the video starts. A refused autoplay (iOS Low Power Mode) leaves the blueprint and Design phase up, with the button offering Play.
- **End state.** On `ended` the stage takes `data-ended`: the video fades out to the poster (the photoreal version of the last frame), the Move in phase and actions stay, and the button offers Replay. Replay restarts from frame 0.
- **Sync.** `requestVideoFrameCallback` (else `requestAnimationFrame`) runs only while playing; each callback maps `mediaTime × fps` to a frame and reuses the phase-from-manifest-ranges logic. Callbacks during a seek are ignored (a frame presented before the seek would restore the old phase); `seeked` updates the overlays.
- **Ticks.** Seek to a quarter frame past the phase's first frame and play. No page scrolling.
- **Formats.** AV1 (SVT-AV1, CRF 34) first, H.264 Main (CRF 22) as the fallback, chosen with `canPlayType` against the manifest's MIME types. Both measure about 43.5 dB PSNR against the 16-bit PNGs (the old AVIF frames were 38–40 dB). One 540-line size per orientation, matching the frames; there is nothing larger to tier.
- **Orientation.** Portrait when the viewport is taller than wide; only a real orientation change swaps the source, restoring `currentTime` and resuming if it was playing.
- **Gate.** `html.hero-motion` replaces `html.hero-scrub` with the same conditions. The video element has no `src` and `preload="none"` in HTML, so static visitors download no video or first frame.

## Non-Goals

- New renders, Cycles frames or a different pace.
- Audio.
