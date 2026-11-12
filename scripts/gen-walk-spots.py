"""Adds the dense walking spots to a walkthrough: a lattice of spots in every room and one in every inside doorway.

    python scripts/gen-walk-spots.py --design 10-marla [--spacing 6.5] [--dry]

A 3D scan has a capture point every metre or two, with points in the doorways, so the visitor walks by short hops. This
places the same, from the design's own plan (render/data/<design>.json, feet), so no spot is placed by hand:

- doorway spots: one at the middle of every inside door, arch or sliding door, half a foot inside the room on the
  side with the longer view, looking through. The renders show those doors open.
- room spots: a lattice `--spacing` feet apart (evened out to fit the room), kept 2.2 ft off the walls and 1.5 ft off
  fixtures and columns, in every room the walkthrough does not exclude.

The spots already in the walkthrough are kept as they are (the hero views: gate, foyer, lounge...) except the old
`*-door` spots, which stood beside closed doors; a new spot is not placed within a few feet of a kept one. Spots this
script made are named `w-<room>-<n>` and `d-<opening>`, and are replaced on each run. Links are not written: with
`walking` on, the site works out what each spot can see.
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
argv = sys.argv[1:]


def opt(name, default=None):
    return argv[argv.index(f"--{name}") + 1] if f"--{name}" in argv else default


design = opt("design")
if not design:
    sys.exit("usage: python scripts/gen-walk-spots.py --design <slug> [--spacing 6.5] [--dry]")
SPACING = float(opt("spacing", 6.5))
WALL_CLEAR = 2.2  # feet from a room's outline to the eye
FIXTURE_CLEAR = 1.5
KEEP_APART = 4.5  # a lattice spot is not placed within this of another spot
DOOR_APART = 1.6  # nor a hero spot this close to a doorway spot (the hero is dropped, the doorway kept)
DOOR_STEP = 0.5  # how far into the room a doorway spot stands
SEE = 30.0  # ray length when choosing where a spot faces

wt_path = ROOT / "src" / "designs" / "walkthroughs" / f"{design}.json"
wt = json.loads(wt_path.read_text(encoding="utf-8"))
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


def edge_clear(p, poly):
    return min(seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))


def box_dist(p, b):
    dx = max(b["x"] - p[0], 0, p[0] - (b["x"] + b["w"]))
    dy = max(b["y"] - p[1], 0, p[1] - (b["y"] + b["d"]))
    return math.hypot(dx, dy)


def ray(level, p, ang, blockers):
    """Free distance from p along ang (degrees ccw from +x) to the first wall, capped at SEE."""
    ux, uy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    best = SEE
    for a, b in blockers:
        ex, ey = b[0] - a[0], b[1] - a[1]
        det = ux * ey - uy * ex
        if abs(det) < 1e-9:
            continue
        wx, wy = a[0] - p[0], a[1] - p[1]
        t = (wx * ey - wy * ex) / det
        s = (wx * uy - wy * ux) / det
        if t > 0.05 and 0 <= s <= 1:
            best = min(best, t)
    return best


def blockers_of(level):
    """Wall pieces that stop a view at eye height: full walls, and the walls round windows and doors are not blocked."""
    return [(tuple(w["from"]), tuple(w["to"])) for w in level["walls"] if w["part"] == "solid"]


def facing_for(level, p, blockers, within=None):
    """The direction with the longest free view (every 15 degrees), ties to the first; `within` limits it to a set of angles."""
    angles = within if within is not None else range(0, 360, 15)
    return max(angles, key=lambda a: (round(ray(level, p, a, blockers), 1), -abs(((a - 90 + 180) % 360) - 180)))


excluded = {(x["level"], x["room"]) for x in wt.get("excluded", [])}
old = [v for v in wt["viewpoints"] if not re.match(r"^(w-|d-)", v["id"])]
# the earlier hand-placed doorway spots stood beside closed doors; the generated ones replace them
old = [v for v in old if not v["id"].endswith("-door")]
spots = []  # the spots this run makes


def too_close(p, level_id, limit, pool):
    return any(v["level"] == level_id and math.hypot(v["at"][0] - p[0], v["at"][1] - p[1]) < limit for v in pool)


made_doors = []
for lid in wt["levels"]:
    level = levels[lid]
    rooms = [r for r in level["rooms"] if (lid, r["id"]) not in excluded]
    blockers = blockers_of(level)
    for op in level["openings"]:
        if op["type"] == "window":
            continue
        wall = next(w for w in level["walls"] if w["wall"] == op["wall"])
        if wall["kind"] == "exterior":
            continue  # the front and back doors stay closed: a spot in front of one shows a door, not a way through
        a, b = op["from"], op["to"]
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        sides = []
        for sgn in (1, -1):
            n = (-u[1] * sgn, u[0] * sgn)
            p = (mid[0] + n[0] * DOOR_STEP, mid[1] + n[1] * DOOR_STEP)
            room = next((r for r in rooms if inside(p, r["outline"])), None)
            if room:
                ang = math.degrees(math.atan2(-n[1], -n[0])) % 360  # looking back through the door...
                forward = math.degrees(math.atan2(n[1], n[0])) % 360  # ...or on into the room it stands in
                sides.append((ray(level, p, forward, blockers), room, p, forward))
        if not sides:
            continue
        # stand in the room with the longer view ahead, and look that way
        far, room, p, forward = max(sides, key=lambda s: s[0])
        made_doors.append({
            "id": f"d-{op['id']}", "room": room["id"], "level": lid, "at": [round(p[0], 2), round(p[1], 2)],
            "facing": round(forward), "description": f"The doorway of the {room['name'].lower()}, looking into the room.", "links": [],
        })

# the doorway spots win over a hand-placed one next to them
old = [v for v in old if not too_close(v["at"], v["level"], DOOR_APART, made_doors)]
spots += made_doors

for lid in wt["levels"]:
    level = levels[lid]
    blockers = blockers_of(level)
    fixtures = level.get("fixtures", []) + level.get("columns", [])
    for room in level["rooms"]:
        if (lid, room["id"]) in excluded:
            continue
        poly = room["outline"]
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        x0, x1, y0, y1 = min(xs) + WALL_CLEAR, max(xs) - WALL_CLEAR, min(ys) + WALL_CLEAR, max(ys) - WALL_CLEAR

        def lattice(lo, hi):
            if hi < lo:
                return [(lo + hi) / 2]
            n = max(1, math.ceil((hi - lo) / SPACING)) + 1
            return [lo + (hi - lo) * i / (n - 1) for i in range(n)] if n > 1 else [(lo + hi) / 2]

        cand = []
        for x in lattice(x0, x1):
            for y in lattice(y0, y1):
                p = (x, y)
                if not inside(p, poly) or edge_clear(p, poly) < WALL_CLEAR - 0.3:
                    continue
                if any(box_dist(p, f) < FIXTURE_CLEAR for f in fixtures if "w" in f):
                    continue
                cand.append(p)
        pool = old + spots
        made = []
        for p in sorted(cand, key=lambda q: (round(q[1] / 2), q[0])):
            if too_close(p, lid, KEEP_APART, pool + made):
                continue
            made.append({"id": "", "room": room["id"], "level": lid, "at": [round(p[0], 2), round(p[1], 2)]})
        # a room with no spot of its own in or beside it gets its best-clear point
        if not made and not any(v["room"] == room["id"] and v["level"] == lid for v in pool):
            best = None
            for x in lattice(min(xs) + 1, max(xs) - 1):
                for y in lattice(min(ys) + 1, max(ys) - 1):
                    p = (x, y)
                    if inside(p, poly) and not any(box_dist(p, f) < 1.0 for f in fixtures if "w" in f):
                        c = edge_clear(p, poly)
                        if best is None or c > best[0]:
                            best = (c, p)
            if best:
                made.append({"id": "", "room": room["id"], "level": lid, "at": [round(best[1][0], 2), round(best[1][1], 2)]})
        for i, m in enumerate(made, 1):
            m["id"] = f"w-{room['id']}-{i}"
            m["facing"] = round(facing_for(level, tuple(m["at"]), blockers))
            m["description"] = f"A view of the {room['name'].lower()}."
            m["links"] = []
        spots += made

out = old + spots
if "--dry" in argv:
    per = {}
    for v in spots:
        per[(v["level"], v["room"])] = per.get((v["level"], v["room"]), 0) + 1
    print(f"kept {len(old)}, new {len(spots)} ({sum(1 for v in spots if v['id'].startswith('d-'))} doorway), total {len(out)}")
    for k, n in sorted(per.items()):
        print(" ", k, n)
    sys.exit(0)
wt["viewpoints"] = out
wt_path.write_text(json.dumps(wt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{wt_path.name}: kept {len(old)}, added {len(spots)}, total {len(out)}")
