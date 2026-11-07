"""The construction rig: one control, scene["build"] from 0 to 6.

| build | phase |
|---|---|
| 0–1 | design: plan linework draws itself onto the empty plot |
| 1–2 | foundation: excavation, footings, column stubs, plinth, ground slab |
| 2–3 | structure: per level, columns rise (with the facade columns that carry a slab), then beams and the slab above form |
| 3–4 | walls: brick rises course by course, level by level; boundary walls; tanks |
| 4–5 | finishing: skins sweep down over the brick, facade, frames, steel spiral stairs, glass, doors, railings, gate, landscaping |
| 5–6 | complete |

Each phased object gets `phase`, `t0`, `t1` (its window inside the phase, 0–1)
and `mode`. Within a phase, order follows support: nothing starts before what
carries it has finished.

Modes: rise / skin / sweep are shader reveals (see materials.py) so shadows match
the visible part in both engines; form drops a slab or beam onto its supports;
grow scales planting up from nothing; draw extends blueprint curves; sink lowers
the excavation cover; show simply appears.
"""

import math

import bpy
from mathutils import Vector

from . import materials
from .geometry import GRADE
from .util import collection

COURSE = 0.0762  # one brick course (3")
DROP = 0.25


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def ease_out_back(t, s=1.4):
    t -= 1
    return 1 + (s + 1) * t ** 3 + s * t ** 2


def _set(obj, phase, t0, t1, mode, **extra):
    obj["phase"], obj["t0"], obj["t1"], obj["mode"] = phase, t0, t1, mode
    for k, v in extra.items():
        obj[k] = v


def _axis(obj, axis):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    vals = [c.dot(Vector(axis)) for c in corners]
    obj["ax"], obj["ay"], obj["az"] = axis
    obj["v0"], obj["v1"] = min(vals), max(vals)


def _levels_with(design, key):
    return [i for i, l in enumerate(design["levels"]) if any(l[k] for k in key)]


def assign(design):
    struct = _levels_with(design, ("columns",))
    walled = _levels_with(design, ("walls", "parapets"))
    ns, nw = max(1, len(struct)), max(1, len(walled))
    # slab of level i is carried by the columns of the structural level below it
    carried_by = {}
    for k, li in enumerate(struct):
        for lj in range(li + 1, len(design["levels"])):
            carried_by.setdefault(lj, k)
            break

    for obj in bpy.data.objects:
        role = obj.get("role")
        if role is None:
            continue
        li = obj.get("level", 0)
        if role == "excavation":
            _set(obj, 1, 0.1, 0.3, "sink")
        elif role == "footing":
            _set(obj, 1, 0.3, 0.45, "rise")
        elif role == "stub":
            _set(obj, 1, 0.42, 0.58, "rise")
        elif role == "plinth":
            _set(obj, 1, 0.55, 0.82, "rise", course=COURSE)
        elif role == "backfill":
            _set(obj, 1, 0.78, 0.86, "rise")
        elif role == "slab":
            if li == 0:
                _set(obj, 1, 0.84, 1.0, "form")
            else:
                k = carried_by.get(li, ns - 1)
                _set(obj, 2, (k + 0.72) / ns, (k + 1.0) / ns, "form")
        elif role in ("column", "stair"):
            k = struct.index(li) if li in struct else 0
            _set(obj, 2, k / ns, (k + 0.55) / ns, "rise")
        elif role == "beam":
            k = struct.index(li) if li in struct else 0
            _set(obj, 2, (k + 0.56) / ns, (k + 0.72) / ns, "form")
        elif role == "brick":
            k = walled.index(li) if li in walled else 0
            _set(obj, 3, k / nw, (k + 0.92) / nw, "rise", course=COURSE)
        elif role == "boundary-brick":
            _set(obj, 3, 0.0, 0.45, "rise", course=COURSE)
        elif role == "tank":
            _set(obj, 3, 0.9, 1.0, "rise")
        elif role == "skin":
            k = walled[::-1].index(li) if li in walled else 0
            _set(obj, 4, 0.45 * k / nw, 0.45 * (k + 1) / nw, "skin", jitter=0.25)
        elif role == "plinth-skin":
            _set(obj, 4, 0.4, 0.5, "skin", jitter=0.1)
        elif role == "boundary-skin":
            _set(obj, 4, 0.3, 0.5, "skin", jitter=0.2)
        elif role == "facade" and obj.get("facade_role") == "column":
            _set(obj, 2, 0.0, 0.55 / ns, "rise")
        elif role == "facade":
            _set(obj, 4, 0.44, 0.62, "rise")
        elif role == "spiral":
            # steel, fitted once the house stands: tread by tread from the bottom, not as a floating helix
            t0 = 0.5 + 0.14 * obj["order"]
            _set(obj, 4, t0, t0 + 0.03, "rise")
        elif role == "gate-post":
            _set(obj, 4, 0.45, 0.55, "rise")
        elif role == "frame":
            _set(obj, 4, 0.5, 0.62, "rise")
        elif role in ("glass", "interior"):
            _set(obj, 4, 0.6, 0.7, "show" if role == "interior" else "rise")
        elif role == "door":
            _set(obj, 4, 0.62, 0.7, "rise")
        elif role == "railing":
            _set(obj, 4, 0.64, 0.74, "rise")
        elif role == "gate":
            _set(obj, 4, 0.66, 0.78, "rise")
        elif role in ("porch", "paving"):
            _set(obj, 4, 0.55, 0.72, "sweep", jitter=0.3)
        elif role == "lawn":
            _set(obj, 4, 0.7, 0.82, "sweep", jitter=0.5)
        elif role == "planter":
            _set(obj, 4, 0.72, 0.8, "rise")
        elif role in ("planting", "lawn-grass"):
            _set(obj, 4, 0.78, 0.96, "grow")
        elif role == "blueprint":
            pass  # set when the curves are made
        else:
            continue
        mode = obj["mode"]
        if mode in ("rise", "skin", "sweep") and obj.type == "MESH":
            _axis(obj, {"rise": (0, 0, 1), "skin": (0, 0, -1), "sweep": (0, -1, 0)}[mode])
        obj["base_z"] = obj.location.z


def blueprint(design, root):
    """Accent linework on the plot: the plot outline, ground floor wall centrelines and the column grid."""
    col = collection("blueprint", root)
    mat = materials.get("blueprint")
    z = GRADE - 0.012
    W, D = design["plot"]["width"], design["plot"]["depth"]
    outline = design["plot"].get("outline") or [(0, 0), (W, 0), (W, D), (0, D)]
    lines = [("plot", [tuple(p) for p in outline] + [tuple(outline[0])], 0.035)]
    walls = {}
    for w in design["levels"][0]["walls"]:
        walls.setdefault(w["wall"], []).append(w)
    for wid, pieces in walls.items():
        pts = [p["from"] for p in pieces] + [p["to"] for p in pieces]
        a = Vector(pieces[0]["from"])
        u = (Vector(pieces[-1]["to"]) - a)
        if u.length < 1e-6:
            continue
        u.normalize()
        ts = [(Vector(p) - a).dot(u) for p in pts]
        lines.append((f"wall-{wid}", [tuple(a + u * min(ts)), tuple(a + u * max(ts))],
                      0.03 if pieces[0]["kind"] == "exterior" else 0.018))
    for g in design["grid"]["x"]:
        lines.append((f"grid-{g['ref']}", [(g["at"], 0), (g["at"], D)], 0.008))
    for g in design["grid"]["y"]:
        lines.append((f"grid-{g['ref']}", [(0, g["at"]), (W, g["at"])], 0.008))

    n = len(lines)
    for i, (name, pts, radius) in enumerate(lines):
        cu = bpy.data.curves.new(f"bp-{name}", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = radius
        cu.bevel_resolution = 2
        cu.use_fill_caps = True
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, (x, y) in zip(sp.points, pts):
            p.co = (x, y, z, 1)
        cu.materials.append(mat)
        obj = bpy.data.objects.new(f"bp-{name}", cu)
        col.objects.link(obj)
        obj["role"] = "blueprint"
        if name == "plot":
            t0, t1 = 0.0, 0.25
        elif name.startswith("grid"):
            t0, t1 = 0.15, 0.45
        else:
            t0 = 0.3 + 0.55 * (i / n)
            t1 = min(1.0, t0 + 0.2)
        _set(obj, 0, t0, t1, "draw")


def apply(build):
    scene = bpy.context.scene
    scene["build"] = build
    fade = 1 - max(0.0, min(1.0, (build - 1.0) / 0.12))
    bp = materials.get("blueprint").node_tree.nodes
    bp["opacity"].outputs[0].default_value = fade
    # Shader-evaluated shadows are only needed while something is part-built; they double EEVEE render time
    for mat in bpy.data.materials:
        if mat.get("reveal"):
            mat.use_transparent_shadow = build < 5.0
    for obj in bpy.data.objects:
        mode = obj.get("mode")
        if mode is None:
            continue
        span = max(obj["t1"] - obj["t0"], 1e-6)
        p = max(0.0, min(1.0, (build - obj["phase"] - obj["t0"]) / span))
        hidden = p <= 0.0
        if mode in ("rise", "skin", "sweep"):
            obj["cover"] = 1.0 - p
        elif mode == "form":
            obj.location.z = obj["base_z"] + DROP * (1 - ease_out_cubic(p))
        elif mode == "grow":
            s = obj.get("base_scale", 1.0) * max(0.0, ease_out_back(p))
            obj.scale = (s, s, s)
        elif mode == "draw":
            obj.data.bevel_factor_end = p
            hidden = hidden or fade <= 0
        elif mode == "sink":
            obj.location.z = obj["base_z"] - obj["depth"] * ease_out_cubic(p)
            hidden = p >= 1.0
        obj.hide_render = hidden
        obj.hide_viewport = hidden
        obj.update_tag()


def frame_handler(scene, *_):
    """Keeps the rig in step when scene["build"] is keyframed and rendered as an animation."""
    if "build" in scene:
        apply(float(scene["build"]))
