# Copy approvals

The hero copy, the About copy and the fully finished checklist must be approved by the maintainer before launch, and the checklist also confirmed by the client (it is a promise about what every build includes). Record each approval here, with the date and the version approved (a commit, or the first 12 hex digits of the SHA-256 of the file with LF line endings). Change the copy only in the files listed, and record a new approval when approved copy changes.

| Item | File | Status |
|---|---|---|
| Hero headline and phase lines | `src/components/hero/hero-copy.ts` | Approved by the maintainer; 2026-11-01 additions accepted without review; video-hero wording awaiting review (see log) |
| About copy | `src/content/about.ts` | Rewritten in the remove-commercial-buildings change; awaiting maintainer review (see log) |
| Fully finished checklist | `src/content/fully-finished.ts` | Approved by the maintainer and confirmed by the client |

## Log

| Date | Item | Approved by | Version (commit) | Notes |
|---|---|---|---|---|
| 2026-10-31 | Hero headline and phase lines | Maintainer | `hero-copy.ts` sha256 `7d5a60d48b20` | Approved as drafted in the content-pages change |
| 2026-10-31 | About copy | Maintainer | `about.ts` sha256 `cf039cc63e8a` | Approved as drafted |
| 2026-10-31 | Fully finished checklist | Maintainer | `fully-finished.ts` sha256 `337f89d033e5` | Approved as drafted; awaiting the client's confirmation |
| 2026-10-31 | Fully finished checklist | Client (confirmed through the maintainer) | `fully-finished.ts` sha256 `337f89d033e5` | Client confirmed the checklist as drafted |
| 2026-11-01 | Hero copy: opening line, skip link, scroll cue, image alt, ruler label | Maintainer (review waived) | `hero-copy.ts` sha256 `5b41600940a9` | Added in the homepage-refresh change for the dusk-first hero. Headline and phase lines unchanged. The maintainer asked for the copy to be written without a separate approval. |
| 2026-11-01 | Contact promises (`site.promises` in `src/config/site.ts`) | Maintainer | `site.ts`, homepage-refresh change | Maintainer confirmed as true: the first conversation is free with no obligation; WhatsApp replies the same working day; office visits welcome. Not confirmed, so not claimed: visits to houses under construction. |
| 2026-11-01 | Hero copy: phase numbers 01–06 (were 00–05), skip link "Skip past the build" | Maintainer (review waived) | `hero-copy.ts` sha256 `0949cb8ce7fa` | From the second critique. Phase names and lines unchanged. |
| 2026-11-01 | Process steps (`src/content/process.ts`) | Maintainer (review waived) | `process.ts` | Rewritten as what happens after someone gets in touch: talk to us, meet at our office, review the design, follow it to the keys. Uses only the confirmed promises. |
| 2026-11-01 | Hero copy for the video hero: image alt ("A short video shows how it was built…", was "Scrolling shows…"), playback button labels Pause / Play / Replay, scroll cue removed | Awaiting maintainer review | `hero-copy.ts` sha256 `d3e8cdb91237` | From the video-hero change. Headline, opening line, skip link and phase lines unchanged. |
| 2026-11-05 | About copy: houses only (lead, who-we-are paragraph, "Every house starts as a drawing", "home ready to live in") | Awaiting maintainer review | `about.ts` sha256 `d5ebfbd54615` | From the remove-commercial-buildings change. Commercial-work wording removed; Noor described as a builder of houses. No other About copy changed. |
