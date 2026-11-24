"""The 2 Kanal review fixes (2026-11-23), and proof that none of them reaches the other houses.

- Wall units stop either side of a window behind them: the 2 Kanal kitchen window sits behind its side counter, and
  no other house has an opening behind a counter that carries wall units, so theirs build as before.
- A hood over the hob, a solid stair base and an open foot for the roof flight are switched on by config keys that
  only the 2 Kanal sets.
- A double-height void that reaches the slab's edge is a notch in the outline, not a hole: it still opens the ceiling
  below. Only the 2 Kanal lounge void is one.

Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.dirname(HERE)
sys.path.insert(0, RENDER)
from noor_render import fitout, loader  # noqa: E402

SHOTS = os.path.join(RENDER, "shots")
FT = loader.FT
OTHERS = ("5-marla", "1-kanal", "10-marla")
SKIN = 0.012  # geometry.SKIN, which imports Blender
REACH = SKIN + 0.06  # as Interior._behind


def config(slug):
    with open(os.path.join(SHOTS, f"{slug}-interior.json"), encoding="utf-8") as f:
        return json.load(f)


def level(design, lid):
    return next(lv for lv in design["levels"] if lv["id"] == lid)


def upper_counters(design, cfg, classic=False):
    """(level, counter) for every counter that carries wall units, by the rule fixtures() uses; with `classic`, only
    those built by the classic branch (the handleless one already stopped its units at windows)."""
    out = []
    for lv in design["levels"]:
        if lv["id"] not in cfg["levels"]:
            continue
        for room in lv["rooms"]:
            spec = dict(cfg["roomTypes"].get(room["type"], cfg["roomTypes"]["default"]))
            spec.update(cfg.get("rooms", {}).get(room["id"], {}))
            spec.update(cfg.get("rooms", {}).get(f"{lv['id']}/{room['id']}", {}))
            uppers = spec.get("uppers")
            if classic and spec.get("cabinetry", cfg.get("style", {}).get("cabinetry")) == "handleless":
                continue
            for fx in lv.get("fixtures", []):
                if fx["type"] != "counter" or not _within((fx["x"] + fx["w"] / 2, fx["y"] + fx["d"] / 2), room["outline"]):
                    continue
                if (fx["id"] in uppers) if uppers is not None else (room["type"] == "kitchen" and fx["id"] == "k-counter"):
                    out.append((lv, fx))
    return out


def behind(lv, fx):
    origin, u, length, _ = fitout.counter_line(fx)
    return fitout.openings_behind(lv["openings"], origin, u, length, REACH)


class WallUnitsClearWindows(unittest.TestCase):
    def test_other_houses_have_no_opening_behind_their_wall_units(self):
        for slug in OTHERS:
            design = loader.load(slug)
            for lv, fx in upper_counters(design, config(slug), classic=True):
                zb = lv["slab"]["top"] + 0.012 + 1.45
                self.assertEqual([b for b in behind(lv, fx) if b[3] > zb], [], f"{slug} {fx['id']}")

    def test_two_kanal_kitchen_window_splits_the_side_run(self):
        design = loader.load("2-kanal")
        found = {fx["id"]: behind(lv, fx) for lv, fx in upper_counters(design, config("2-kanal"))}
        self.assertEqual(sorted(found), ["bk-counter", "k-counter-side", "k-island"])
        self.assertEqual(found["k-island"], [])
        self.assertEqual(found["bk-counter"], [])
        (o0, o1, _, top), = found["k-counter-side"]
        self.assertAlmostEqual(o0, 3.5 * FT, places=3)
        self.assertAlmostEqual(o1, 9.5 * FT, places=3)
        runs = fitout.gaps(15.1 * FT, [(o0 - 0.05, o1 + 0.05)], least=0.3)
        self.assertEqual(len(runs), 2)  # one run each side of the window, none in front of it
        self.assertTrue(all(s1 <= o0 - 0.05 + 1e-9 or s0 >= o1 + 0.05 - 1e-9 for s0, s1 in runs))

    def test_no_opening_gives_one_full_run(self):
        self.assertEqual(fitout.gaps(2.0, [], least=0.3), [(0.0, 2.0)])


class Hood(unittest.TestCase):
    def test_only_the_two_kanal_kitchen_has_one(self):
        for slug in OTHERS:
            cfg = config(slug)
            specs = list(cfg["roomTypes"].values()) + list(cfg.get("rooms", {}).values())
            self.assertFalse(any(s.get("hood") for s in specs), slug)
        self.assertTrue(config("2-kanal")["roomTypes"]["kitchen"].get("hood"))

    def test_the_hob_leaves_a_gap_in_the_island_units(self):
        k = level(loader.load("2-kanal"), "ground")
        island = next(f for f in k["fixtures"] if f["id"] == "k-island")
        hob = next(f for f in k["fixtures"] if f["id"] == "k-hob")
        origin, u, length, _ = fitout.counter_line(island)
        (s0, s1), = fitout.spans_along(origin, u, length, [(hob["x"], hob["y"], hob["w"], hob["d"])], 0.05)
        self.assertAlmostEqual(s0, 2.25 * FT - 0.05, places=4)
        self.assertAlmostEqual(s1, 4.75 * FT + 0.05, places=4)
        runs = fitout.gaps(length, [(s0, s1)], least=0.3)
        self.assertEqual(len(runs), 2)  # wall units either side of the hood

    def test_the_builder_has_it(self):
        with open(os.path.join(RENDER, "noor_render", "interior.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertIn('if room.spec.get("hood"):', src)


class NotchedVoid(unittest.TestCase):
    def test_only_the_two_kanal_lounge_void_is_a_notch(self):
        for slug in OTHERS + ("2-kanal",):
            found = []
            for lv in loader.load(slug)["levels"]:
                holes = [h for poly in lv["slab"]["polygons"] for h in poly["holes"]]
                found += [v["id"] for v in fitout.notched_voids(lv["slab"].get("voids", []), holes)]
            self.assertEqual(found, ["lounge-void"] if slug == "2-kanal" else [], slug)


class StairFixes(unittest.TestCase):
    def test_only_the_two_kanal_sets_the_switches(self):
        for slug in OTHERS:
            cfg = config(slug)
            self.assertNotIn("solidStairs", cfg, slug)
            self.assertNotIn("openFlightFoot", cfg, slug)
        cfg = config("2-kanal")
        self.assertEqual(cfg["solidStairs"], ["ground/stair"])
        self.assertTrue(cfg["openFlightFoot"])

    def test_roof_flight_foot_is_found_at_the_stairwell_back_edge(self):
        design = loader.load("2-kanal")
        first = level(design, "first")
        well = next(v for v in first["slab"]["voids"] if v["id"] == "stairwell")
        ring = _ccw(well["outline"])
        i, s0, s1 = fitout.flight_foot(first["stairs"], ring)
        p, q = ring[i], ring[(i + 1) % len(ring)]
        self.assertAlmostEqual(p[1], 72.5 * FT, places=4)  # the back edge, where both flights meet the gallery
        self.assertAlmostEqual(q[1], 72.5 * FT, places=4)
        xs = sorted(p[0] + (q[0] - p[0]) * s / abs(q[0] - p[0]) for s in (s0, s1))
        self.assertAlmostEqual(xs[0], 48.25 * FT - 0.05, places=3)
        self.assertAlmostEqual(xs[1], 51.875 * FT + 0.05, places=3)

    def test_the_ground_flight_has_no_foot_at_its_own_floor_hole(self):
        # the ground stair rises from the ground floor, which has no hole: nothing to open there
        ground = level(loader.load("2-kanal"), "ground")
        self.assertFalse(any(h for poly in ground["slab"]["polygons"] for h in poly["holes"]))

    def test_the_slot_between_the_flights_is_filled(self):
        ground = level(loader.load("2-kanal"), "ground")
        st = ground["stairs"][0]
        steps = [s for s in st["steps"] if fitout.within(s, st)]
        self.assertEqual(len(steps), len(st["steps"]))
        fills = fitout.flight_gaps(steps)
        self.assertGreaterEqual(len(fills), 8)
        for x0, y0, x1, y1, top in fills:
            self.assertAlmostEqual(x0, 51.875 * FT, places=4)
            self.assertAlmostEqual(x1, 52.125 * FT, places=4)
            self.assertGreater(y1, y0)
            self.assertLess(top, 13 * FT)


def _ccw(poly):
    area = sum(poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1] for i in range(len(poly)))
    return [tuple(p) for p in (poly if area > 0 else poly[::-1])]


def _within(pt, outline):
    x, y = pt
    hit = False
    for (x0, y0), (x1, y1) in zip(outline, outline[1:] + outline[:1]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            hit = not hit
    return hit


if __name__ == "__main__":
    unittest.main()
