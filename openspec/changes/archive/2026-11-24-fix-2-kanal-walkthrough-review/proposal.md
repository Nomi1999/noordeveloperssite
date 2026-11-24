## Why

The maintainer's review of the finished 2 Kanal walkthrough (2026-11-23) found seven faults seen at eye level: wall units over the kitchen window, a bare wall over the hob and over the back-kitchen sink, a stair whose landing hangs 5.8 ft over the hall so the space under it reads as a corridor nobody can walk through, glass across the foot of the stair to the roof, Bath 4's door behind a wardrobe, and a white slab where the plan shows the lounge open to below.

## What Changes

- Classic (handled) kitchen wall units stop either side of a window or door behind them, as the handleless ones already did.
- An opt-in `hood` room key: the wall units leave a gap over the hob and a slim dark-metal chimney hood fills it. The 2 Kanal kitchen has wall units over the hob counter and the hood; the back kitchen gets wall units over its sink counter.
- An opt-in `solidStairs` key builds a listed stair solid down to the floor, with the slot between its flights filled and its light lifted clear. The 2 Kanal main stair is closed in, and the tour reaches the back hall and the stair foot through the lounge instead of under the landing.
- An opt-in `openFlightFoot` key leaves the stairwell balustrade open where a flight to the floor above starts at the hole's edge (the 2 Kanal roof stair).
- A double-height void that reaches the slab's outline (a notch, not a hole) opens the ceiling of the room below, as a hole does. Only the 2 Kanal lounge void is one.
- The 2 Kanal design moves `bath4-door` to the west end of its wall, clear of the bedroom wardrobe (this changes the first-floor plan).
- Every affected 2 Kanal view is re-rendered and re-encoded. The 5 Marla, 1 Kanal and 10 Marla renders are unchanged.

## Impact

- `render/noor_render/interior.py`, new `render/noor_render/fitout.py`, `render/tests/test_fitout.py`
- `render/shots/2-kanal-interior.json`, `src/designs/2-kanal.ts`, `render/data/2-kanal.json`
- `src/designs/walkthroughs/2-kanal.json`, `public/walkthroughs/2-kanal/`
