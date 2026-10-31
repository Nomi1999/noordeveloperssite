"""Site works and street context.

Plot ground sits at GRADE (6" above the road). The street runs along the plot front
(y < 0): footpath, kerb, asphalt, then the far kerb and footpath. Neighbouring plots
get boundary walls and generic, muted massing so the design is always the brightest
and most detailed thing in frame.
"""

import random

from mathutils import Vector

from . import materials
from .geometry import GRADE, PIT, SKIN
from .util import aabb, boxes_object, collection, offset_polygon, piece_box, prism_object

FOOTPATH = 1.83
KERB = 0.18
ROAD = 9.0
MARGIN = 0.3  # excavation working space around the footprint


def build(design, root, footprint, context):
    site = collection("site", root)
    ctx = collection("context", root)
    W, D = design["plot"]["width"], design["plot"]["depth"]
    s = design["site"]

    # ---- plot ground and excavation ----
    inset = 0.02
    holes = [[(min(max(x, inset), W - inset), min(max(y, inset), D - inset)) for x, y in offset_polygon(f, MARGIN)]
             for f in footprint]
    plot = [(0, 0), (W, 0), (W, D), (0, D)]
    prism_object("plot-ground", plot, holes, PIT - 0.05, GRADE - 0.02, materials.get("soil"), site, bevel=False)
    for i, (outer, hole) in enumerate(zip(footprint, holes)):
        prism_object(f"pit-floor-{i}", hole, [], PIT - 0.05, PIT, materials.get("soil"), site, bevel=False)
        prism_object(f"excavation-{i}", hole, [], PIT, GRADE - 0.02, materials.get("soil"), site, bevel=False,
                     role="excavation", depth=GRADE - 0.02 - PIT - 0.01)
        prism_object(f"backfill-{i}", hole, [outer], PIT, GRADE - 0.02, materials.get("soil"), site, bevel=False,
                     role="backfill")

    # ---- hard and soft landscaping ----
    for p in s["porches"]:
        prism_object(f"porch-{p['id']}", p["outline"], [], GRADE - 0.03, GRADE + 0.02, materials.get(p["material"]),
                     site, role="porch")
    for p in s["driveways"]:
        prism_object(f"drive-{p['id']}", p["outline"], [], GRADE - 0.03, GRADE + 0.015, materials.get(p["material"]),
                     site, role="paving")
    for p in s["paving"]:
        prism_object(f"paving-{p['id']}", p["outline"], [], GRADE - 0.03, GRADE + 0.012, materials.get(p["material"]),
                     site, role="paving")
    for p in s["lawns"]:
        prism_object(f"lawn-{p['id']}", p["outline"], [], GRADE - 0.03, GRADE + 0.005, materials.get("grass"), site,
                     bevel=False, role="lawn")
    _entry_steps(design, site)

    # ---- boundary ----
    b = s["boundary"]
    walls = b["walls"]
    if walls:
        boxes_object("boundary-brick", [piece_box(w) for w in walls], materials.get("brick-structure"), site,
                     union=True, bevel=False, role="boundary-brick")
        boxes_object("boundary-skin", [piece_box(w, grow=SKIN) for w in walls], materials.get(b["material"]), site,
                     union=True, role="boundary-skin")
        boxes_object("boundary-coping", [piece_box(dict(w, thickness=w["thickness"] + 0.05, bottom=w["top"],
                                                        top=w["top"] + 0.05), grow_ends=0.025) for w in walls],
                     materials.get("exposed-concrete"), site, union=True, role="boundary-skin")
    posts = []
    for g in b["gates"]:
        for end in (g["from"], g["to"]):
            x, y = end
            posts.append(aabb(x - 0.18, y - 0.18, 0, x + 0.18, y + 0.18, g["top"] + 0.18))
        _gate(g, site)
    if posts:
        boxes_object("gate-posts", posts, materials.get("stone-cladding"), site, union=True, role="gate-post")

    # ---- street ----
    x0, x1 = -120.0, W + 120.0
    near_kerb = -FOOTPATH
    far_kerb = near_kerb - KERB - ROAD
    boxes_object("footpath", [aabb(x0, near_kerb, -0.2, x1, 0, GRADE)], materials.get("footpath"), ctx, bevel=False)
    boxes_object("kerb", [aabb(x0, near_kerb - KERB, -0.2, x1, near_kerb, GRADE + 0.01),
                          aabb(x0, far_kerb, -0.2, x1, far_kerb + KERB, GRADE + 0.01)], materials.get("kerb"), ctx)
    boxes_object("road", [aabb(x0, far_kerb + KERB, -0.3, x1, near_kerb - KERB, 0)], materials.get("asphalt"), ctx,
                 bevel=False)
    boxes_object("far-footpath", [aabb(x0, far_kerb - FOOTPATH, -0.2, x1, far_kerb, GRADE)],
                 materials.get("footpath"), ctx, bevel=False)
    # aprons where the gates cross the footpath
    for g in b["gates"]:
        if g["kind"] != "vehicle":
            continue
        gx0, gx1 = sorted((g["from"][0], g["to"][0]))
        prism_object(f"apron-{g['id']}", [(gx0, near_kerb - KERB), (gx1, near_kerb - KERB), (gx1, 0), (gx0, 0)], [],
                     -0.1, GRADE + 0.003, materials.get("footpath"), ctx, bevel=False,
                     top_z=lambda x, y: 0.003 + (GRADE) * max(0.0, min(1.0, (y - (near_kerb - KERB)) / 1.0)))
    boxes_object("ground-far", [aabb(-600, -600, -0.35, 600, 600, -0.25)], materials.get("soil"), ctx, bevel=False)

    _neighbours(design, ctx, far_kerb - FOOTPATH, context)
    return ctx


def _entry_steps(design, col):
    """Steps from the plot ground up to the floor at each exterior ground-floor door."""
    ground = design["levels"][0]
    floor = ground["slab"]["top"]
    kinds = {w["wall"]: w["kind"] for w in ground["walls"]}
    from .facade import _outward
    boxes = []
    for op in ground["openings"]:
        if kinds.get(op["wall"]) != "exterior" or op["type"] == "window":
            continue
        a, u, n, _ = _outward(op, ground)
        width = (Vector(op["to"]) - Vector(op["from"])).length
        rise = floor - GRADE
        count = max(1, round(rise / 0.15))
        r = rise / count
        start = op["thickness"] / 2 + SKIN
        for i in range(count):
            out = start + (count - i) * 0.3
            c = [a + u * (-0.15) + n * start, a + u * (width + 0.15) + n * start,
                 a + u * (width + 0.15) + n * out, a + u * (-0.15) + n * out]
            z = GRADE + r * (i + 1)
            boxes.append([(v.x, v.y, GRADE - 0.03) for v in c] + [(v.x, v.y, z) for v in c])
    if boxes:
        boxes_object("entry-steps", boxes, materials.get("porcelain-paving"), col, union=True, role="porch")


def _gate(g, col):
    """A dark metal gate of vertical slats between top and bottom rails."""
    a, b = Vector((*g["from"], 0)), Vector((*g["to"], 0))
    u = (b - a).normalized()
    n = Vector((-u.y, u.x, 0))
    L = (b - a).length
    z0, z1 = g["bottom"] + 0.06, g["top"] - 0.04
    t = 0.04

    def box(s0, s1, h0, h1, depth=t):
        c = [a + u * s0 - n * depth / 2, a + u * s1 - n * depth / 2, a + u * s1 + n * depth / 2, a + u * s0 + n * depth / 2]
        return [(v.x, v.y, h0) for v in c] + [(v.x, v.y, h1) for v in c]

    parts = [box(0.2, L - 0.2, z0, z0 + 0.08, 0.06), box(0.2, L - 0.2, z1 - 0.08, z1, 0.06),
             box(0.2, 0.26, z0, z1, 0.06), box(L - 0.26, L - 0.2, z0, z1, 0.06)]
    slat, gap = 0.075, 0.022
    s = 0.26 + gap
    while s + slat < L - 0.26:
        parts.append(box(s, s + slat, z0 + 0.08, z1 - 0.08, 0.03))
        s += slat + gap
    if g["kind"] == "vehicle":
        parts.append(box(L / 2 - 0.004, L / 2 + 0.004, z0, z1, 0.065))
    boxes_object(f"gate-{g['id']}", parts, materials.get(g["material"]), col, union=True, role="gate")


def _neighbours(design, ctx, far_line, context):
    """Generic houses either side, behind and across the street, in muted plaster."""
    W, D = design["plot"]["width"], design["plot"]["depth"]
    commercial = design["kind"] == "commercial"
    rng = random.Random(design["slug"])
    wall_mat, glass_mat = materials.get("neighbour"), materials.get("neighbour-window")
    plots = []
    for k in (1, 2, 3):
        plots.append((-k * W, 0, W, D, "front"))
        plots.append((W + (k - 1) * W, 0, W, D, "front"))
    for k in range(-3, 4):
        plots.append((k * W, D, W, D, "back"))
        plots.append((k * W, far_line - D, W, D, "back-to-street"))
    for i, (px, py, pw, pd, facing) in enumerate(plots):
        walls, mass, windows = [], [], []
        th = 0.23
        if facing != "back":
            fy = py + pd if facing == "back-to-street" else py
            walls.append(aabb(px, fy - th / 2, 0, px + pw, fy + th / 2, 2.1))
        walls.append(aabb(px, py, 0, px + th, py + pd, 2.1))
        storeys = rng.choice((2, 3)) if commercial else rng.choice((1, 2, 2))
        h = 3.5 if commercial else 3.2
        # commercial frontages share the plaza setback so the street wall lines up
        set_front = rng.uniform(4.0, 5.0) if commercial else rng.uniform(4.5, 7.5)
        set_side = 0.0 if commercial else rng.uniform(0.0, 1.4)
        depth = pd * (0.75 if commercial else rng.uniform(0.45, 0.6))
        bx0, bx1 = px + set_side, px + pw - (0 if commercial else rng.uniform(0.0, 1.4))
        if facing == "back-to-street":
            by1 = py + pd - set_front
            by0 = by1 - depth
            face_y, face_n = by1, 1
        else:
            by0 = py + set_front
            by1 = by0 + depth
            face_y, face_n = by0, -1
        top = 0.45 + storeys * h
        mass.append(aabb(bx0, by0, 0, bx1, by1, top))
        mass.append(aabb(bx0 - 0.02, by0 - 0.02, top, bx1 + 0.02, by1 + 0.02, top + 0.9))  # parapet band
        if not commercial and rng.random() < 0.6:  # a cantilevered box on the upper floor
            cx0 = bx0 + rng.uniform(0.5, 3)
            cy0, cy1 = (face_y - 0.9, face_y + 0.01) if face_n < 0 else (face_y - 0.01, face_y + 0.9)
            mass.append(aabb(cx0, cy0, 0.45 + h, cx0 + rng.uniform(3, 5), cy1, 0.45 + 2 * h))
        for st in range(storeys):
            z0 = 0.45 + st * h + 0.9
            z1 = z0 + (2.6 if commercial and st == 0 else 1.5)
            count = rng.choice((2, 3)) if not commercial else 4
            span = (bx1 - bx0) / count
            for c in range(count):
                if rng.random() < 0.2:
                    continue
                wx0 = bx0 + c * span + span * 0.2
                wx1 = bx0 + (c + 1) * span - span * 0.2
                y0, y1 = (face_y - 0.05, face_y + 0.02) if face_n < 0 else (face_y - 0.02, face_y + 0.05)
                windows.append(aabb(wx0, y0, z0, wx1, y1, z1))
        boxes_object(f"neighbour-{i}", walls + mass, wall_mat, ctx, union=True, context="neighbour")
        if windows:
            win = boxes_object(f"neighbour-windows-{i}", windows, glass_mat, ctx, bevel=False, context="neighbour")
            # at dusk some rooms are lit and some aren't; six faces per window box
            lr = random.Random(f"{design['slug']}-lit-{i}")  # separate stream keeps the layout unchanged
            lit = [lr.uniform(0.5, 1.2) if lr.random() < 0.45 else 0.0 for _ in windows]
            attr = win.data.attributes.new("lit", "FLOAT", "FACE")
            attr.data.foreach_set("value", [v for v in lit for _ in range(6)])

