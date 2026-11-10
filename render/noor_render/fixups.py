"""Corrections to a design export for the walkthrough only (no Blender needed, so plain Python can test them).

They change the scene a panorama is rendered from, never the export, the floor plans or the exterior shots.
"""

import math


def clear_columns(design):
    """A window the export runs into a structural column (the 1 Kanal kitchen's side window starts 0.11 m before
    column A2, so the column stands inside it) is trimmed to start or end at the column's face. The wall the window
    gave up is filled with a solid piece from the sill's foot to the lintel's head. Returns the trimmed window ids."""
    trimmed = []
    for level in design["levels"]:
        columns = level.get("columns", [])
        for op in level["openings"]:
            if op["type"] != "window":
                continue
            (ax, ay), (bx, by) = op["from"], op["to"]
            length = math.hypot(bx - ax, by - ay)
            if length < 1e-6:
                continue
            ux, uy = (bx - ax) / length, (by - ay) / length
            s0, s1 = 0.0, length
            for c in columns:
                if c["top"] <= op["bottom"] or c["bottom"] >= op["top"]:
                    continue
                corners = [(c["x"] + dx, c["y"] + dy) for dx in (0, c["w"]) for dy in (0, c["d"])]
                along = [(px - ax) * ux + (py - ay) * uy for px, py in corners]
                across = [(py - ay) * ux - (px - ax) * uy for px, py in corners]
                half = op["thickness"] / 2
                if min(across) >= half or max(across) <= -half:
                    continue  # beside the wall, not in it
                c0, c1 = min(along), max(along)
                if c1 <= s0 + 1e-6 or c0 >= s1 - 1e-6:
                    continue
                if c0 - s0 <= s1 - c1:  # nearer the start: the window starts at the column's far face
                    s0 = max(s0, c1)
                else:
                    s1 = min(s1, c0)
            if s0 < 1e-6 and s1 > length - 1e-6:
                continue
            if s1 - s0 < 0.3:
                continue  # a column filling the window is a design question, not a trim
            pieces = [w for w in level["walls"] if w.get("opening") == op["id"]]
            point = lambda s: [ax + ux * s, ay + uy * s]  # noqa: E731
            for a, b in ((0.0, s0), (s1, length)):
                if b - a > 1e-6 and pieces:
                    fill = dict(pieces[0], part="solid", opening=None, **{"from": point(a), "to": point(b)})
                    fill["bottom"] = min(w["bottom"] for w in pieces)
                    fill["top"] = max(w["top"] for w in pieces)
                    level["walls"].append(fill)
            for w in pieces:
                w["from"], w["to"] = point(s0), point(s1)
            op["from"], op["to"] = point(s0), point(s1)
            trimmed.append(op["id"])
    return trimmed
