"""The 5 Marla config must build exactly as before the 1 Kanal style switches: every switch at its default.

Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from noor_render import style  # noqa: E402

SHOTS = os.path.join(os.path.dirname(HERE), "shots")


def config(slug):
    with open(os.path.join(SHOTS, f"{slug}-interior.json"), encoding="utf-8") as f:
        return json.load(f)


class FiveMarlaUnchanged(unittest.TestCase):
    cfg = config("5-marla")

    def specs(self):
        yield from self.cfg["roomTypes"].items()
        yield from self.cfg.get("rooms", {}).items()

    def test_style_choices_default_everywhere(self):
        self.assertNotIn("style", self.cfg)
        for name, spec in self.specs():
            for key, default in style.STYLE.items():
                self.assertEqual(style.choice(self.cfg, spec, key), default, f"{name}: {key}")

    def test_design_wide_switches_are_off(self):
        for key in style.GLOBAL:
            self.assertNotIn(key, self.cfg, key)

    def test_no_room_switches_on_a_new_element(self):
        for name, spec in self.specs():
            for key in style.ROOM_OFF:
                self.assertNotIn(key, spec, f"{name}: {key}")
            self.assertNotIn(spec.get("ceiling", "flat"), style.NEW_CEILINGS, name)
            self.assertNotIn(spec.get("featureKind", "fluted"), style.NEW_FEATURES, name)
            self.assertNotEqual(spec.get("wallTile"), "full", name)

    def test_palette_and_lights_name_nothing_new(self):
        for key in style.PALETTE_OFF:
            self.assertNotIn(key, self.cfg["palette"], key)
        for key in style.LIGHTS_OFF:
            self.assertNotIn(key, self.cfg["lights"], key)


class OneKanalStyle(unittest.TestCase):
    cfg = config("1-kanal")
    types = {"stair-hall", "drawing", "powder-room", "dining", "kitchen", "corridor", "tv-lounge", "back-kitchen", "bathroom",
             "bedroom", "dressing", "other", "master-bedroom", "family-lounge", "study", "terrace"}

    def test_every_room_type_has_an_entry(self):
        self.assertEqual(self.types - set(self.cfg["roomTypes"]), set())

    def test_switches_the_new_style_on(self):
        spec = self.cfg["roomTypes"]["bathroom"]
        for key, want in (("doors", "flush"), ("skirting", "shadow-gap"), ("wc", "wall-hung"), ("vanityStyle", "floating"),
                          ("shower", "rain"), ("cabinetry", "handleless")):
            self.assertEqual(style.choice(self.cfg, spec, key), want, key)
        self.assertTrue(self.cfg["voids"])


class WindowsClearOfColumns(unittest.TestCase):
    """fixups.clear_columns: the 1 Kanal kitchen window ran into column A2; the 5 Marla has nothing to trim."""

    def test_kitchen_window_starts_at_the_column(self):
        from noor_render import fixups, loader
        design = loader.load("1-kanal")
        self.assertIn("kitchen-side", fixups.clear_columns(design))
        ground = design["levels"][0]
        op = next(o for o in ground["openings"] if o["id"] == "kitchen-side")
        col = next(c for c in ground["columns"] if c["ref"] == "A2")
        self.assertAlmostEqual(op["from"][1], col["y"] + col["d"], places=6)
        fill = [w for w in ground["walls"] if w["part"] == "solid" and w["wall"] == op["wall"]
                and abs(w["to"][1] - op["from"][1]) < 1e-6 and abs(w["from"][1] - loader.FT * 45) < 1e-6]
        self.assertEqual(len(fill), 1)

    def test_five_marla_untouched(self):
        from noor_render import fixups, loader
        self.assertEqual(fixups.clear_columns(loader.load("5-marla")), [])


if __name__ == "__main__":
    unittest.main()
