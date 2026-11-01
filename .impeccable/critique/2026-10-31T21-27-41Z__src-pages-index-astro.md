---
target: the homepage
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:D:\\client_projects\\noordevelopers\\src\\pages\\index.astro"
target_fingerprint: "sha256:829705eaa4dd126f1faacdbb7399c500d68dd569a5d8ebe4ab9e41cafd0247a5"
target_path: "D:\\client_projects\\noordevelopers\\src\\pages\\index.astro"
timestamp: 2026-10-31T21-27-41Z
slug: src-pages-index-astro
---
# Critique: homepage (src/pages/index.astro), after the 2026-11-01 refresh

Method: dual-agent (A: design review over CDP at 1440×900 and 390×844, scrub + static + keyboard; B: detector CLI + rendered scans at 1440, 1024, 820, 390). Mode: Persuade. Fresh reviewer, no access to the previous report.

## Design Health Score: 22/32 (69%). n/a: 7, 10 (kept n/a for a like-for-like trend; reviewer A would score #7 at 3)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Ruler fill, aria-current tick and phase label track progress; ruler numerals fade to 1.2–2.8:1 on light mid-build frames |
| 2 | Match system / real world | 3 | Kanal, ft-in, Faisalabad, WhatsApp-first; zero-indexed "00 — Design" is developer numbering |
| 3 | User control & freedom | 3 | Native scroll, visible skip, tick jumps, sticky bar; hero still 4 screens |
| 4 | Consistency & standards | 2 | Hero 00–05 vs Process 01–04 ("Design" is 00 in one, 02 in the other); the same 1-kanal/front-day render means "Buy" and then "Houses" one screen apart |
| 5 | Error prevention | 3 | Prefilled WhatsApp text, number shown on the band's Call; header/hero Call on desktop still fire tel: without a visible number |
| 6 | Recognition over recall | 3 | Ruler shows bare numbers; names are sr-only |
| 7 | Flexibility & efficiency | n/a | Marketing page |
| 8 | Aesthetic & minimalist | 2 | "Fully finished" ~6×, the 1 Kanal house ~5×, Process retells the hero; static desktop hero overloaded; up to 4 contact buttons on screen |
| 9 | Error recovery | 3 | Placeholder rows hidden, launch build fails on them |
| 10 | Help & documentation | n/a | One-goal persuasion page |

Previous run (2026-10-31): 22/32 with 1 P0 and 3 P1. The earlier P0 (dead placeholder contact) and P1s (no reassurance at the CTAs, 7-screen hero with inert controls) are resolved; this reviewer scored #3 and #9 up and #4 and #8 down for problems that sit deeper in the page.

## Design specificity
Hero: authored for this builder (blueprint to dusk build, amber plan lines, lit-window accent, drawing-sheet rules, Kanal facts). Below the hero: category patterns ("Two ways to work with…", 4-step process with big numerals, featured spec panel, "Let's talk" band) held together by the system, but the argument repeats rather than advances.

Detector: source scan of index.astro clean; components/layouts 1 finding, `broken-image` on the Gallery dialog img (false positive: src set by JS, not on the homepage). Rendered: 1440, 820, 390 clean; 1024 one `straggler` advisory, "pm" alone in footer hours (real, footer-wide; fixed after the run with a no-break space and text-wrap: pretty).

## Cognitive load
Single focus pass in the scrub opening, fail in the static desktop hero. Chunking partial (static hero shows 6 phases; Fully finished is 8 items in one group). Grouping, hierarchy, working memory, progressive disclosure pass. One-thing-at-a-time fails at page level (Process retells the hero). Decision points partial (15 targets on the desktop first screen, but Call/WhatsApp is clear).

## Emotional journey
Peak at the desktop dusk opening with reassurance at the CTAs; on phone the portrait scrim mutes the lit house. Valley mid-build (pale Foundation/Structure frames) and after the hero (Offerings → What We Build → Process re-explain it with the same house). Good end on the desktop dusk band; on phone the flat 0.8 scrim hides the 2 Kanal image.

## Strengths
1. The hero states the whole positioning in one gesture and holds the CTAs back until "Move in".
2. Contact layer: half-width sticky bar buttons, number on the band's Call, page-specific WhatsApp messages, confirmed promises next to the main actions, honest placeholder handling.
3. Disciplined system: one amber accent as light, dimension-line rules, coherent font trio, visible focus rings, sensible tab order, good alt text, clean heading outline.

## Priority issues
1. [P1] The page repeats instead of advancing; the portfolio looks like one house. Process.astro retells the hero with conflicting numbering; Offerings "Buy" and WhatWeBuild "Houses" share 1-kanal/front-day; the 2 Kanal house never appears clearly. Fix: 2 Kanal render on the Houses card; reframe Process as what happens after you call (no "Build" step, no site-visit claim); one numbering scheme. (distill / clarify)
2. [P1] Static hero at ≥64rem fails AA and its audience: lede + ContactNote in a right column over the lit facade measure ~3.1–3.2:1, and the 6-phase grid makes it the busiest screen. Fix: stack lede and notes under the headline on the dark left; collapse the phases to one line or remove them. (adapt)
3. [P2] Ruler illegible on light frames (active 1.2:1, idle 1.6–2.8:1), 11px numerals, 43×32 targets, no names. Fix: local right-edge scrim, active phase name, --text-xs labels, 44px targets. (polish)
4. [P2] The dusk lit window is crushed on phone at both ends (portrait hero scrim, flat 0.8 CTA-band scrim). Fix: shorter top scrim with a more compact copy block; 16:9 image strip above the band copy on phone. (adapt)
5. [P3] Contact buttons pile up: band + sticky bar = 4 on phone; header Call/WA directly above hero Call/WA on desktop. Fix: hide the sticky bar while the band or footer actions are in view. (distill)

## Persona red flags
- Jordan (first-timer): "Scroll to see how it's built" and "Skip to the homes" compete; skip lands on offerings, not homes; "00" numbering; same house repeatedly reads as "one design".
- Riley (stress tester): desktop header/hero Call open tel: with no number; reduced motion yields the failing-contrast static hero; 43×32 ticks; skip link (visually lowest) precedes hero CTAs in tab order.
- Casey (one-handed, slow): sticky bar excellent; a network reporting "4g" still gets ~3.3 MB of 540-tier frames; 4 phone screens of hero; skip link is small mono text above the bar.

## Minor observations
- Desktop p80: "04 — Finishing" copy over a frame still showing bare brick.
- Desktop CTA band: large empty area under the notes.
- Offerings: empty band under "How it works".
- Scroll cue and skip link stack bottom-centre and crowd the ruler and sticky bar on phone.
- FeaturedDesign spec panel is the most persuasive block below the hero and sits too late.

## Questions to consider
1. If the hero already shows the build, what must the homepage prove that the hero can't?
2. One house in two moods, or 1 Kanal, 2 Kanal and the plaza each shown once at full strength?
3. Should the static hero be its own simpler page (one image, one line, two buttons) rather than a compressed scrub hero?
