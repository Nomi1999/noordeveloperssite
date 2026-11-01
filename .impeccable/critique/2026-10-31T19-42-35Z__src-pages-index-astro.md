---
target: the homepage
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:D:\\client_projects\\noordevelopers\\src\\pages\\index.astro"
target_fingerprint: "sha256:d11a0d782bae41e4f8085b9ecd8d7c43af202285bff24d5cbb5547e263795275"
target_path: "D:\\client_projects\\noordevelopers\\src\\pages\\index.astro"
timestamp: 2026-10-31T19-42-35Z
slug: src-pages-index-astro
closed: true
---
# Critique: homepage (src/pages/index.astro)

Method: dual-agent (A: design review · B: detector + CDP browser evidence). Mode: Persuade.

## Design Health Score: 22/32 (Good, 69% — borderline Acceptable). n/a: 7, 10

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Ruler tracks hero progress; no sense of remaining scroll |
| 2 | Match system / real world | 3 | Plain local language; "00 — DESIGN" codes read as internal |
| 3 | User control & freedom | 2 | 6 screens to exit hero; skip link keyboard-only; inert ruler ticks |
| 4 | Consistency & standards | 3 | Call/WhatsApp order flips; three numbering systems |
| 5 | Error prevention | 3 | Desktop Call fires tel: with no visible number |
| 6 | Recognition over recall | 3 | Number/hours/location only in footer |
| 7 | Flexibility & efficiency | n/a | Marketing page |
| 8 | Aesthetic & minimalist | 3 | Disciplined; "fully finished" repeated 6x, numbering noise |
| 9 | Error recovery | 2 | No fallback if WhatsApp/call fails; no form/callback |
| 10 | Help & documentation | n/a | Process section covers next steps |

## Design specificity
Hero highly specific (blueprint→dusk build, ruler, lit-window amber). Below the hero: five identical SectionHeaders, generic agency sequence; "Building the Future" tagline interchangeable.
Detector: 3x tight-leading (--leading-snug 1.15 on .ff__item, .hero__phase-line on mobile), 6x numbered-section-labels advisory. False positives: low-contrast on .sh__total (sampled grid line; real 5.23:1), broken-image in Gallery dialog (runtime src, not on homepage).

## Priority issues
1. [P0] All contact values are PLACEHOLDER(client) in src/config/site.ts:55-76 — every Call/WhatsApp CTA dead; footer shows "Office address to follow". Fix: real values; fail prod build on placeholders; hide empty rows. (harden)
2. [P1] No trust/reassurance next to CTAs for a house-sized purchase — all "Concept", location only in footer, no hours/reply time/named contact/visit option. (clarify)
3. [P1] Hero cost & control — calc(6*100svh+100svh) scroll, H1 fades after phase 0, pointer-invisible skip, inert ruler ticks. Fix: ~3-4 screens, persistent brand strip, clickable ticks, visible skip. (adapt / distill)
4. [P1] Mid-phase hero copy on mobile portrait ~2.3-3.3:1 (phase label 1.3-1.9:1); scrim fades by copy position. Fix: stronger portrait scrim or ink plate. (polish)
5. [P2] Template sameness below hero + repetition; numbering collisions; tight 1.15 leading on wrapping list items. (layout / typeset)

## Persona red flags
- Jordan: H1 gone after first flick; "Concept" unclear if buyable; location footer-only; no "free / no obligation".
- Riley: bare tel: with no visible number; WhatsApp new tab; inert ticks; no hours; no form.
- Casey: ~6 flicks past hero; ~7.3 MB portrait frames on slow 3G unless Save-Data; header+bar ~16% of screen; mid-phase copy unreadable in sunlight.

## Minor
Orphaned "Bathrooms 7" fact; phase-0 frame abstract; oversized footer lockup; no Home active state; empty checkbox for "Not included".

## Questions
1. Why make visitors earn the dusk frame — open on the finished home and scroll back?
2. What can Noor honestly invite a stranger to see in person — a third CTA?
3. What if every section were organised around the lights coming on?
