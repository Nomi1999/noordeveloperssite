"""A wall finish never rises above the wall it is fixed to, and a ceiling-edge light never runs where there is no
full-height wall or no ceiling behind it (the 1 Kanal stair lobby: the wall under the landing stops at 7.7 ft).

Run with plain Python (no Blender): python -m unittest discover render/tests
"""

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from noor_render import wallclip  # noqa: E402

FT = 0.3048
CEIL = 2.9


class TopRuns(unittest.TestCase):
    def test_full_height_wall_is_one_run_at_the_cap(self):
        spans = [(0.0, 3.0, 4.0), (3.0, 6.0, 4.0)]
        self.assertEqual(wallclip.top_runs(spans, 0.5, 5.5, CEIL), [(0.5, 5.5, CEIL)])

    def test_low_wall_is_clipped_to_its_own_top(self):
        spans = [(0.0, 2.0, 7.7 * FT), (2.0, 3.0, 4.0)]
        runs = wallclip.top_runs(spans, 0.0, 3.0, CEIL)
        self.assertEqual(runs, [(0.0, 2.0, 7.7 * FT), (2.0, 3.0, CEIL)])

    def test_stretch_without_wall_is_left_out(self):
        self.assertEqual(wallclip.top_runs([(0.0, 1.0, 4.0), (2.0, 3.0, 4.0)], 0.0, 3.0, CEIL), [(0.0, 1.0, CEIL), (2.0, 3.0, CEIL)])

    def test_taller_of_two_overlapping_walls_counts(self):
        spans = [(0.0, 2.0, 1.0), (1.0, 3.0, 2.0)]
        self.assertEqual(wallclip.top_runs(spans, 0.0, 3.0, CEIL), [(0.0, 1.0, 1.0), (1.0, 3.0, 2.0)])


class CeilingLine(unittest.TestCase):
    along = staticmethod(lambda s: (0.0, s))  # a straight edge along y, no offset

    def test_full_height_wall_keeps_its_line(self):
        self.assertEqual(wallclip.dead_runs(5.0, [(0.0, 5.0, 4.0)], CEIL, self.along, []), [])

    def test_wall_that_stops_short_has_no_line(self):
        # the stair lobby's wall under the landing: 7.7 ft high against a ceiling at 9.5 ft
        runs = wallclip.dead_runs(2.65, [(0.0, 2.65, 7.7 * FT)], 9.5 * FT, self.along, [])
        self.assertEqual(runs, [(0.0, 2.65)])

    def test_only_the_low_part_of_an_edge_loses_its_line(self):
        runs = wallclip.dead_runs(4.0, [(0.0, 2.0, 4.0), (2.0, 4.0, 2.0)], CEIL, self.along, [])
        self.assertEqual(len(runs), 1)
        self.assertAlmostEqual(runs[0][0], 2.0, places=1)
        self.assertAlmostEqual(runs[0][1], 4.0, places=1)

    def test_line_over_a_hole_in_the_ceiling_is_left_out(self):
        hole = [(-1.0, 1.0), (1.0, 1.0), (1.0, 3.0), (-1.0, 3.0)]
        runs = wallclip.dead_runs(5.0, [(0.0, 5.0, 4.0)], CEIL, self.along, [hole])
        self.assertEqual(len(runs), 1)
        self.assertAlmostEqual(runs[0][0], 1.0, places=1)
        self.assertAlmostEqual(runs[0][1], 3.0, places=1)

    def test_open_edge_without_hole_keeps_its_line(self):
        self.assertEqual(wallclip.dead_runs(5.0, [], CEIL, self.along, []), [])

    def test_gap_between_wall_pieces_keeps_its_line(self):
        spans = [(0.0, 1.0, 4.0), (3.0, 4.0, 4.0)]
        self.assertEqual(wallclip.dead_runs(4.0, spans, CEIL, self.along, []), [])

    def test_subtract(self):
        self.assertEqual(wallclip.subtract(0.0, 4.0, [(1.0, 2.0)]), [(0.0, 1.0), (2.0, 4.0)])
        self.assertEqual(wallclip.subtract(0.0, 4.0, [(0.0, 4.0)]), [])
        self.assertEqual(wallclip.subtract(0.0, 4.0, []), [(0.0, 4.0)])


if __name__ == "__main__":
    unittest.main()
