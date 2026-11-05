## Why

The scroll-scrubbed hero asks the visitor to scroll through four screens to see the house built. After watching the approved EEVEE preview frames as an MP4, the maintainer found the build reads more smoothly as a video, and wants the home hero to just play it.

## What Changes

- **Video instead of scroll scrubbing**: the hero is one screen. The build video (blueprint → finished house, 192 frames at 24 fps, 8 s) starts as soon as the page opens, from its first frame, with no still image first; it plays once and cross-fades to the photoreal dusk poster at the end with the Move in phase and both actions. The Design phase overlay shows from the first paint, so the opening line (Faisalabad, reassurance) and the hero's own actions are now for the static hero and the end; the header and the phone action bar keep Call and WhatsApp on screen throughout.
- **Captions and ruler kept**: the six phase overlays and the ruler follow the playing frame; a ruler tick seeks the video to its phase and plays from there.
- **Playback control**: a Pause / Play / Replay button (WCAG 2.2.2). The video pauses off screen and in hidden tabs, and resumes when back unless the visitor paused it.
- **Assets**: `render:encode -- video` encodes the frames to AV1 and H.264 MP4 per orientation (about 0.4–0.5 MB and 1.1 MB) and writes the first frame as a WebP still (about 17 KB). The 192-frame AVIF/WebP tiers (about 25 MB in the repo) and the frame player, worker decoder and decoded-frame window are removed.
- **Unchanged**: the static hero (reduced motion, Save-Data / reduced data, 3G or slower, no JS), headline, phase copy, ruler design and skip link (now shown on focus, as the hero is one screen).

## Capabilities

### Modified Capabilities
- `scroll-build-hero`: autoplaying video replaces scroll-linked frame playback; playback control and off-screen pause; video sources replace frame loading, tier selection and the decoded-frame window.
- `render-assets`: the hero sequence ships as video files with a version 2 manifest instead of encoded frames.

## Impact

- `src/components/hero/` (`BuildVideoHero.astro` replaces `ScrollBuildHero.astro`; `hero-video.ts` replaces `hero-player.ts` and `hero-decoder.ts`; copy), `src/pages/index.astro`.
- `scripts/encode-renders.mjs` (`video` replaces `sequence`), `scripts/check-hero.mjs`, `public/hero/`, `render/README.md`.
- Hero copy: image alt reworded, scroll cue removed, playback button labels added (logged in `src/content/APPROVALS.md`).
