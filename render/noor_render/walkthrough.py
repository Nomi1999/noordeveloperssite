"""Viewpoints from the design's walkthrough file (src/designs/walkthroughs/<slug>.json), in metres.

The site reads the same file, so a room cannot be rendered without being in the tour or the other way round.
Orientation: the centre of every panorama looks along +y (world angle 90 degrees); a viewer turning clockwise from
the centre turns toward +x. See render/README.md.
"""

import json
import os

FT = 0.3048
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(ROOT, "src", "designs", "walkthroughs")
CENTRE_ANGLE = 90.0  # world angle, degrees counter-clockwise from +x, at the centre of every panorama


class ViewpointError(Exception):
    pass


def load(slug):
    path = os.path.join(DIR, f"{slug}.json")
    if not os.path.exists(path):
        raise ViewpointError(f"No walkthrough for design '{slug}': {path}")
    with open(path, encoding="utf-8") as f:
        wt = json.load(f)
    for vp in wt["viewpoints"]:
        vp["at_m"] = [vp["at"][0] * FT, vp["at"][1] * FT]
    return wt


def ids(wt):
    return [v["id"] for v in wt["viewpoints"]]


def get(wt, vid):
    for v in wt["viewpoints"]:
        if v["id"] == vid:
            return v
    raise ViewpointError(f"No viewpoint '{vid}'. Viewpoints: {', '.join(ids(wt))}")
