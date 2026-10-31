"""Facade elements, openings and what shows through them.

- facade boxes (fins, cladding, soffits, canopies, frames, mullions) and railings from the export;
- windows and glazed doors: a dark metal frame set back from the outer face, mullions
  every ≤1.4 m, and a glass pane; solid doors get a wood leaf and a pull handle;
- behind every exterior glazed opening, an interior backplate card inside the room
  so windows never read as black voids, plus one ceiling light per glazed room
  (returned for lighting.py).
"""

import math
from collections import defaultdict

from mathutils import Vector

from . import materials
from .util import aabb, boxes_object, collection, mesh_object, piece_box, point_in_polygon, rect_box, bounds

FRAME = 0.05        # frame face width, m
FRAME_DEPTH = 0.07
SETBACK = 0.06      # frame set back from the wall's outer face
PANE = 0.012
MAX_PANE = 1.4
GLAZED = {"window", "sliding-door"}
SOLID_DOORS = {"door", "double-door"}
NOT_ROOMS = {"terrace"}


def _box_along(a, u, n, s0, s1, o0, o1, z0, z1):
    """Box spanning s0..s1 along u from a, o0..o1 along n (outward), z0..z1."""
    c = [a + u * s0 + n * o0, a + u * s1 + n * o0, a + u * s1 + n * o1, a + u * s0 + n * o1]
    return [(v.x, v.y, z0) for v in c] + [(v.x, v.y, z1) for v in c]


def _room_at(pt, rooms):
    for r in rooms:
        if r["type"] not in NOT_ROOMS and point_in_polygon(pt, r["outline"]):
            return r
    return None


def _outward(op, level):
    a, b = Vector(op["from"]), Vector(op["to"])
    u = (b - a).normalized()
    n = Vector((-u.y, u.x))
    mid = (a + b) / 2
    probe = op["thickness"] / 2 + 0.35
    rooms = level["rooms"]
    if _room_at(mid + n * probe, rooms) and not _room_at(mid - n * probe, rooms):
        n = -n
    elif not _room_at(mid - n * probe, rooms) and not _room_at(mid + n * probe, rooms):
        inside = lambda p: any(point_in_polygon(p, poly["outer"]) for poly in level["slab"]["polygons"])
        if inside(mid + n * probe):
            n = -n
    room = _room_at(mid - n * probe, rooms)
    return a.to_3d(), u.to_3d(), n.to_3d(), room


def _panes(width):
    return max(1, math.ceil(width / MAX_PANE))


def build(design, root):
    col = collection("facade", root)
    lights = []

    groups = defaultdict(list)
    for f in design["facade"]:
        if f["type"] == "box":
            groups[(f["role"], f["material"])].append(rect_box(f))
    for (role, mat), boxes in groups.items():
        boxes_object(f"facade-{role}-{mat}", boxes, materials.get(mat), col, union=True, role="facade",
                     facade_role=role)
    for f in design["facade"]:
        if f["type"] != "railing":
            continue
        boxes_object(f"railing-{f['id']}", [piece_box(p) for p in f["pieces"]], materials.get(f["material"]), col,
                     union=True, role="railing")
        caps = [piece_box(dict(p, thickness=0.05, bottom=p["top"], top=p["top"] + 0.04), grow_ends=0.02)
                for p in f["pieces"]]
        shoes = [piece_box(dict(p, thickness=0.07, top=p["bottom"] + 0.08), grow_ends=0.02) for p in f["pieces"]]
        boxes_object(f"railing-metal-{f['id']}", caps + shoes, materials.get("metal-dark"), col, union=True,
                     role="railing")

    backplate_verts, backplate_faces = [], []
    lit_rooms = {}
    for li, level in enumerate(design["levels"]):
        kinds = {w["wall"]: w["kind"] for w in level["walls"]}
        frames, leaves, handles = [], [], []
        glass = defaultdict(list)
        for op in level["openings"]:
            if kinds.get(op["wall"]) != "exterior" or op["type"] == "opening":
                continue
            a, u, n, room = _outward(op, level)
            width = (Vector(op["to"]) - Vector(op["from"])).length
            z0, z1 = op["bottom"], op["top"]
            face = op["thickness"] / 2 - SETBACK
            o0, o1 = face - FRAME_DEPTH, face
            # perimeter frame
            frames.append(_box_along(a, u, n, 0, FRAME, o0, o1, z0, z1))
            frames.append(_box_along(a, u, n, width - FRAME, width, o0, o1, z0, z1))
            frames.append(_box_along(a, u, n, FRAME, width - FRAME, o0, o1, z1 - FRAME, z1))
            if op["type"] == "window":
                frames.append(_box_along(a, u, n, FRAME, width - FRAME, o0, o1, z0, z0 + FRAME))
            if op["type"] in GLAZED:
                count = _panes(width)
                step = width / count
                for i in range(1, count):
                    s = i * step
                    frames.append(_box_along(a, u, n, s - FRAME / 2, s + FRAME / 2, o0, o1, z0, z1))
                gz0 = z0 + (FRAME if op["type"] == "window" else 0.02)
                mid = (o0 + o1) / 2
                glass[op["material"] or "glass-clear"].append(
                    _box_along(a, u, n, FRAME, width - FRAME, mid - PANE / 2, mid + PANE / 2, gz0, z1 - FRAME))
                if room:
                    _backplate(backplate_verts, backplate_faces, a, u, n, width, op, room, level)
                    lit_rooms[(li, room["id"])] = (room, level)
            elif op["type"] in SOLID_DOORS:
                leaves_n = 2 if op["type"] == "double-door" else 1
                lw = (width - 2 * FRAME) / leaves_n
                for i in range(leaves_n):
                    s0 = FRAME + i * lw + (0.003 if i else 0)
                    s1 = FRAME + (i + 1) * lw - (0.003 if i + 1 < leaves_n else 0)
                    leaves.append(_box_along(a, u, n, s0, s1, o0 + 0.01, o1 - 0.01, z0 + 0.01, z1 - FRAME))
                    hs = s1 - 0.12 if i == 0 else s0 + 0.12
                    hz = z0 + (z1 - z0) * 0.42
                    handles.append(_box_along(a, u, n, hs - 0.012, hs + 0.012, o1 - 0.01, o1 + 0.05, hz, hz + 0.9))
        lid = level["id"]
        if frames:
            boxes_object(f"frames-{lid}", frames, materials.get("metal-dark"), col, union=True, role="frame", level=li)
        for mat, panes in glass.items():
            boxes_object(f"glass-{lid}-{mat}", panes, materials.get(mat), col, bevel=False, role="glass", level=li)
        if leaves:
            boxes_object(f"doors-{lid}", leaves, materials.get("wood-panel"), col, role="door", level=li)
            boxes_object(f"handles-{lid}", handles, materials.get("metal-dark"), col, role="door", level=li)

    if backplate_faces:
        obj = mesh_object("interior-backplates", backplate_verts, backplate_faces, materials.get("backplate"), col,
                          role="interior")
        uv = obj.data.uv_layers.new(name="UVMap")
        corner_uv = ((0, 0), (1, 0), (1, 1), (0, 1))
        for loop in obj.data.loops:
            uv.data[loop.index].uv = corner_uv[loop.vertex_index % 4]

    for (li, _), (room, level) in lit_rooms.items():
        x0, y0, x1, y1 = bounds(room["outline"])
        ceiling = level["walls"][0]["top"] if level["walls"] else level["elevation"] + level["height"]
        lights.append({"room": room["id"], "level": li, "x": (x0 + x1) / 2, "y": (y0 + y1) / 2,
                       "z": ceiling - 0.05, "w": (x1 - x0) * 0.6, "d": (y1 - y0) * 0.6})
    return lights


def _backplate(verts, faces, a, u, n, width, op, room, level):
    """A card facing the window, inside the room, clipped to the room's extent along the wall."""
    x0, y0, x1, y1 = bounds(room["outline"])
    inner = -(op["thickness"] / 2)
    # room depth behind the wall, along -n
    mid = a + u * (width / 2)
    depth = 0.0
    while depth < 8 and point_in_polygon(tuple(mid - n * (op["thickness"] / 2 + depth + 0.05))[:2], room["outline"]):
        depth += 0.1
    off = inner - min(1.4, max(0.4, depth * 0.6))
    # extent along the wall that stays inside the room's bounding box
    def inside(s):
        p = a + u * s + n * off
        return x0 + 0.05 <= p.x <= x1 - 0.05 and y0 + 0.05 <= p.y <= y1 - 0.05
    s0, s1 = -0.6, width + 0.6
    while s0 < 0 and not inside(s0):
        s0 += 0.05
    while s1 > width and not inside(s1):
        s1 -= 0.05
    floor = level["slab"]["top"]
    top = op["top"] + 0.3
    base = len(verts)
    for s, z in ((s0, floor), (s1, floor), (s1, top), (s0, top)):
        p = a + u * s + n * off
        verts.append((p.x, p.y, z))
    faces.append((base, base + 1, base + 2, base + 3))
    # make it face the window (outward)
    v0, v1, v2 = (Vector(verts[base + i]) for i in range(3))
    if (v1 - v0).cross(v2 - v0).dot(n) < 0:
        faces[-1] = tuple(reversed(faces[-1]))
