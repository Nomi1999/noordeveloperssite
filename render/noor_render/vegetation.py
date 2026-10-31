"""Planting at the design's positions, plus street trees and edge grass.

CC0 models (Poly Haven, glTF) are imported once into hidden library collections
and placed as collection instances. Hedges are generated clipped boxes. Restraint
is deliberate: architectural planting (hedges, planters, a few trees) reads as
designed, and nothing large stands between the camera and the facade.
"""

import math
import random

import bpy
from mathutils import Vector

from . import assets, materials
from .geometry import GRADE
from .util import aabb, boxes_object, collection, point_in_polygon, bounds

# Garden trees are slender with high canopies so the ground floor stays visible; the broad jacaranda is for the street
MODELS = {"tree": "tree_small_02", "palm": "tree_small_02", "shrub": "searsia_lucida", "grass": "grass_medium_01",
          "street": "jacaranda_tree"}
FT = 0.3048
_library = {}


def _load(asset_id, root):
    if asset_id in _library:
        return _library[asset_id]
    path = assets.require(asset_id, f"models/{asset_id}/{asset_id}.gltf")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    lib = collection(f"lib-{asset_id}", collection("library", root))
    lib.hide_render = True
    collection("library", root).hide_render = True
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        lib.objects.link(o)
        o["vegetation"] = True
    for o in new:
        for slot in o.material_slots:
            if slot.material:
                slot.material.surface_render_method = "DITHERED"
    variants = _variants(lib)
    _library[asset_id] = variants
    return variants


def _variants(lib):
    """Each top-level mesh of an import becomes one variant collection, origin at its base centre."""
    tops = [o for o in lib.objects if o.parent is None or o.parent.name not in lib.objects]
    meshes = [o for o in tops if o.type == "MESH"] or [o for o in lib.objects if o.type == "MESH"]
    variants = []
    for i, o in enumerate(sorted(meshes, key=lambda o: o.name)):
        corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
        hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
        sub = bpy.data.collections.new(f"{lib.name}-{i}")
        lib.children.link(sub)
        for c in list(o.users_collection):
            c.objects.unlink(o)
        sub.objects.link(o)
        for child in o.children_recursive:
            for c in list(child.users_collection):
                c.objects.unlink(child)
            sub.objects.link(child)
        sub.instance_offset = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)
        variants.append((sub, hi.z - lo.z, max(hi.x - lo.x, hi.y - lo.y)))
    return variants


def _place(name, variant, at, z, height, col, rng, role="planting", **props):
    sub, h, _ = variant
    e = bpy.data.objects.new(name, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = sub
    e.location = (at[0], at[1], z)
    e.rotation_euler = (0, 0, rng.uniform(0, math.tau))
    s = height / h if h > 0 else 1
    e.scale = (s, s, s)
    e["base_scale"] = s
    e["role"] = role
    e["vegetation"] = True
    for k, v in props.items():
        e[k] = v
    col.objects.link(e)
    return e


def _surface_at(pt, design):
    s = design["site"]
    for p in s["lawns"]:
        if point_in_polygon(pt, p["outline"]):
            return "lawn", p
    for group in ("porches", "paving", "driveways"):
        for p in s[group]:
            if point_in_polygon(pt, p["outline"]):
                return "paved", p
    return "ground", None


def _hedge(h, lawn, col):
    """A clipped hedge along the lawn edge nearest the planting point."""
    x0, y0, x1, y1 = bounds(lawn["outline"]) if lawn else (h["at"][0] - 1.5, h["at"][1], h["at"][0] + 1.5, h["at"][1])
    px, py = h["at"]
    depth = max(0.45, h["size"])
    height = 0.9
    edges = {"front": py - y0, "rear": y1 - py, "left": px - x0, "right": x1 - px}
    side = min(edges, key=edges.get)
    inset = 0.15
    if side in ("front", "rear"):
        y = y0 + inset if side == "front" else y1 - inset - depth
        box = aabb(x0 + inset, y, GRADE, x1 - inset, y + depth, GRADE + height)
    else:
        x = x0 + inset if side == "left" else x1 - inset - depth
        box = aabb(x, y0 + inset, GRADE, x + depth, y1 - inset, GRADE + height)
    obj = boxes_object(f"hedge-{h['id']}", [box], materials.get("hedge"), col, bevel=False, role="planting")
    bev = obj.modifiers.new("round", "BEVEL")
    bev.width, bev.segments = 0.12, 4
    sub = obj.modifiers.new("dense", "SUBSURF")
    sub.subdivision_type, sub.levels, sub.render_levels = "SIMPLE", 3, 3
    tex = bpy.data.textures.new(f"hedge-{h['id']}", "CLOUDS")
    tex.noise_scale = 0.12
    disp = obj.modifiers.new("leafy", "DISPLACE")
    disp.texture, disp.strength, disp.mid_level = tex, 0.05, 0.5
    obj.data.shade_smooth()
    obj["base_scale"] = 1.0
    return obj


def _planter(name, at, size, col):
    s = max(0.9, size * 1.3) / 2
    x, y = at
    boxes_object(f"{name}-planter", [aabb(x - s, y - s, GRADE, x + s, y + s, GRADE + 0.45)],
                 materials.get("plaster-warm-grey"), col, role="planter")
    boxes_object(f"{name}-soil", [aabb(x - s + 0.05, y - s + 0.05, GRADE + 0.38, x + s - 0.05, y + s - 0.05,
                                       GRADE + 0.42)], materials.get("planter-soil"), col, bevel=False, role="planter")
    return GRADE + 0.42


def build(design, root, context):
    col = collection("vegetation", root)
    rng = random.Random(design["slug"] + "-planting")
    for p in design["site"]["planting"]:
        kind = p["kind"]
        surface, area = _surface_at(p["at"], design)
        if kind == "hedge":
            _hedge(p, area if surface == "lawn" else None, col)
            continue
        z = GRADE
        if surface != "lawn":
            z = _planter(p["id"], p["at"], p["size"], col)
        variants = _load(MODELS[kind], root)
        size = p["size"]
        height = {"tree": size * 1.9, "palm": size * 3.6, "shrub": size * 1.1}[kind]
        _place(p["id"], variants[rng.randrange(len(variants))], p["at"], z, height, col, rng)

    for i, t in enumerate(context.get("streetTrees", [])):
        variants = _load(MODELS["street"], root)
        _place(f"street-tree-{i}", variants[i % len(variants)], t["at"], 0.15, t.get("height", 6.5), col, rng,
               role="context")

    _grass(design, col, rng, root)


def _grass(design, col, rng, root):
    """Grass clumps along lawn edges, where flat texture reads worst."""
    variants = _load(MODELS["grass"], root)
    for lawn in design["site"]["lawns"]:
        pts = lawn["outline"]
        for i in range(len(pts)):
            a, b = Vector(pts[i]), Vector(pts[(i + 1) % len(pts)])
            L = (b - a).length
            u = (b - a) / L
            n = Vector((-u.y, u.x))
            mid = (a + b) / 2
            if not point_in_polygon(tuple(mid + n * 0.1), lawn["outline"]):
                n = -n
            k = 0
            s = rng.uniform(0, 0.12)
            while s < L:
                at = a + u * s + n * rng.uniform(0.04, 0.3)
                _place(f"grass-{lawn['id']}-{i}-{k}", variants[rng.randrange(len(variants))], at, GRADE,
                       rng.uniform(0.12, 0.22), col, rng, role="lawn-grass")
                s += rng.uniform(0.25, 0.45)
                k += 1
