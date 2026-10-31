"""Mesh, collection and polygon helpers shared by the scene builders."""

import math

import bpy
import bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

BEVEL = 0.01  # shared edge bevel, meters


# ---- collections and objects ----

def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def link(obj, col):
    col.objects.link(obj)
    return obj


def mesh_object(name, verts, faces, material, col, **props):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    me.materials.append(material)
    obj = bpy.data.objects.new(name, me)
    for k, v in props.items():
        obj[k] = v
    return link(obj, col)


# ---- boxes ----

_BOX_FACES = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]


def aabb(x0, y0, z0, x1, y1, z1):
    """Eight corners of an axis-aligned box."""
    return [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]


def rect_box(b, grow=0.0):
    """Corners of an export box {x, y, w, d, bottom, top} (front-left corner), grown on every side."""
    return aabb(b["x"] - grow, b["y"] - grow, b["bottom"] - grow,
                b["x"] + b["w"] + grow, b["y"] + b["d"] + grow, b["top"] + grow)


def piece_box(p, grow=0.0, grow_ends=None, z0=None, z1=None):
    """Corners of a wall-like piece: a box of `thickness` centred on the from→to line."""
    a, b = Vector((*p["from"], 0)), Vector((*p["to"], 0))
    d = b - a
    length = d.length
    u = d / length if length > 1e-9 else Vector((1, 0, 0))
    n = Vector((-u.y, u.x, 0))
    ge = grow if grow_ends is None else grow_ends
    a, b = a - u * ge, b + u * ge
    h = p["thickness"] / 2 + grow
    lo = (p["bottom"] if z0 is None else z0) - grow
    hi = (p["top"] if z1 is None else z1) + grow
    c = [a - n * h, b - n * h, b + n * h, a + n * h]
    return [(v.x, v.y, lo) for v in c] + [(v.x, v.y, hi) for v in c]


def boxes_mesh(boxes):
    verts, faces = [], []
    for corners in boxes:
        base = len(verts)
        verts.extend(corners)
        faces.extend(tuple(base + i for i in f) for f in _BOX_FACES)
    return verts, faces


def boxes_object(name, boxes, material, col, union=False, bevel=True, **props):
    verts, faces = boxes_mesh(boxes)
    obj = mesh_object(name, verts, faces, material, col, **props)
    if union and len(boxes) > 1:
        union_islands(obj)
    if bevel:
        add_bevel(obj)
    return obj


# ---- union of overlapping pieces ----

def _union_group():
    ng = bpy.data.node_groups.get("noor-union")
    if ng:
        return ng
    ng = bpy.data.node_groups.new("noor-union", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    n = ng.nodes
    gi, go = n.new("NodeGroupInput"), n.new("NodeGroupOutput")
    island = n.new("GeometryNodeInputMeshIsland")
    split = n.new("GeometryNodeSplitToInstances")
    split.domain = "FACE"
    boolean = n.new("GeometryNodeMeshBoolean")
    boolean.operation, boolean.solver = "UNION", "MANIFOLD"
    ng.links.new(gi.outputs[0], split.inputs["Geometry"])
    ng.links.new(island.outputs["Island Index"], split.inputs["Group ID"])
    ng.links.new(split.outputs["Instances"], boolean.inputs["Mesh 2"])
    ng.links.new(boolean.outputs[0], go.inputs[0])
    return ng


def union_islands(obj):
    """Replace obj's mesh with the union of its closed islands (each box is one island)."""
    mod = obj.modifiers.new("union", "NODES")
    mod.node_group = _union_group()
    dg = bpy.context.evaluated_depsgraph_get()
    new = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    obj.modifiers.remove(mod)
    old = obj.data
    new.materials.clear()
    for m in old.materials:
        new.materials.append(m)
    obj.data = new
    bpy.data.meshes.remove(old)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts, edges=bm.edges)
    # Merged faces can be concave "keyhole" ngons; the bevel turns those into a dark hairline across a
    # flat wall (or a stray triangle beside an opening). Splitting them into convex faces avoids it,
    # unless the split would join pieces that merely touch (entry steps) into non-manifold edges.
    split = bm.copy()
    bmesh.ops.connect_verts_concave(split, faces=split.faces)
    if sum(not e.is_manifold for e in split.edges) <= sum(not e.is_manifold for e in bm.edges):
        bm.free()
        bm = split
    else:
        split.free()
    bm.to_mesh(obj.data)
    bm.free()


def add_bevel(obj, width=BEVEL):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = 2
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(30)
    mod.use_clamp_overlap = True
    mod.harden_normals = True
    obj.data.shade_smooth()
    return mod


# ---- polygons ----

def signed_area(poly):
    return 0.5 * sum(poly[i][0] * poly[i - 1][1] - poly[i - 1][0] * poly[i][1] for i in range(len(poly))) * -1


def ccw(poly):
    return list(poly) if signed_area(poly) > 0 else list(reversed(poly))


def offset_polygon(poly, dist):
    """Miter offset of a simple polygon; positive grows it."""
    pts = [Vector(p) for p in ccw(poly)]
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        e0, e1 = (p1 - p0).normalized(), (p2 - p1).normalized()
        n0, n1 = Vector((e0.y, -e0.x)), Vector((e1.y, -e1.x))
        bis = n0 + n1
        if bis.length < 1e-6:
            bis = n0
        bis.normalize()
        scale = dist / max(bis.dot(n0), 0.2)
        q = p1 + bis * scale
        out.append((q.x, q.y))
    return out


def point_in_polygon(pt, poly):
    x, y = pt
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def bounds(poly):
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def prism(outer, holes, z0, z1, top_z=None):
    """Verts and faces of a polygon with holes extruded from z0 to z1.

    top_z, if given, is a function (x, y) -> z for a sloped top (driveway ramps).
    """
    rings = [ccw(outer)] + [list(reversed(ccw(h))) for h in holes]
    flat = [p for ring in rings for p in ring]
    nv = len(flat)
    verts = [(x, y, z0) for x, y in flat]
    verts += [(x, y, top_z(x, y) if top_z else z1) for x, y in flat]
    faces = []
    for tri in tessellate_polygon([[(x, y, 0) for x, y in ring] for ring in rings]):
        a, b, c = tri
        faces.append((nv + a, nv + b, nv + c))
        faces.append((c, b, a))
    start = 0
    for ring in rings:
        m = len(ring)
        for i in range(m):
            a, b = start + i, start + (i + 1) % m
            faces.append((a, b, nv + b, nv + a))
        start += m
    return verts, faces


def prism_object(name, outer, holes, z0, z1, material, col, bevel=True, top_z=None, **props):
    verts, faces = prism(outer, holes, z0, z1, top_z)
    obj = mesh_object(name, verts, faces, material, col, **props)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts, edges=bm.edges)
    bm.to_mesh(obj.data)
    bm.free()
    if bevel:
        add_bevel(obj)
    return obj


def segment_length(p):
    return (Vector(p["to"]) - Vector(p["from"])).length
