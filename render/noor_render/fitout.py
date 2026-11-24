"""Plan arithmetic for the interior fit-out, with no Blender, so it is tested with plain Python.

Coordinates are plan (x, y) in the units of the data passed in (metres in the builder, feet in the export); only
the tolerances assume metres.
"""

import math


def bbox(poly):
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def notched_voids(voids, holes, tol=1e-3):
    """The double-height voids that are not among a slab's holes: a void that reaches the slab's outline is cut out
    of the outline as a notch, so it never appears as a hole (the 2 Kanal lounge)."""
    boxes = [bbox(h) for h in holes]
    return [v for v in voids if v.get("kind") == "double-height"
            and not any(all(abs(a - b) < tol for a, b in zip(bbox(v["outline"]), hb)) for hb in boxes)]


def gaps(length, covered, least=0.1):
    """The parts of 0..length that no interval in `covered` reaches."""
    out, t = [], 0.0
    for s0, s1 in sorted(covered):
        if s0 - t > least:
            out.append((t, s0))
        t = max(t, s1)
    if length - t > least:
        out.append((t, length))
    return out


def openings_behind(openings, origin, u, length, reach):
    """Windows and doors in the wall behind a counter running `length` from `origin` along unit `u`, as
    (s0, s1, bottom, top): those parallel to it whose wall line lies within half their thickness plus `reach`."""
    out = []
    for op in openings:
        (ax, ay), (bx, by) = op["from"], op["to"]
        dx, dy = bx - ax, by - ay
        dl = math.hypot(dx, dy)
        if dl < 1e-6 or abs(dx * u[1] - dy * u[0]) / dl > 1e-3:
            continue
        if abs((ax - origin[0]) * u[1] - (ay - origin[1]) * u[0]) > op["thickness"] / 2 + reach:
            continue
        o0, o1 = sorted(((ax - origin[0]) * u[0] + (ay - origin[1]) * u[1], (bx - origin[0]) * u[0] + (by - origin[1]) * u[1]))
        if o1 > 0 and o0 < length:
            out.append((o0, o1, op["bottom"], op["top"]))
    return out


def counter_line(fx):
    """A counter fixture's back edge as (origin, u, length, depth), as fixtures() lays it out (before the 18 mm
    offset off the wall): `u` runs along the wall, the fixture's depth is away from it."""
    x, y, w, d, back = fx["x"], fx["y"], fx["w"], fx["d"], fx["back"]
    if back == "left":
        return (x, y), (0.0, 1.0), d, w
    if back == "right":
        return (x + w, y), (0.0, 1.0), d, w
    if back == "front":
        return (x, y), (1.0, 0.0), w, d
    return (x, y + d), (1.0, 0.0), w, d


def spans_along(origin, u, length, rects, margin=0.0):
    """Where plan rectangles (x, y, w, d) lie along a counter running `length` from `origin` in direction `u`:
    (s0 - margin, s1 + margin) for each one whose centre is over the counter's run."""
    out = []
    for x, y, w, d in rects:
        cx, cy = x + w / 2, y + d / 2
        s = (cx - origin[0]) * u[0] + (cy - origin[1]) * u[1]
        if not 0 < s < length:
            continue
        ends = [(px - origin[0]) * u[0] + (py - origin[1]) * u[1] for px in (x, x + w) for py in (y, y + d)]
        out.append((min(ends) - margin, max(ends) + margin))
    return out


def _edge(ring, i):
    p, q = ring[i], ring[(i + 1) % len(ring)]
    dx, dy = q[0] - p[0], q[1] - p[1]
    n = math.hypot(dx, dy) or 1.0
    u = (dx / n, dy / n)
    return p, u, (-u[1], u[0])  # n: into the hole, for a counter-clockwise ring


def flight_foot(stairs, ring):
    """(edge index, s0, s1): where a stair on the level above starts at the edge of a hole in its floor, the foot of
    its first flight, which must stay open (a stair to the roof rising from the stairwell's edge)."""
    for st in stairs:
        steps = st.get("steps") or []
        if len(steps) < 2:
            continue
        a, b = steps[0], steps[1]
        rx, ry = b["x"] - a["x"], b["y"] - a["y"]
        rn = math.hypot(rx, ry)
        if rn < 1e-6:
            continue
        rx, ry = rx / rn, ry / rn
        cx, cy = a["x"] + a["w"] / 2, a["y"] + a["d"] / 2
        for i in range(len(ring)):
            p, u, n = _edge(ring, i)
            # the flight must rise away from this edge into the hole, and its first step stand at the edge
            if n[0] * rx + n[1] * ry < 0.99:
                continue
            if abs((cx - p[0]) * u[1] - (cy - p[1]) * u[0]) > max(a["w"], a["d"]) * 1.5:
                continue
            ends = [(px - p[0]) * u[0] + (py - p[1]) * u[1] for px in (a["x"], a["x"] + a["w"]) for py in (a["y"], a["y"] + a["d"])]
            return i, min(ends) - 0.05, max(ends) + 0.05
    return None


def flight_gaps(steps, widest=0.15, eps=1e-3):
    """Fillers (x0, y0, x1, y1, top) for the narrow gaps between the two flights of a dog-leg built solid: a slot
    less than `widest` across between steps of different flights, up to the lower of the two."""
    out = []
    for i, A in enumerate(steps):
        for B in steps[i + 1:]:
            for ax, size in (("x", "w"), ("y", "d")):
                ox, osize = ("y", "d") if ax == "x" else ("x", "w")
                a1, b1 = A[ax] + A[size], B[ax] + B[size]
                if eps < B[ax] - a1 < widest:
                    g0, g1 = a1, B[ax]
                elif eps < A[ax] - b1 < widest:
                    g0, g1 = b1, A[ax]
                else:
                    continue
                o0, o1 = max(A[ox], B[ox]), min(A[ox] + A[osize], B[ox] + B[osize])
                if o1 - o0 < eps:
                    continue
                top = min(A["top"], B["top"])
                out.append((g0, o0, g1, o1, top) if ax == "x" else (o0, g0, o1, g1, top))
    return out


def within(rect, st, eps=1e-3):
    """Whether a step (x, y, w, d) lies inside its stair's footprint."""
    return (rect["x"] >= st["x"] - eps and rect["y"] >= st["y"] - eps and rect["x"] + rect["w"] <= st["x"] + st["w"] + eps
            and rect["y"] + rect["d"] <= st["y"] + st["d"] + eps)
