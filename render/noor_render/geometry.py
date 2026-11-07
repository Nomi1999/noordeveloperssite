"""Structure and walls from the export: everything is a box or an extruded polygon.

Walls come in two layers so the construction rig can show the brick turning into
the finished facade: a brick core (the pieces as exported) and a finish skin (the
same pieces grown by SKIN on every side, in the wall's material). Each layer is
the union of its pieces, so the shared bevel only rounds real edges and never
cuts grooves where pieces meet.

Objects carry `role` and `level` properties; construction.py turns those into
phase timings.
"""

from collections import defaultdict

from . import materials
from .util import (aabb, boxes_object, collection, piece_box, point_in_polygon, prism_object, rect_box,
                   offset_polygon)

SKIN = 0.012        # finish layer thickness over brick and concrete, m
CLADDING = {"brick-cladding", "plaster-charcoal"}  # stand proud of plaster, which ends flush where walls meet
ALONG_WALL = 0.3  # m: a beam whose midpoint is this close to a wall runs along it
GRADE = 0.1524      # finished ground inside the plot (6" above the road), m
PIT = -0.9          # excavation depth, m
FOOTING = 1.2       # pad footing size, m
BEAM_DEPTH = 0.4572  # 1'-6"
BEAM_WIDTH = 0.2286  # 9", the exterior wall thickness
TREAD = 0.05        # spiral stair tread thickness, m
POLE = 0.05         # half the width of a spiral stair's pole, m


def _centre(c):
    return c["x"] + c["w"] / 2, c["y"] + c["d"] / 2


def _in_slab(pt, slab):
    return any(point_in_polygon(pt, p["outer"]) and not any(point_in_polygon(pt, h) for h in p["holes"])
               for p in slab["polygons"])


def beams(level, above):
    """Beams between neighbouring columns along grid lines, under the slab they carry."""
    cols = [_centre(c) for c in level["columns"]]
    if not cols or above is None:
        return []
    top = level["columns"][0]["top"]
    out = []
    for axis in (0, 1):
        lines = defaultdict(list)
        for c in cols:
            lines[round(c[axis], 4)].append(c)
        for line in lines.values():
            line.sort(key=lambda c: c[1 - axis])
            for a, b in zip(line, line[1:]):
                mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                if _in_slab(mid, above["slab"]):
                    out.append({"from": a, "to": b, "thickness": BEAM_WIDTH, "bottom": top - BEAM_DEPTH, "top": top})
    return out


def _nearest_wall(pt, walls, fallback, skip=()):
    """The material of the exterior wall nearest a point, and how far away that wall is."""
    best, best_d = fallback, 1e9
    for w in walls:
        if w["kind"] != "exterior" or w["material"] in skip:
            continue
        (x0, y0), (x1, y1) = w["from"], w["to"]
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy or 1e-9
        t = max(0.0, min(1.0, ((pt[0] - x0) * dx + (pt[1] - y0) * dy) / L2))
        d = ((x0 + t * dx - pt[0]) ** 2 + (y0 + t * dy - pt[1]) ** 2) ** 0.5
        if d < best_d:
            best, best_d = w["material"], d
    return best, best_d


def _beam_material(beam, walls, fallback):
    """Cladding wraps only a beam that runs along it; a beam crossing a porch or a side wall stays plaster."""
    mid = ((beam["from"][0] + beam["to"][0]) / 2, (beam["from"][1] + beam["to"][1]) / 2)
    material, distance = _nearest_wall(mid, walls, fallback)
    if material in CLADDING and distance > ALONG_WALL:
        material, _ = _nearest_wall(mid, walls, fallback, skip=CLADDING)
    return material


def _spiral(lid, li, st, col):
    """Separate radial treads around a steel pole."""
    mat = materials.get("metal-dark")
    treads = st["treadPolygons"]
    for i, t in enumerate(treads):
        prism_object(f"stair-{lid}-{st['id']}-{i}", t["outline"], [], t["top"] - TREAD, t["top"], mat, col, bevel=False,
                     role="spiral", order=i / len(treads), level=li)
    cx, cy = st["x"] + st["w"] / 2, st["y"] + st["d"] / 2
    top = st["treadPolygons"][-1]["top"] + 0.9
    boxes_object(f"stair-{lid}-{st['id']}-pole", [aabb(cx - POLE, cy - POLE, st["bottom"] - 0.4, cx + POLE, cy + POLE, top)],
                 mat, col, role="spiral", order=0.0, level=li)


def build(design, root):
    col = collection("structure", root)
    levels = design["levels"]
    ground = levels[0]
    footprint = [p["outer"] for p in ground["slab"]["polygons"]]

    # ---- foundation ----
    gcols = ground["columns"]
    footings = [aabb(cx - FOOTING / 2, cy - FOOTING / 2, PIT, cx + FOOTING / 2, cy + FOOTING / 2, PIT + 0.3)
                for cx, cy in map(_centre, gcols)]
    if footings:
        boxes_object("footings", footings, materials.get("exposed-concrete"), col, role="footing", level=0)
        stubs = [rect_box(dict(c, bottom=PIT + 0.3, top=ground["slab"]["bottom"])) for c in gcols]
        boxes_object("column-stubs", stubs, materials.get("exposed-concrete"), col, role="stub", level=0)
    for i, outer in enumerate(footprint):
        prism_object(f"plinth-{i}", outer, [], PIT, ground["slab"]["bottom"], materials.get("brick-structure"), col,
                     bevel=False, role="plinth", level=0)
        skin = offset_polygon(outer, SKIN)
        prism_object(f"plinth-skin-{i}", skin, [], GRADE - 0.05, ground["slab"]["top"],
                     materials.get("plaster-warm-grey"), col, role="plinth-skin", level=0)

    # ---- levels ----
    for li, level in enumerate(levels):
        lid = level["id"]
        above = levels[li + 1] if li + 1 < len(levels) else None
        slab = level["slab"]
        for k, poly in enumerate(slab["polygons"]):
            prism_object(f"slab-{lid}-{k}", poly["outer"], poly["holes"], slab["bottom"], slab["top"],
                         materials.get(slab["material"]), col, role="slab", level=li)

        if level["columns"]:
            boxes_object(f"columns-{lid}", [rect_box(c) for c in level["columns"]], materials.get("exposed-concrete"),
                         col, role="column", level=li)
        level_beams = beams(level, above)
        if level_beams:
            boxes_object(f"beams-{lid}", [piece_box(b) for b in level_beams], materials.get("exposed-concrete"), col,
                         union=True, role="beam", level=li)
        for st in level["stairs"]:
            if st["steps"]:
                boxes_object(f"stair-{lid}-{st['id']}", [rect_box(s) for s in st["steps"]],
                             materials.get("exposed-concrete"), col, union=True, role="stair", level=li)
            if "treadPolygons" in st:
                _spiral(lid, li, st, col)

        walls = level["walls"]
        if walls:
            boxes_object(f"brick-{lid}", [piece_box(w) for w in walls], materials.get("brick-structure"), col,
                         union=True, bevel=False, role="brick", level=li)
            skins = defaultdict(list)
            for w in walls:
                skins[w["material"]].append(piece_box(w, grow=SKIN * 2 if w["material"] in CLADDING else SKIN))
            default = walls[0]["material"]
            for c in level["columns"]:
                skins[_nearest_wall(_centre(c), walls, default)[0]].append(rect_box(c, grow=SKIN))
            for b in level_beams:
                skins[_beam_material(b, walls, default)].append(piece_box(b, grow=SKIN))
            for mat, boxes in skins.items():
                boxes_object(f"skin-{lid}-{mat}", boxes, materials.get(mat), col, union=True, role="skin", level=li)

        if level["parapets"]:
            boxes_object(f"parapet-brick-{lid}", [piece_box(p) for p in level["parapets"]],
                         materials.get("brick-structure"), col, union=True, bevel=False, role="brick", level=li)
            skins = defaultdict(list)
            for p in level["parapets"]:
                skins[p["material"]].append(piece_box(p, grow=SKIN))
            for mat, boxes in skins.items():
                boxes_object(f"parapet-skin-{lid}-{mat}", boxes, materials.get(mat), col, union=True,
                             role="skin", level=li)

        for t in level["tanks"]:
            boxes_object(f"tank-{t['id']}", [rect_box(t)], materials.get(t["material"]), col, role="tank", level=li)
    return footprint
