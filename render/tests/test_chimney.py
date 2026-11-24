"""The freestanding chimney is only built for the design whose interior config names one.

The 2 Kanal lounge has one; the 5 Marla, 1 Kanal and 10 Marla configs name none, so their interiors build exactly as
before. Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import json
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.dirname(HERE)
SHOTS = os.path.join(RENDER, "shots")
DATA = os.path.join(RENDER, "data")

DESIGNS = ("5-marla", "1-kanal", "10-marla")


def config(slug):
    with open(os.path.join(SHOTS, f"{slug}-interior.json"), encoding="utf-8") as f:
        return json.load(f)


def export(slug):
    with open(os.path.join(DATA, f"{slug}.json"), encoding="utf-8") as f:
        return json.load(f)


class OtherHousesHaveNoChimney(unittest.TestCase):
    def test_only_the_two_kanal_names_one(self):
        for slug in DESIGNS:
            self.assertNotIn("chimney", config(slug), slug)


class TwoKanalChimney(unittest.TestCase):
    ch = config("2-kanal")["chimney"]
    design = export("2-kanal")

    def test_it_stands_in_a_double_height_room(self):
        level = next(l for l in self.design["levels"] if l["id"] == self.ch["level"])
        room = next(r for r in level["rooms"] if r["id"] == self.ch["room"])
        self.assertGreater(self.ch["size"][0], 0)
        self.assertGreater(self.ch["size"][1], 0)
        self.assertTrue(0 <= self.ch["centre"] <= 1)
        upper = self.design["levels"][self.design["levels"].index(level) + 1]
        voids = [v for v in upper["slab"].get("voids", []) if v.get("kind") == "double-height"]
        centres = [[sum(p[0] for p in v["outline"]) / len(v["outline"]), sum(p[1] for p in v["outline"]) / len(v["outline"])] for v in voids]
        self.assertTrue(any(_within(c, room["outline"]) for c in centres), self.ch["room"])

    def test_the_builder_has_the_element(self):
        with open(os.path.join(RENDER, "noor_render", "interior.py"), encoding="utf-8") as f:
            self.assertIn("def chimney(self, room, col):", f.read())


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
