## 1. Assets

- [x] 1.1 `render:encode -- video`: AV1 and H.264 MP4 per orientation from the frame folder, the first frame as WebP, version 2 manifest with fps, phases and sources
- [x] 1.2 Encode both approved EEVEE preview sequences; verify 192 frames, 8.0 s, 24 fps with ffprobe
- [x] 1.3 Remove the AVIF/WebP frame tiers from `public/hero/`

## 2. Hero

- [x] 2.1 `BuildVideoHero.astro`: video element, one-screen motion mode under `html.hero-motion`, no scroll cue, skip link on focus, Pause / Play / Replay button
- [x] 2.2 `hero-video.ts`: immediate start from the embedded manifest, play once, end on the poster, synced overlays and ruler, tick seek, off-screen pause, orientation swap
- [x] 2.2a Start immediately (maintainer, after the first review): first-frame backdrop, no poster hold, Design phase from the first paint
- [x] 2.3 Remove `hero-player.ts` and `hero-decoder.ts`
- [x] 2.4 Copy: image alt, playback labels, scroll cue removed; log in `src/content/APPROVALS.md`

## 3. Verification

- [x] 3.1 `scripts/check-hero.mjs`: byte-range server; opening, phases, jump, end, control, offscreen, fallback, static, rotate, skip
- [x] 3.2 `npm run build`, `node scripts/check-hero.mjs`, `npm test`
- [ ] 3.3 Maintainer checks the built site on a laptop and a phone
