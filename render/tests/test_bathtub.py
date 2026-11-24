"""The bathtub branch is only reached by a design whose export has a bathtub fixture.

The 2 Kanal has three tubs; the 5 Marla, 1 Kanal and 10 Marla have none, so their interiors build exactly as before.
Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import json
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.dirname(HERE)
DATA = os.path.join(RENDER, "data")

DESIGNS = ("5-marla", "1-kanal", "10-marla")


def export(slug):
    with open(os.path.join(DATA, f"{slug}.json"), encoding="utf-8") as f:
        return json.load(f)


def tubs(design):
    return [f for level in design["levels"] for f in level.get("fixtures", []) if f["type"] == "bathtub"]


class OtherHousesHaveNoTub(unittest.TestCase):
    """fixtures() adds a tub only for a `bathtub` fixture, and only the 2 Kanal export has one."""

    def test_no_export_fixture_is_a_tub(self):
        for slug in DESIGNS:
            self.assertEqual(tubs(export(slug)), [], slug)


class TwoKanalTubs(unittest.TestCase):
    design = export("2-kanal")

    def test_three_tubs_against_rear_walls(self):
        found = tubs(self.design)
        self.assertEqual([f["id"] for f in found], ["b1-tub", "mb-tub", "b5-tub"])
        for f in found:
            self.assertEqual((f["w"], f["d"], f["back"]), (5.5, 2.5, "rear"), f["id"])

    def test_every_tub_stands_in_a_bath(self):
        baths = [room for level in self.design["levels"] for room in level["rooms"] if room["type"] == "bathroom"]
        for f in tubs(self.design):
            cx, cy = f["x"] + f["w"] / 2, f["y"] + f["d"] / 2
            self.assertTrue(any(_within((cx, cy), room["outline"]) for room in baths), f["id"])

    def test_the_builder_has_the_branch(self):
        with open(os.path.join(RENDER, "noor_render", "interior.py"), encoding="utf-8") as f:
            self.assertIn('elif kind == "bathtub":', f.read())


def _within(pt, outline):
    """Point in a polygon, for a room outline as a list of [x, y]."""
    x, y = pt
    hit = False
    for (x0, y0), (x1, y1) in zip(outline, outline[1:] + outline[:1]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            hit = not hit
    return hit


if __name__ == "__main__":
    unittest.main()
