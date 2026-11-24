"""Checks a walkthrough's spots against the design's plan, for mistakes `npm test` does not catch.

    python .claude/skills/house-walkthrough/scripts/check_spots.py --design 2-kanal

Reads src/designs/walkthroughs/<design>.json and render/data/<design>.json (feet). Prints one line per problem and
exits 1 if there is any ERROR. Checks, for every spot with room set (outdoor spots, room null, are skipped):

- ERROR  the spot is not inside its room's outline (the site build fails on this too, but this names the fix)
- ERROR  the spot stands over a hole in its level's floor (a stairwell or a double-height void): it would float
- ERROR  the spot stands on a stair's footprint with rise 0 (put it beside the stair, or give it a rise on a landing)
- ERROR  the spot is inside a fixture box (a counter, a WC, a wardrobe...)
- WARN   the spot is less than 1.2 ft from a solid wall (the panorama is mostly one wall)
- WARN   two spots on one level are less than 1.5 ft apart (wasted render)
- ERROR  duplicate ids, a `start` that names no spot, a link to a missing spot
- WARN   a room that is neither excluded nor has a spot (the site build fails on this)
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
argv = sys.argv[1:]
if "--design" not in argv:
    sys.exit("usage: python .claude/skills/house-walkthrough/scripts/check_spots.py --design <slug>")
design = argv[argv.index("--design") + 1]

wt = json.loads((ROOT / "src" / "designs" / "walkthroughs" / f"{design}.json").read_text(encoding="utf-8"))
data = json.loads((ROOT / "render" / "data" / f"{design}.json").read_text(encoding="utf-8"))
levels = {l["id"]: l for l in data["levels"]}


def inside(p, poly):
    x, y = p
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def seg_dist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dy * dy
    t = 0 if L2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def in_box(p, b, grow=0.0):
    return b["x"] - grow <= p[0] <= b["x"] + b["w"] + grow and b["y"] - grow <= p[1] <= b["y"] + b["d"] + grow


def void_ring(v):
    for key in ("polygon", "outline", "ring", "points"):
        if key in v:
            return v[key]
    return None


errors, warns = [], []
ids = [v["id"] for v in wt["viewpoints"]]
for i in sorted({i for i in ids if ids.count(i) > 1}):
    errors.append(f"duplicate id {i}")
if wt.get("start") not in ids:
    errors.append(f"start {wt.get('start')!r} is not a spot")

for v in wt["viewpoints"]:
    for link in v.get("links", []):
        if link["to"] not in ids:
            errors.append(f"{v['id']}: links to missing spot {link['to']}")
    if v.get("room") is None:
        continue
    level = levels.get(v["level"])
    if level is None:
        errors.append(f"{v['id']}: no level {v['level']}")
        continue
    p = tuple(v["at"])
    room = next((r for r in level["rooms"] if r["id"] == v["room"]), None)
    if room is None:
        errors.append(f"{v['id']}: no room {v['room']} on {v['level']}")
        continue
    rise = v.get("rise", 0) or 0
    if rise > 0:
        continue  # a spot on a stair landing stands above the rooms: the site does not need it inside its room
    if not inside(p, room["outline"]):
        errors.append(f"{v['id']}: at {list(p)} is outside room {v['room']}")
    for hole in (level.get("slab") or {}).get("voids", []):
        ring = void_ring(hole)
        if ring and inside(p, ring):
            errors.append(f"{v['id']}: at {list(p)} stands over the floor hole {hole.get('id')} on {v['level']} (it would float)")
    for st in level.get("stairs", []):
        for step in st.get("steps") or []:
            # treads are exported as solid blocks from the floor; a spot well under a high tread or landing is under the
            # stair (the builder rebuilds it with a soffit), so only a tread lower than 6.5 ft over the floor blocks it
            if in_box(p, step, -0.1) and step.get("top", 0) - level.get("elevation", 0) < 6.5:
                errors.append(f"{v['id']}: at {list(p)} stands on a tread of stair {st.get('id')} with rise 0")
                break
    for fx in level.get("fixtures", []):
        if "w" in fx and in_box(p, fx):
            errors.append(f"{v['id']}: at {list(p)} is inside fixture {fx.get('id')} ({fx.get('type')})")
    near = min((seg_dist(p, tuple(w["from"]), tuple(w["to"])) for w in level["walls"] if w.get("part") == "solid"), default=99)
    if near < 1.2:
        warns.append(f"{v['id']}: only {near:.1f} ft from a solid wall")

pts = [v for v in wt["viewpoints"] if v.get("room") is not None]
for i, a in enumerate(pts):
    for b in pts[i + 1:]:
        if a["level"] == b["level"] and math.dist(a["at"], b["at"]) < 1.5 and (a.get("rise", 0) or 0) == (b.get("rise", 0) or 0):
            warns.append(f"{a['id']} and {b['id']}: {math.dist(a['at'], b['at']):.1f} ft apart")

excluded = {(x["level"], x["room"]) for x in wt.get("excluded", [])}
covered = {(v["level"], v["room"]) for v in pts}
for lid in wt["levels"]:
    for r in levels[lid]["rooms"]:
        if (lid, r["id"]) not in excluded and (lid, r["id"]) not in covered:
            warns.append(f"room {lid}/{r['id']} ({r['name']}) has no spot and is not excluded")

for e in errors:
    print("ERROR", e)
for w in warns:
    print("WARN ", w)
print(f"{design}: {len(wt['viewpoints'])} spots, {len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
