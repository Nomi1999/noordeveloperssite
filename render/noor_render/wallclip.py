"""Where a wall finish may stand: pure arithmetic with no Blender, so it is tested with plain Python.

A room's finishes (feature cladding, panelling, the ceiling-edge light) are laid along the room outline up to the
room's ceiling. A wall stretch can be lower than that (the wall under a stair landing stops short, above it is the open
stairwell), and the slab above can have a hole in it. These helpers say how high a stretch of wall really is, and
where a light line at the ceiling has no full-height wall (or no ceiling) behind it.

Edge coordinates are `s`: distance along the room edge from its start, in the same units as the wall data (metres).
A wall span is (s0, s1, top).
"""

import math

TOL = 0.05  # a wall this close to the ceiling counts as reaching it
HOLE_MARGIN = 0.0  # a ceiling-edge light closer than this to a hole in the ceiling counts as inside it (0: only inside)


def union(intervals, least=0.0):
    """Merge overlapping or touching (a, b) intervals; drop those shorter than `least`."""
    out = []
    for a, b in sorted(i for i in intervals if i[1] > i[0]):
        if out and a <= out[-1][1] + 1e-9:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out if b - a >= least]


def full_height_runs(spans, ceil_z, tol=TOL):
    """The stretches of an edge where a wall reaches the ceiling."""
    return union([(s0, s1) for s0, s1, top in spans if top >= ceil_z - tol])


def top_runs(spans, lo, hi, cap, least=0.01):
    """Split lo..hi into runs of constant wall height: [(a, b, top)], top capped at `cap`. Stretches with no wall under
    them are left out. Where two spans overlap the taller counts."""
    cuts = sorted({lo, hi, *[c for s0, s1, _ in spans for c in (s0, s1) if lo < c < hi]})
    out = []
    for a, b in zip(cuts, cuts[1:]):
        mid = (a + b) / 2
        tops = [top for s0, s1, top in spans if s0 <= mid <= s1]
        if not tops or b - a < least:
            continue
        top = min(cap, max(tops))
        if out and abs(out[-1][2] - top) < 1e-9 and abs(out[-1][1] - a) < 1e-9:
            out[-1] = (out[-1][0], b, top)
        else:
            out.append((a, b, top))
    return out


def seg_distance(pt, a, b):
    ax, ay = a
    dx, dy = b[0] - ax, b[1] - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(pt[0] - ax - dx * t, pt[1] - ay - dy * t)


def near_hole(pt, hole, margin=HOLE_MARGIN):
    """Inside the polygon `hole`, or within `margin` of its outline."""
    x, y = pt
    ins = False
    j = len(hole) - 1
    for i in range(len(hole)):
        xi, yi = hole[i]
        xj, yj = hole[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins or any(seg_distance(pt, hole[i - 1], hole[i]) < margin for i in range(len(hole)))


def dead_runs(length, spans, ceil_z, point_at, holes, step=0.05):
    """The stretches of an edge along which a ceiling-edge light line must not run: where a wall stands but stops short
    of the ceiling, or where the ceiling is open (a hole in the slab above). Stretches with no wall piece at all are
    left alone unless a hole is there: the room just runs on into the next one.
    `point_at(s)` is the light line's position on the edge, as (x, y)."""
    full = full_height_runs(spans, ceil_z)
    walled = union([(s0, s1) for s0, s1, _ in spans])
    dead = []
    n = max(1, int(math.ceil(length / step)))
    for k in range(n):
        a, b = length * k / n, length * (k + 1) / n
        mid = (a + b) / 2
        low = any(w0 <= mid <= w1 for w0, w1 in walled) and not any(f0 <= mid <= f1 for f0, f1 in full)
        if low or any(near_hole(point_at(mid), h) for h in holes):
            dead.append((a, b))
    return union(dead)


def subtract(a, b, dead, least=0.0):
    """The parts of the interval a..b outside the `dead` intervals."""
    out, t = [], a
    for d0, d1 in sorted(dead):
        if d1 <= t:
            continue
        if d0 >= b:
            break
        if d0 > t:
            out.append((t, d0))
        t = max(t, d1)
    if t < b:
        out.append((t, b))
    return [(p, q) for p, q in out if q - p > max(least, 1e-9)]
