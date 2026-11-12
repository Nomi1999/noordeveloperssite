"""Wallpaper patterns and the per-room wall finish: the patterns tile, and no existing design sets a `wall`.

Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import json
import os
import sys
import unittest

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from noor_render import wallpaper  # noqa: E402

SHOTS = os.path.join(os.path.dirname(HERE), "shots")

PAPERS = {
    "fan": {"kind": "fan", "ground": [0.55, 0.52, 0.44], "line": [0.5, 0.32, 0.11], "repeat": 0.30},
    "ribbed": {"kind": "ribbed", "ground": [0.4, 0.33, 0.22], "line": [0.52, 0.44, 0.31], "repeat": 0.045},
    "stripe": {"kind": "stripe", "ground": [0.32, 0.2, 0.17], "line": [0.38, 0.25, 0.2], "repeat": 0.14},
    "geo": {"kind": "geo", "ground": [0.02, 0.025, 0.025], "line": [0.1, 0.08, 0.05], "repeat": 0.22},
    "grasscloth": {"kind": "grasscloth", "ground": [0.03, 0.036, 0.05], "repeat": 0.30},
    "herringbone": {"kind": "herringbone", "a": [0.07, 0.043, 0.027], "b": [0.15, 0.095, 0.06], "plank": 0.09},
}


def config(slug):
    with open(os.path.join(SHOTS, f"{slug}-interior.json"), encoding="utf-8") as f:
        return json.load(f)


class Patterns(unittest.TestCase):
    def test_every_kind_has_a_tile_of_matching_arrays(self):
        for name, cfg in PAPERS.items():
            colour, height, rough = wallpaper.tile(cfg)
            self.assertEqual(colour.shape[:2], height.shape, name)
            self.assertEqual(rough.shape, height.shape, name)
            self.assertEqual(colour.shape[2], 3, name)
            for a in (colour, height, rough):
                self.assertTrue(np.isfinite(a).all(), name)
            self.assertTrue(((rough >= 0) & (rough <= 1)).all(), f"{name} roughness")
            self.assertGreaterEqual(colour.min(), 0, name)

    def test_tiles_are_a_sensible_size(self):
        for name, cfg in PAPERS.items():
            rows, cols = wallpaper.tile(cfg)[1].shape
            self.assertLessEqual(max(rows, cols), 1100, name)
            self.assertGreaterEqual(min(rows, cols), 8, name)

    def test_tiles_join_without_a_seam(self):
        """The step from the last column to the first (and the last row to the first) is no bigger than the steps inside."""
        for name, cfg in PAPERS.items():
            colour = wallpaper.tile(cfg)[0].mean(axis=2)
            inside_x = np.abs(np.diff(colour, axis=1)).max()
            inside_y = np.abs(np.diff(colour, axis=0)).max()
            self.assertLessEqual(np.abs(colour[:, 0] - colour[:, -1]).max(), inside_x * 1.05 + 1e-6, f"{name} across")
            self.assertLessEqual(np.abs(colour[0] - colour[-1]).max(), inside_y * 1.05 + 1e-6, f"{name} up")

    def test_the_pattern_shows(self):
        """Each paper has some contrast: a flat ground would mean the drawing failed."""
        for name, cfg in PAPERS.items():
            colour = wallpaper.tile(cfg)[0]
            self.assertGreater(colour.std(), 0.002, name)

    def test_repeat_sets_the_tile_in_metres(self):
        for name, cfg in PAPERS.items():
            tw, th = wallpaper.tile_size(cfg)
            self.assertAlmostEqual(tw, cfg.get("repeat", 8 * cfg.get("plank", 0)), places=6, msg=name)
            self.assertGreater(th, 0, name)

    def test_herringbone_tile_is_eight_planks_square(self):
        cfg = PAPERS["herringbone"]
        self.assertEqual(wallpaper.tile_size(cfg), (8 * 0.09, 8 * 0.09))


class NoDesignUsesWallpaperYet(unittest.TestCase):
    def test_existing_designs_leave_walls_to_the_palette(self):
        for slug in ("5-marla", "1-kanal"):
            cfg = config(slug)
            self.assertNotIn("papers", cfg["palette"], slug)
            for name, spec in list(cfg["roomTypes"].items()) + list(cfg.get("rooms", {}).items()):
                self.assertNotIn("wall", spec, f"{slug}: {name}")


if __name__ == "__main__":
    unittest.main()
