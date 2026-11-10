"""The inside of a design: finished, unfurnished rooms built from the same export as the outside.

Everything here is derived from the design data (room outlines, wall pieces, openings, slabs) and a committed
configuration file, render/shots/<slug>-interior.json. Nothing is hand-modelled and there is no furniture path.

How a finished room is made. The exterior pipeline already gives every wall a brick core and a 12 mm plaster skin
on both faces, so the room's finished face is the wall's centreline moved in by half its thickness plus that skin.
On top of it this module lays thin overlay objects, which keeps the structure and the exterior untouched:

    paint panels   one per exported wall piece, so openings stay open and reveals are separate
    skirting       along every full-height piece
    floor          the room's outline, minus any hole in its slab (the stairwell)
    ceiling        the underside of the slab above, minus its holes; a dropped edge with a cove light for rooms that
                   have room for one; downlights
    trim           window and door reveals, sills, casings, door leaves and handles
    structure      beams and columns standing in the room, finished like the walls

Units are metres, plot coordinates, z up from the road, as the rest of the pipeline after loader.py.
"""

import json
import math
import os
from types import SimpleNamespace

import bmesh
import bpy
from mathutils import Matrix, Vector

from . import geometry, materials, style
from .util import add_bevel, boxes_mesh, collection, mesh_object, offset_polygon, point_in_polygon, prism_object

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shots")
SKIN = geometry.SKIN
EYE = 1.55  # camera height above the finished floor, m
FLOOR_T = 0.012  # floor finish thickness, m
SKIRT_H = 0.07
FRAME_SETBACK = 0.06  # how far a glazing frame sits behind the wall's outer face (facade.py)
FRAME_DEPTH = 0.07
OPEN_TYPES = {"opening"}
GLAZED = {"window", "sliding-door"}


class InteriorError(Exception):
    pass


def load_config(slug):
    path = os.path.join(SHOTS, f"{slug}-interior.json")
    if not os.path.exists(path):
        raise InteriorError(f"No interior configuration for design '{slug}': {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- small helpers
def v2(p):
    return Vector((p[0], p[1]))


def fbox(origin, u, n, s0, s1, o0, o1, z0, z1):
    """Box spanning s0..s1 along u and o0..o1 along n from a 2D origin, z0..z1."""
    pts = [origin + u * s0 + n * o0, origin + u * s1 + n * o0, origin + u * s1 + n * o1, origin + u * s0 + n * o1]
    return [(p.x, p.y, z0) for p in pts] + [(p.x, p.y, z1) for p in pts]


def solid(name, boxes, mat, col, bevel=0.0, **props):
    """Boxes as one object, with outward normals whatever the winding of the corners given."""
    verts, faces = boxes_mesh(boxes)
    obj = mesh_object(name, verts, faces, mat, col, **props)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    if bevel:
        add_bevel(obj, bevel)
    return obj


def apply_modifiers(obj):
    """Bake an object's modifiers into its mesh."""
    dg = bpy.context.evaluated_depsgraph_get()
    new = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old = obj.data
    new.materials.clear()
    for m in old.materials:
        new.materials.append(m)
    obj.modifiers.clear()
    obj.data = new
    bpy.data.meshes.remove(old)


def cut(obj, polys, z0, z1):
    """Subtract vertical prisms over `polys` (plan polygons) from an object."""
    from .util import ccw
    cutters = []
    tmp = collection("interior-cutters")
    for i, poly in enumerate(polys):
        c = prism_object(f"cutter-{i}", ccw(poly), [], z0, z1, obj.data.materials[0], tmp, bevel=False)
        cutters.append(c)
        mod = obj.modifiers.new(f"cut-{i}", "BOOLEAN")
        mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", c
    apply_modifiers(obj)
    for c in cutters:
        bpy.data.objects.remove(c)


def line_hit(p1, d1, p2, d2):
    den = d1.x * d2.y - d1.y * d2.x
    if abs(den) < 1e-9:
        return p2.copy()
    t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den
    return p1 + d1 * t


def dist_to_line(pt, p, u):
    d = pt - p
    return abs(d.x * u.y - d.y * u.x)


def inside(pt, ring):
    return point_in_polygon((pt.x, pt.y), [(p.x, p.y) for p in ring] if isinstance(ring[0], Vector) else ring)


# ---------------------------------------------------------------- materials
def _veins(nt, vec, color, vein, strength, scale=0.9, sharp=0.012):
    """Soft stone veining: thin distorted diagonal bands, tinted toward `vein`, mixed over the base colour."""
    scale, sharp = scale * 2.2, min(sharp, 0.012)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type, wave.bands_direction, wave.wave_profile = "BANDS", "DIAGONAL", "SIN"
    wave.inputs["Scale"].default_value = scale
    wave.inputs["Distortion"].default_value = 4.0
    wave.inputs["Detail"].default_value = 5.0
    wave.inputs["Detail Scale"].default_value = 2.2
    wave.inputs["Detail Roughness"].default_value = 0.7
    nt.links.new(vec, wave.inputs["Vector"])
    # distance from the band's centre line, turned into a thin line that is `strength` strong on it and zero off it
    off = nt.nodes.new("ShaderNodeMath")
    off.operation = "SUBTRACT"
    off.inputs[1].default_value = 0.5
    nt.links.new(wave.outputs["Fac"], off.inputs[0])
    dist = nt.nodes.new("ShaderNodeMath")
    dist.operation = "ABSOLUTE"
    nt.links.new(off.outputs[0], dist.inputs[0])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.0, sharp * 5
    ramp.inputs["To Min"].default_value, ramp.inputs["To Max"].default_value = strength, 0.0
    nt.links.new(dist.outputs[0], ramp.inputs["Value"])
    # a second, broad cloud so the veins fade in and out rather than running edge to edge
    cloud = nt.nodes.new("ShaderNodeTexNoise")
    cloud.inputs["Scale"].default_value = 1.1
    cloud.inputs["Detail"].default_value = 3.0
    nt.links.new(vec, cloud.inputs["Vector"])
    fade = nt.nodes.new("ShaderNodeMapRange")  # veins thin out in places but never vanish entirely
    fade.inputs["From Min"].default_value, fade.inputs["From Max"].default_value = 0.35, 0.6
    fade.inputs["To Min"].default_value, fade.inputs["To Max"].default_value = 0.25, 1.0
    nt.links.new(cloud.outputs["Fac"], fade.inputs["Value"])
    gate = nt.nodes.new("ShaderNodeMath")
    gate.operation = "MULTIPLY"
    nt.links.new(ramp.outputs["Result"], gate.inputs[0])
    nt.links.new(fade.outputs["Result"], gate.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type, mix.blend_type = "RGBA", "MIX"
    nt.links.new(gate.outputs[0], mix.inputs["Factor"])
    nt.links.new(color, mix.inputs["A"])
    mix.inputs["B"].default_value = (*vein, 1)
    return mix.outputs["Result"]


def _wash(nt, vec, color, amount):
    """Limewash: slow cloudy lightness changes with a finer mottling, so a wall is never one flat tone."""
    big = nt.nodes.new("ShaderNodeTexNoise")
    big.inputs["Scale"].default_value = 0.9
    big.inputs["Detail"].default_value = 6.0
    big.inputs["Distortion"].default_value = 0.5
    nt.links.new(vec, big.inputs["Vector"])
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 7.0
    fine.inputs["Detail"].default_value = 8.0
    nt.links.new(vec, fine.inputs["Vector"])
    both = nt.nodes.new("ShaderNodeMix")
    both.data_type = "FLOAT"
    both.inputs["Factor"].default_value = 0.35
    nt.links.new(big.outputs["Fac"], both.inputs["A"])
    nt.links.new(fine.outputs["Fac"], both.inputs["B"])
    return _scale_colour(nt, color, both.outputs["Result"], 0.35, 0.65, 1 - amount, 1 + amount * 0.5), fine


def _scale_colour(nt, color, value, lo, hi, scale_lo, scale_hi):
    """Multiply a colour by a grey that follows `value` (remapped lo..hi onto scale_lo..scale_hi)."""
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = lo, hi
    ramp.inputs["To Min"].default_value, ramp.inputs["To Max"].default_value = scale_lo, scale_hi
    nt.links.new(value, ramp.inputs["Value"])
    grey = nt.nodes.new("ShaderNodeCombineXYZ")
    for axis in "XYZ":
        nt.links.new(ramp.outputs["Result"], grey.inputs[axis])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(color, mul.inputs["A"])
    nt.links.new(grey.outputs[0], mul.inputs["B"])
    return mul.outputs["Result"]


def plain(name, color, rough=0.8, bump=0.0, spec=0.5, emission=None, coat=0.0, wash=0.0, metal=0.0):
    mat, nt, bsdf = materials._new(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    if metal:
        bsdf.inputs["Metallic"].default_value = metal
    if wash:
        coord = nt.nodes.new("ShaderNodeTexCoord")
        base = nt.nodes.new("ShaderNodeRGB")
        base.outputs[0].default_value = (*color, 1)
        out, fine = _wash(nt, coord.outputs["Object"], base.outputs[0], wash)
        nt.links.new(out, bsdf.inputs["Base Color"])
        # the fine mottling also breathes through the roughness and a whisper of bump
        rr = nt.nodes.new("ShaderNodeMapRange")
        rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = max(0.0, rough - 0.12), min(1.0, rough + 0.06)
        nt.links.new(fine.outputs["Fac"], rr.inputs["Value"])
        nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump or 0.04
        b.inputs["Distance"].default_value = 0.002
        nt.links.new(fine.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
        bump = 0.0
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = spec
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.2
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission[0], 1)
        bsdf.inputs["Emission Strength"].default_value = emission[1]
    if bump:
        coord = nt.nodes.new("ShaderNodeTexCoord")
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 260.0
        noise.inputs["Detail"].default_value = 6
        nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.002
        nt.links.new(noise.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def tile_material(name, a, b, grout, size, rough=0.14, grout_size=0.004, vein=None, vein_strength=0.5):
    """Large-format porcelain: two close tones, a hairline grout, soft reflections, optional stone veining."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.squash = 1.0
    brick.inputs["Color1"].default_value = (*a, 1)
    brick.inputs["Color2"].default_value = (*b, 1)
    brick.inputs["Mortar"].default_value = (*grout, 1)
    brick.inputs["Mortar Size"].default_value = grout_size
    brick.inputs["Mortar Smooth"].default_value = 0.1
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Brick Width"].default_value = size[0]
    brick.inputs["Row Height"].default_value = size[1]
    nt.links.new(coord.outputs["Object"], brick.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.6
    noise.inputs["Detail"].default_value = 8
    noise.inputs["Distortion"].default_value = 0.6
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type, mix.blend_type = "RGBA", "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.25
    nt.links.new(brick.outputs["Color"], mix.inputs["A"])
    nt.links.new(noise.outputs["Color"], mix.inputs["B"])
    colour = mix.outputs["Result"]
    if vein:
        colour = _veins(nt, coord.outputs["Object"], colour, vein, vein_strength)
    nt.links.new(colour, bsdf.inputs["Base Color"])
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = rough, 0.7
    nt.links.new(brick.outputs["Fac"], r.inputs["Value"])
    nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    return mat


def wood_floor_material(name, a, b, rough=0.38, plank=(2.0, 0.19)):
    """Wide engineered-oak planks: each board its own tone, long grain streaks, a satin lacquer."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset, brick.offset_frequency, brick.squash = 0.37, 2, 1.0
    brick.inputs["Color1"].default_value = (*a, 1)
    brick.inputs["Color2"].default_value = (*b, 1)
    brick.inputs["Mortar"].default_value = (a[0] * 0.35, a[1] * 0.35, a[2] * 0.35, 1)
    brick.inputs["Mortar Size"].default_value = 0.0015
    brick.inputs["Mortar Smooth"].default_value = 0.2
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Brick Width"].default_value, brick.inputs["Row Height"].default_value = plank
    nt.links.new(coord.outputs["Object"], brick.inputs["Vector"])
    stretch = nt.nodes.new("ShaderNodeMapping")
    stretch.inputs["Scale"].default_value = (1.2, 55.0, 55.0)  # grain runs along the board (x)
    nt.links.new(coord.outputs["Object"], stretch.inputs["Vector"])
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 1.0
    grain.inputs["Detail"].default_value = 7.0
    grain.inputs["Distortion"].default_value = 0.4
    nt.links.new(stretch.outputs[0], grain.inputs["Vector"])
    shaded = _scale_colour(nt, brick.outputs["Color"], grain.outputs["Fac"], 0.3, 0.7, 0.78, 1.08)
    nt.links.new(shaded, bsdf.inputs["Base Color"])
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = rough, 0.75
    nt.links.new(brick.outputs["Fac"], r.inputs["Value"])
    nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value, b.inputs["Distance"].default_value = 0.12, 0.001
    nt.links.new(grain.outputs["Fac"], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Coat Weight"].default_value = 0.2
    bsdf.inputs["Coat Roughness"].default_value = 0.25
    return mat


def marble_material(name, base, vein, rough=0.1, strength=0.85):
    """Polished ivory stone with bold grey-gold veins, for counters and splashbacks."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    start = nt.nodes.new("ShaderNodeRGB")
    start.outputs[0].default_value = (*base, 1)
    colour = _veins(nt, mapping.outputs[0], start.outputs[0], vein, strength, scale=1.6, sharp=0.05)
    nt.links.new(colour, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = 0.7
    bsdf.inputs["Coat Weight"].default_value = 0.3
    bsdf.inputs["Coat Roughness"].default_value = 0.08
    return mat


def fabric_material(name, color, rough=0.9, weave=90.0):
    """A woven linen wallcovering: fine crossing threads, a soft sheen and tiny slubs, with a gentle bump."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    warp = nt.nodes.new("ShaderNodeMapping")
    warp.inputs["Scale"].default_value = (weave, weave, 2.0)  # threads running up the wall
    nt.links.new(coord.outputs["Object"], warp.inputs["Vector"])
    weft = nt.nodes.new("ShaderNodeMapping")
    weft.inputs["Scale"].default_value = (2.0, 2.0, weave)  # and across it
    nt.links.new(coord.outputs["Object"], weft.inputs["Vector"])
    a = nt.nodes.new("ShaderNodeTexNoise")
    a.inputs["Scale"].default_value, a.inputs["Detail"].default_value = 1.0, 3.0
    nt.links.new(warp.outputs[0], a.inputs["Vector"])
    b = nt.nodes.new("ShaderNodeTexNoise")
    b.inputs["Scale"].default_value, b.inputs["Detail"].default_value = 1.0, 3.0
    nt.links.new(weft.outputs[0], b.inputs["Vector"])
    both = nt.nodes.new("ShaderNodeMath")
    both.operation = "ADD"
    nt.links.new(a.outputs["Fac"], both.inputs[0])
    nt.links.new(b.outputs["Fac"], both.inputs[1])
    base = nt.nodes.new("ShaderNodeRGB")
    base.outputs[0].default_value = (*color, 1)
    shaded = _scale_colour(nt, base.outputs[0], both.outputs[0], 0.6, 1.4, 0.8, 1.15)
    nt.links.new(shaded, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Sheen Weight"].default_value = 0.35
    bsdf.inputs["Sheen Roughness"].default_value = 0.4
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value, bump.inputs["Distance"].default_value = 0.35, 0.002
    nt.links.new(both.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def wall_tile_material(name, a, b, grout, size, rough=0.2, vein=None, vein_strength=0.45):
    """Wall tile: the brick pattern runs along whichever horizontal axis the wall faces, and up in z."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs[0])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    absx = nt.nodes.new("ShaderNodeMath")
    absx.operation = "ABSOLUTE"
    nt.links.new(nsep.outputs["X"], absx.inputs[0])
    facing_x = nt.nodes.new("ShaderNodeMath")
    facing_x.operation = "GREATER_THAN"
    facing_x.inputs[1].default_value = 0.5
    nt.links.new(absx.outputs[0], facing_x.inputs[0])
    on_x = nt.nodes.new("ShaderNodeCombineXYZ")  # a wall facing along x runs along y
    nt.links.new(sep.outputs["Y"], on_x.inputs["X"])
    nt.links.new(sep.outputs["Z"], on_x.inputs["Y"])
    on_y = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], on_y.inputs["X"])
    nt.links.new(sep.outputs["Z"], on_y.inputs["Y"])
    vec = nt.nodes.new("ShaderNodeMix")
    vec.data_type = "VECTOR"
    nt.links.new(facing_x.outputs[0], vec.inputs["Factor"])
    nt.links.new(on_y.outputs[0], vec.inputs["A"])
    nt.links.new(on_x.outputs[0], vec.inputs["B"])
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.squash = 1.0
    brick.inputs["Color1"].default_value = (*a, 1)
    brick.inputs["Color2"].default_value = (*b, 1)
    brick.inputs["Mortar"].default_value = (*grout, 1)
    brick.inputs["Mortar Size"].default_value = 0.003
    brick.inputs["Mortar Smooth"].default_value = 0.1
    brick.inputs["Brick Width"].default_value = size[0]
    brick.inputs["Row Height"].default_value = size[1]
    nt.links.new(vec.outputs["Result"], brick.inputs["Vector"])
    colour = brick.outputs["Color"]
    if vein:
        colour = _veins(nt, coord.outputs["Object"], colour, vein, vein_strength, scale=1.2)
    nt.links.new(colour, bsdf.inputs["Base Color"])
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = rough, 0.7
    nt.links.new(brick.outputs["Fac"], r.inputs["Value"])
    nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    return mat


def veneer_material(name, a, b, rough=0.42, coat=0.12):
    """Flush timber veneer for doors, panelling and joinery: a long vertical grain, a slow drift between two tones and
    a satin finish."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    stretch = nt.nodes.new("ShaderNodeMapping")
    stretch.inputs["Scale"].default_value = (60.0, 60.0, 1.4)  # grain runs up the panel (z)
    nt.links.new(coord.outputs["Object"], stretch.inputs["Vector"])
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 1.0
    grain.inputs["Detail"].default_value = 7.0
    grain.inputs["Distortion"].default_value = 0.5
    nt.links.new(stretch.outputs[0], grain.inputs["Vector"])
    drift = nt.nodes.new("ShaderNodeTexNoise")
    drift.inputs["Scale"].default_value = 0.7
    drift.inputs["Detail"].default_value = 2.0
    nt.links.new(coord.outputs["Object"], drift.inputs["Vector"])
    tone = nt.nodes.new("ShaderNodeMix")
    tone.data_type = "RGBA"
    nt.links.new(drift.outputs["Fac"], tone.inputs["Factor"])
    tone.inputs["A"].default_value = (*a, 1)
    tone.inputs["B"].default_value = (*b, 1)
    shaded = _scale_colour(nt, tone.outputs["Result"], grain.outputs["Fac"], 0.3, 0.7, 0.8, 1.08)
    nt.links.new(shaded, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = 0.45
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = 0.3
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value, bump.inputs["Distance"].default_value = 0.08, 0.001
    nt.links.new(grain.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def travertine_material(name, a, b, pore, rough=0.42):
    """Vein-cut travertine: soft horizontal strata in two warm tones, and small dark pores stretched along them."""
    mat, nt, bsdf = materials._new(name)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    # irregular strata: noise stretched hard along the bed, so bands vary in width and fade in and out (a wave
    # texture repeats at one pitch and reads as fluting); a broader, softer layer drifts the tone between cuts
    def streaks(stretch, scale, detail):
        m = nt.nodes.new("ShaderNodeMapping")
        m.inputs["Scale"].default_value = stretch
        nt.links.new(coord.outputs["Object"], m.inputs["Vector"])
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = 0.62
        nt.links.new(m.outputs[0], n.inputs["Vector"])
        return n
    strata = streaks((0.06, 0.06, 7.0), 3.0, 10.0)
    fine = streaks((0.2, 0.2, 2.0), 1.4, 4.0)
    both = nt.nodes.new("ShaderNodeMix")
    both.data_type = "FLOAT"
    both.inputs["Factor"].default_value = 0.35
    nt.links.new(strata.outputs["Fac"], both.inputs["A"])
    nt.links.new(fine.outputs["Fac"], both.inputs["B"])
    # noise sits around 0.5: stretch it so both tones actually show
    contrast = nt.nodes.new("ShaderNodeMapRange")
    contrast.inputs["From Min"].default_value, contrast.inputs["From Max"].default_value = 0.36, 0.64
    nt.links.new(both.outputs["Result"], contrast.inputs["Value"])
    tone = nt.nodes.new("ShaderNodeMix")
    tone.data_type = "RGBA"
    nt.links.new(contrast.outputs["Result"], tone.inputs["Factor"])
    tone.inputs["A"].default_value = (*a, 1)
    tone.inputs["B"].default_value = (*b, 1)
    # pores: small cells, flattened so they run with the strata
    squash = nt.nodes.new("ShaderNodeMapping")
    squash.inputs["Scale"].default_value = (1.0, 1.0, 4.0)
    nt.links.new(coord.outputs["Object"], squash.inputs["Vector"])
    cells = nt.nodes.new("ShaderNodeTexVoronoi")
    cells.inputs["Scale"].default_value = 26.0
    nt.links.new(squash.outputs[0], cells.inputs["Vector"])
    holes = nt.nodes.new("ShaderNodeMapRange")
    holes.inputs["From Min"].default_value, holes.inputs["From Max"].default_value = 0.0, 0.07
    holes.inputs["To Min"].default_value, holes.inputs["To Max"].default_value = 0.7, 0.0
    nt.links.new(cells.outputs["Distance"], holes.inputs["Value"])
    dark = nt.nodes.new("ShaderNodeMix")
    dark.data_type = "RGBA"
    nt.links.new(holes.outputs["Result"], dark.inputs["Factor"])
    nt.links.new(tone.outputs["Result"], dark.inputs["A"])
    dark.inputs["B"].default_value = (*pore, 1)
    nt.links.new(dark.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value, bump.inputs["Distance"].default_value = 0.25, 0.002
    bump.invert = True
    nt.links.new(holes.outputs["Result"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


class Palette:
    """The materials a finished room uses, made once per run from the config's palette."""

    def __init__(self, cfg):
        p = cfg["palette"]
        self.cfg = p
        self.wall_tiles_cfg = cfg.get("wallTiles", {})
        self.wall = plain("paint-wall", p["wall"], 0.88, bump=0.05, spec=0.3, wash=p.get("wash", 0.07))
        self.ceiling = plain("paint-ceiling", p["ceiling"], 0.95, bump=0.02, spec=0.2, wash=0.02)
        self.trim = plain("paint-trim", p["trim"], 0.4, spec=0.5)
        # a slim dark skirting reads as a shadow line at the foot of the wall
        self.skirt = plain("skirting", p.get("skirting", [0.1, 0.09, 0.08]), 0.45, spec=0.4)
        self._named = {}
        metal = p.get("metal")  # one metal for every handle, rail, tap and trim; brass unless the palette names another
        if metal:
            self.brass = plain("metal-finish", metal["color"], metal.get("rough", 0.35), spec=0.6, metal=1.0)
        else:
            self.brass = plain("brass", p.get("brass", [0.86, 0.62, 0.3]), 0.26, spec=0.8, metal=1.0)
        self.led = plain("ceiling-led", (1, 0.7, 0.4), 0.5, emission=(tuple(p["cove"]), p.get("coveGlow", 10.0)))
        self.downlight = plain("downlight", (1, 0.9, 0.8), 0.4, emission=(tuple(p["downlight"]), p.get("downlightGlow", 40.0)))
        self.dark = plain("backer-dark", (0.06, 0.055, 0.05), 0.7)
        self.metal = self.brass  # door levers
        self.door = self.named(p.get("door", "walnut"))
        self.stone = materials.get("travertine")
        self.slat = self.named(p.get("slat", "walnut"))
        self.base = plain("cabinet-base", p.get("base", [0.055, 0.05, 0.046]), 0.42, spec=0.5)  # matte charcoal-bronze
        self.upper = self.named(p.get("upper", "walnut"))
        self.vanity = self.named(p.get("vanity", "walnut"))
        self.wardrobe = self.named(p.get("wardrobe", "oak-fluted"))
        m = p.get("marble", {})
        self.counter = marble_material("counter-marble", m.get("base", [0.84, 0.81, 0.76]), m.get("vein", [0.42, 0.37, 0.31]))
        self.ceramic = plain("ceramic", [0.9, 0.9, 0.88], 0.12, spec=0.6, coat=0.4)
        self.steel = self.brass  # taps and rails
        self.basin = plain("basin-steel", [0.7, 0.68, 0.64], 0.22, spec=0.8, metal=1.0)  # brushed steel sink bowl
        self.fabric = fabric_material("wallcovering", p.get("fabric", [0.5, 0.43, 0.36]))
        self.feature_stone = marble_material("feature-stone", p.get("featureStone", [0.64, 0.59, 0.52]), [0.33, 0.28, 0.23],
                                             rough=0.2, strength=0.6)
        self.mirror = plain("mirror", [0.8, 0.8, 0.8], 0.02, spec=1.0, metal=1.0)
        self.glass = materials.get("glass-clear")
        t = p.get("stairTread")
        if t:
            self.stair_tread = tile_material("stair-tread", t["a"], t["b"], t["grout"], t["size"], t.get("rough", 0.2),
                                             vein=t.get("vein"), vein_strength=t.get("veinStrength", 0.4))
        else:
            self.stair_tread = tile_material("stair-tread", [0.56, 0.5, 0.43], [0.6, 0.54, 0.47], [0.25, 0.22, 0.19], [1.2, 0.3], 0.2,
                                             vein=[0.4, 0.35, 0.29], vein_strength=0.4)
        self._floors = {}
        self._wall_tiles = {}

    def named(self, key):
        """A material by name: a veneer or stone defined in the palette (`woods`, `stones`), else a texture tag."""
        if key not in self._named:
            wood = self.cfg.get("woods", {}).get(key)
            stone = self.cfg.get("stones", {}).get(key)
            if wood:
                self._named[key] = veneer_material(f"veneer-{key}", wood["a"], wood["b"], wood.get("rough", 0.42), wood.get("coat", 0.12))
            elif stone and stone.get("kind") == "travertine":
                self._named[key] = travertine_material(f"stone-{key}", stone["a"], stone["b"], stone["pore"], stone.get("rough", 0.42))
            elif stone:
                self._named[key] = marble_material(f"stone-{key}", stone["base"], stone["vein"], stone.get("rough", 0.2),
                                                   stone.get("strength", 0.6))
            else:
                self._named[key] = materials.get(key)
        return self._named[key]

    def wall_tile(self, key):
        if key not in self._wall_tiles:
            f = self.wall_tiles_cfg[key]
            self._wall_tiles[key] = wall_tile_material(f"walltile-{key}", f["a"], f["b"], f["grout"], f["size"], f.get("rough", 0.2),
                                                       vein=f.get("vein"), vein_strength=f.get("veinStrength", 0.45))
        return self._wall_tiles[key]

    def floor(self, key):
        if key not in self._floors:
            f = self.cfg["floors"][key]
            if f.get("kind") == "wood":
                self._floors[key] = wood_floor_material(f"floor-{key}", f["a"], f["b"], f.get("rough", 0.38), tuple(f.get("size", (2.0, 0.19))))
            else:
                self._floors[key] = tile_material(f"floor-{key}", f["a"], f["b"], f["grout"], f["size"], f.get("rough", 0.14),
                                                  vein=f.get("vein"), vein_strength=f.get("veinStrength", 0.5))
        return self._floors[key]


# ---------------------------------------------------------------- rooms
class Edge:
    """One side of a room's outline: the wall pieces along it and the finished face a person sees."""

    def __init__(self, p, q, walls):
        self.p, self.q = p, q
        self.u = (q - p).normalized()
        self.n = Vector((-self.u.y, self.u.x))  # into the room (outlines are counter-clockwise)
        self.pieces = []
        for w in walls:
            a, b = v2(w["from"]), v2(w["to"])
            if dist_to_line(a, p, self.u) < 0.03 and dist_to_line(b, p, self.u) < 0.03:
                s0, s1 = sorted(((a - p).dot(self.u), (b - p).dot(self.u)))
                if min(s1, (q - p).length) - max(s0, 0) > 0.05:
                    self.pieces.append(w)
        self.open = not self.pieces  # no wall on this side: the room runs on into the next
        self.thickness = max((w["thickness"] for w in self.pieces), default=0.0)
        # the point on the finished face nearest the edge's start, and the offset of that face from the centreline
        self.face = (self.thickness / 2 + SKIN) if self.pieces else 0.0
        self.start = p + self.n * self.face
        self.length = (q - p).length
        self.A = self.start
        self.B = q + self.n * self.face


class Room:
    def __init__(self, design, li, room, cfg):
        from .util import ccw
        self.design, self.li, self.data, self.id = design, li, room, room["id"]
        self.level = design["levels"][li]
        self.type = room["type"]
        if self.type not in cfg["roomTypes"]:
            print(f"interior: room {room['id']} ({self.type}) has no roomTypes entry and falls back to default")
        spec = dict(cfg["roomTypes"].get(self.type, cfg["roomTypes"]["default"]))
        spec.update(cfg.get("rooms", {}).get(self.id, {}))
        spec.update(cfg.get("rooms", {}).get(f"{self.level['id']}/{self.id}", {}))  # ids can repeat across levels
        self.spec = spec
        self.exterior = spec.get("finish") == "exterior"
        self.floor_z = self.level["slab"]["top"]
        above = design["levels"][li + 1] if li + 1 < len(design["levels"]) else None
        self.above = above
        self.ceil_z = above["slab"]["bottom"] if above else self.level["elevation"] + self.level["height"]
        # The structure hangs beams under the slab. A flush false ceiling at their soffit hides them, so every room
        # has one flat ceiling and no beam crosses it.
        self.flush = False
        beams = geometry.beams(self.level, above) if above else []
        if beams and not cfg.get("exposeBeams"):
            self.ceil_z = min(self.ceil_z, min(b["bottom"] for b in beams) - SKIN - 0.006)
            self.flush = True
        # a room tucked under a stair landing has its ceiling where its walls stop, below the flight
        self.low = bool(spec.get("ceilingHeight"))
        if self.low:
            self.ceil_z = self.floor_z + spec["ceilingHeight"]
            self.flush = True
        pts = [v2(p) for p in ccw(room["outline"])]
        self.edges = [Edge(pts[i], pts[(i + 1) % len(pts)], self.level["walls"]) for i in range(len(pts))]
        for i, e in enumerate(self.edges):
            prev = self.edges[i - 1]
            e.A = line_hit(prev.start, prev.u, e.start, e.u)
        for i, e in enumerate(self.edges):
            e.B = self.edges[(i + 1) % len(self.edges)].A
            e.length = (e.B - e.A).length
        self.inner = [e.A for e in self.edges]  # the finished room, counter-clockwise
        xs, ys = [p.x for p in self.inner], [p.y for p in self.inner]
        self.bounds = (min(xs), max(xs), min(ys), max(ys))
        self.area = abs(sum(self.inner[i].x * self.inner[i - 1].y - self.inner[i - 1].x * self.inner[i].y for i in range(len(self.inner)))) / 2

    def contains(self, pt):
        return inside(pt, self.inner)

    def overlaps(self, hole):
        """Whether a hole in a slab (plan polygon) lies in this room, even when it runs up to the room's wall."""
        h = [Vector(p) for p in hole]
        centre = Vector((sum(p.x for p in h) / len(h), sum(p.y for p in h) / len(h)))
        return inside(centre, self.inner) or any(inside(p, self.inner) for p in h) or any(inside(c, h) for c in self.inner)

    def ceiling_holes(self):
        """Holes in the slab above that fall in this room: the stairwell and the sky court"""
        if not self.above or self.low:
            return []
        return [hole for poly in self.above["slab"]["polygons"] for hole in poly["holes"] if self.overlaps(hole)]

    def floor_holes(self):
        return [hole for poly in self.level["slab"]["polygons"] for hole in poly["holes"] if self.overlaps(hole)]


class Interior:
    def __init__(self, design, root, cfg):
        self.design, self.cfg = design, cfg
        self.root = collection("interior", root)
        self.palette = Palette(cfg)
        self.rooms = {}
        self.lights = []
        self._leaves, self._pulls, self._sills = set(), set(), set()
        self.featured = {}  # room id -> the wall edge carrying its feature wall
        for li, level in enumerate(design["levels"]):
            for room in level["rooms"]:
                if li < len(cfg["levels"]) and level["id"] in cfg["levels"]:
                    self.rooms[(level["id"], room["id"])] = Room(design, li, room, cfg)
        for room in self.rooms.values():
            self.build_room(room)
        for li, level in enumerate(design["levels"]):
            if level["id"] in cfg["levels"]:
                self.stairs(li, level)
        if cfg.get("voids"):
            for li, level in enumerate(design["levels"]):
                if level["id"] in cfg["levels"] and li + 1 < len(design["levels"]):
                    self.voids(li, level)

    def opt(self, room, key):
        """A style choice: the room type's (or the room's) own, else the design's `style` block, else the default in
        style.py. Every default is what the 5 Marla was built with, so a config that names none is unchanged."""
        return style.choice(self.cfg, room.spec, key)

    # ---- one room
    def build_room(self, room):
        col = collection(f"interior-{room.level['id']}-{room.id}", self.root)
        pal = self.palette
        spec = room.spec
        self.floor(room, col)
        if room.exterior:
            return
        self.walls(room, col)
        self.trim(room, col)
        self.structure(room, col)
        if spec.get("ceiling", "flat") != "none":
            self.ceiling(room, col)
        if spec.get("featureWall"):
            self.feature_wall(room, col)
        if spec.get("panelling"):
            self.panelling(room, col)
        self.fixtures(room, col)

    def floor(self, room, col):
        spec = room.spec
        if room.exterior:
            mat = materials.get(room.data.get("floor", "paving-stone"))
        else:
            mat = self.palette.floor(spec.get("floor", "light"))
        obj = prism_object(f"floor-{room.id}", [(p.x, p.y) for p in room.inner], [], room.floor_z - 0.002,
                           room.floor_z + FLOOR_T, mat, col, bevel=False, role="interior")
        holes = room.floor_holes()
        if holes:
            cut(obj, holes, room.floor_z - 0.1, room.floor_z + 0.1)

    def _unique_runs(self, e, z_lo, z_hi):
        """Each wall piece along edge e as (s0, s1, z0, z1, piece), clipped to z_lo..z_hi. With `mergeWallPieces` set,
        minus the stretches an earlier piece already covers at the same height: two exported walls can overlap where
        they meet (a thin and a thick wall, or a wall running past a column), and two coincident panels there render
        black in Cycles, each one's shadow rays hitting the other. Off by default, which keeps the 5 Marla as built."""
        merge = self.cfg.get("mergeWallPieces", False)
        done, out = [], []
        for w in e.pieces:
            a, b = v2(w["from"]), v2(w["to"])
            s0, s1 = sorted(((a - e.A).dot(e.u), (b - e.A).dot(e.u)))
            s0, s1 = max(s0, 0.0), min(s1, e.length)
            z0, z1 = max(w["bottom"], z_lo), min(w["top"], z_hi)
            if s1 - s0 < 0.01 or z1 - z0 < 0.01:
                continue
            runs = [(s0, s1)]
            for d0, d1, dz0, dz1 in (done if merge else []):
                if min(z1, dz1) - max(z0, dz0) < 0.01:
                    continue
                runs = [r for r0, r1 in runs for r in ((r0, min(r1, d0)), (max(r0, d1), r1)) if r[1] - r[0] >= 0.01]
            done.append((s0, s1, z0, z1))
            out += [(r0, r1, z0, z1, w) for r0, r1 in runs]
        return out

    def walls(self, room, col):
        panels, skirts = [], []
        shadow_gap = self.opt(room, "skirting") == "shadow-gap"
        for e in room.edges:
            for s0, s1, z0, z1, w in self._unique_runs(e, room.floor_z, room.ceil_z):
                panels.append(fbox(e.A, e.u, e.n, s0, s1, -0.003, 0.004, z0, z1))
                if w["bottom"] <= room.floor_z + 0.01:
                    if shadow_gap:  # a flush dark reveal at the foot of the wall instead of a board
                        skirts.append(fbox(e.A, e.u, e.n, s0, s1, -0.003, 0.0045, room.floor_z + FLOOR_T, room.floor_z + FLOOR_T + 0.014))
                    else:
                        skirts.append(fbox(e.A, e.u, e.n, s0, s1, 0.0, 0.016, room.floor_z + FLOOR_T, room.floor_z + SKIRT_H + FLOOR_T))
        pal = self.palette
        tile_h = room.spec.get("wallTile")
        if tile_h == "full":  # slabs floor to ceiling
            tile_h = room.ceil_z - room.floor_z
        if tile_h:
            tiles = []
            for e in room.edges:
                for s0, s1, z0, z1, _ in self._unique_runs(e, room.floor_z, room.floor_z + tile_h):
                    if s1 - s0 > 0.01 and z1 - z0 > 0.01:
                        tiles.append(fbox(e.A, e.u, e.n, s0, s1, 0.004, 0.011, z0, z1))
            if tiles:
                solid(f"walltile-{room.id}", tiles, pal.wall_tile(room.spec.get("wallTileKey", "bath")), col, role="interior")
        if panels:
            solid(f"paint-{room.id}", panels, pal.wall, col, role="interior")
        if skirts:
            solid(f"skirting-{room.id}", skirts, pal.dark if shadow_gap else pal.skirt, col, bevel=0.0 if shadow_gap else 0.002,
                  role="interior")

    # ---- windows and doors
    def trim(self, room, col):
        pal = self.palette
        level = room.level
        kinds = {w["wall"]: w["kind"] for w in level["walls"]}
        reveals, stools, casings, leaves, handles, thresholds, overs = [], [], [], [], [], [], []
        flush = self.opt(room, "doors") == "flush"
        for op in level["openings"]:
            a, b = v2(op["from"]), v2(op["to"])
            mid = (a + b) / 2
            e = next((e for e in room.edges if not e.open and dist_to_line(mid, e.p, e.u) < 0.03
                      and 0 < (mid - e.A).dot(e.u) < e.length), None)
            if e is None:
                continue
            u = (b - a).normalized()
            n = e.n
            W = (b - a).length
            t = op["thickness"]
            face = t / 2 + SKIN
            z0, z1 = op["bottom"], op["top"]
            exterior_wall = kinds.get(op["wall"]) == "exterior"
            # where the reveal stops: at the glazing frame on an outside wall, at the door leaf on an inside one
            if exterior_wall and op["type"] != "opening":
                o_f = -(t / 2 - FRAME_SETBACK - FRAME_DEPTH)
            elif op["type"] == "opening":
                o_f = 0.0
            else:
                o_f = 0.02
            reveals.append(fbox(a, u, n, SKIN - 0.002, SKIN + 0.003, o_f, face, z0, z1))
            reveals.append(fbox(a, u, n, W - SKIN - 0.003, W - SKIN + 0.002, o_f, face, z0, z1))
            reveals.append(fbox(a, u, n, SKIN, W - SKIN, o_f, face, z1 - SKIN - 0.003, z1 - SKIN + 0.002))
            if op["type"] == "window":
                stools.append(fbox(a, u, n, -0.01, W + 0.01, o_f, face + 0.04, z0 + SKIN - 0.002, z0 + SKIN + 0.03))
            elif flush:
                # no casing: the plaster returns into the reveal. An inside door gets a panel in its leaf's timber from the
                # head to the ceiling, flush with the wall, so it reads as one full-height door.
                if op["type"] in ("door", "double-door") and not exterior_wall and room.ceil_z - z1 > 0.05:
                    overs.append(fbox(a, u, n, SKIN, W - SKIN, face - 0.002, face + 0.006, z1 - SKIN + 0.004, room.ceil_z - 0.004))
            else:
                cw = 0.075
                casings.append(fbox(a, u, n, -cw, SKIN, face, face + 0.014, z0, z1 - SKIN))
                casings.append(fbox(a, u, n, W - SKIN, W + cw, face, face + 0.014, z0, z1 - SKIN))
                casings.append(fbox(a, u, n, -cw, W + cw, face, face + 0.014, z1 - SKIN, z1 + cw - SKIN))
            if op["type"] in ("door", "double-door") and not exterior_wall and op["id"] not in self._leaves:
                self._leaves.add(op["id"])
                count = 2 if op["type"] == "double-door" else 1
                lw = (W - 2 * SKIN - 0.008) / count
                for i in range(count):
                    s0 = SKIN + 0.004 + i * lw
                    leaves.append(fbox(a, u, n, s0, s0 + lw - (0.003 if count > 1 else 0), -0.02, 0.02, z0 + 0.012, z1 - SKIN - 0.004))
                latch = W - SKIN - 0.08 if op.get("hinge") == "start" else SKIN + 0.08
                reach = (-0.15, 0.0) if op.get("hinge") == "start" else (0.0, 0.15)
                for side in (1, -1):  # a lever on both faces, so the door reads as a door from either room
                    def o(d, side=side):
                        return sorted((side * d[0], side * d[1]))
                    plate, post, arm = o((0.02, 0.028)), o((0.028, 0.062)), o((0.052, 0.07))
                    handles.append(fbox(a, u, n, latch - 0.026, latch + 0.026, plate[0], plate[1], z0 + 0.9, z0 + 1.08))
                    handles.append(fbox(a, u, n, latch - 0.011, latch + 0.011, post[0], post[1], z0 + 0.975, z0 + 1.0))
                    handles.append(fbox(a, u, n, latch - 0.011 + reach[0], latch + 0.011 + reach[1], arm[0], arm[1],
                                        z0 + 0.972, z0 + 1.003))
            if op["type"] in ("door", "double-door") and exterior_wall and op["id"] not in self._pulls:
                # the facade fits the outside handle; inside gets a long brass pull on standoffs
                self._pulls.add(op["id"])
                latch = W - SKIN - 0.12 if op.get("hinge") == "start" else SKIN + 0.12
                handles.append(fbox(a, u, n, latch - 0.013, latch + 0.013, o_f + 0.045, o_f + 0.07, z0 + 0.65, z0 + 1.45))
                for zz in (z0 + 0.72, z0 + 1.38):
                    handles.append(fbox(a, u, n, latch - 0.008, latch + 0.008, o_f, o_f + 0.045, zz, zz + 0.016))
            if op["type"] in ("door", "double-door", "opening") and not exterior_wall and op["id"] not in self._sills:
                # a brass bar where the stone floor meets the oak, across the thickness of the wall
                self._sills.add(op["id"])
                thresholds.append(fbox(a, u, n, SKIN, W - SKIN, -t / 2, t / 2, z0 - 0.001, z0 + FLOOR_T + 0.002))
        if reveals:
            solid(f"reveals-{room.id}", reveals, pal.wall, col, role="interior")
        if stools:
            solid(f"stools-{room.id}", stools, pal.stone, col, bevel=0.004, role="interior")
        if casings:
            solid(f"casings-{room.id}", casings, pal.wall, col, bevel=0.002, role="interior")  # flush, painted the wall's colour
        # a room may name its own door finish: a timber or stone from the palette, or "wall" for doors painted to vanish
        door = pal.door if "door" not in room.spec else pal.wall if room.spec["door"] == "wall" else pal.named(room.spec["door"])
        if leaves:
            solid(f"leaves-{room.id}", leaves, door, col, bevel=0.004, role="interior")
        if overs:
            solid(f"overpanels-{room.id}", overs, door, col, bevel=0.002, role="interior")
        if handles:
            solid(f"handles-{room.id}", handles, pal.metal, col, bevel=0.002, role="interior")
        if thresholds:
            solid(f"thresholds-{room.id}", thresholds, pal.brass, col, bevel=0.001, role="interior")

    # ---- beams and columns standing in the room
    def structure(self, room, col):
        level, above = room.level, room.above
        x0, x1, y0, y1 = room.bounds
        wrap = []
        for beam in ([] if room.flush else geometry.beams(level, above)):
            a, b = v2(beam["from"]), v2(beam["to"])
            mid = (a + b) / 2
            if not room.contains(mid):
                continue
            along = (b - a).normalized()
            lo, hi = sorted((a.dot(along), b.dot(along)))
            # clip to the room along the beam, then run a little into the walls at both ends
            ends = [a + along * (t - a.dot(along)) for t in (lo, hi)]
            step = 0.02
            tmin, tmax = lo, hi
            while tmin < hi and not room.contains(a + along * (tmin - a.dot(along))):
                tmin += step
            while tmax > lo and not room.contains(a + along * (tmax - a.dot(along))):
                tmax -= step
            if tmax - tmin < 0.1:
                continue
            p0, p1 = a + along * (tmin - a.dot(along) - 0.08), a + along * (tmax - a.dot(along) + 0.08)
            bm = dict(beam, **{"from": (p0.x, p0.y), "to": (p1.x, p1.y)})
            wrap.append(geometry_piece_box(bm, SKIN + 0.004))
        if wrap:
            solid(f"beams-{room.id}", wrap, self.palette.wall, col, role="interior")
        cols = []
        for c in level["columns"]:
            cx0, cx1, cy0, cy1 = c["x"], c["x"] + c["w"], c["y"], c["y"] + c["d"]
            g = SKIN + 0.004
            cx0, cx1, cy0, cy1 = cx0 - g, cx1 + g, cy0 - g, cy1 + g
            # the part of the column inside the finished room
            ix0, ix1, iy0, iy1 = max(cx0, x0), min(cx1, x1), max(cy0, y0), min(cy1, y1)
            if ix1 - ix0 < 0.01 or iy1 - iy0 < 0.01:
                continue
            centre = Vector(((ix0 + ix1) / 2, (iy0 + iy1) / 2))
            if not room.contains(centre) and not any(room.contains(centre + d) for d in (Vector((0.05, 0)), Vector((-0.05, 0)), Vector((0, 0.05)), Vector((0, -0.05)))):
                continue
            cols.append([(ix0, iy0, room.floor_z), (ix1, iy0, room.floor_z), (ix1, iy1, room.floor_z), (ix0, iy1, room.floor_z),
                         (ix0, iy0, room.ceil_z), (ix1, iy0, room.ceil_z), (ix1, iy1, room.ceil_z), (ix0, iy1, room.ceil_z)])
        if cols:
            solid(f"columns-{room.id}", cols, self.palette.wall, col, role="interior")

    # ---- ceiling
    def ceiling(self, room, col):
        pal, spec = self.palette, room.spec
        holes = room.ceiling_holes()
        z = room.ceil_z
        mode = spec.get("ceiling", "flat")
        poly = [(p.x, p.y) for p in room.inner]
        # the ceiling stops 20 mm short of the walls; a dark strip set 6 mm higher reads as a shadow-gap edge
        inner = offset_polygon(poly, -0.02)
        obj = prism_object(f"ceiling-{room.id}", inner, [], z - 0.004, z + 0.02, pal.ceiling, col, bevel=False, role="interior")
        gap = prism_object(f"ceiling-gap-{room.id}", poly, [inner], z + 0.002, z + 0.02, pal.dark, col, bevel=False, role="interior")
        if holes:
            cut(obj, holes, z - 0.1, z + 0.1)
            if self.cfg.get("voids"):  # the dark edge strip must not run on across a void as a line on its walls
                cut(gap, holes, z - 0.1, z + 0.1)
            if mode != "slots":
                mode = "flat"  # a stairwell runs through it: a plain ceiling around the hole
        if mode == "slots":
            self.slots(room, poly, z, holes, col)
            self.downlights(room, offset_polygon(poly, -0.45), col)
            return
        drop, band, gap = spec.get("drop", 0.14), spec.get("band", 0.36), 0.035
        inset = poly
        if mode == "cove" and min(e.length for e in room.edges) > 2 * (band + gap) + 0.6:
            band_in = offset_polygon(poly, -band)
            prism_object(f"ceiling-drop-{room.id}", poly, [band_in], z - drop, z, pal.ceiling, col, role="interior")
            # a hairline brass lip on the lower inner edge of the dropped band
            prism_object(f"ceiling-brass-{room.id}", offset_polygon(poly, -(band - 0.014)), [band_in], z - drop - 0.004, z - drop,
                         pal.brass, col, bevel=False, role="interior")
            led_out = offset_polygon(poly, -(band + gap))
            led_in = offset_polygon(poly, -(band + gap + 0.03))
            prism_object(f"ceiling-led-{room.id}", led_out, [led_in], z - 0.012, z - 0.003, pal.led, col, bevel=False,
                         role="interior")
            self.cove_lights(room, led_out)
            inset = led_out
        self.downlights(room, inset, col)

    def slots(self, room, poly, z, holes, col):
        """A floating ceiling: a lit groove just inside the shadow gap all round, washing the walls, and trimless linear
        light slots across the room along its long side."""
        pal, spec = self.palette, room.spec
        if spec.get("edgeGlow", True):
            out = offset_polygon(poly, -0.03)
            inn = offset_polygon(poly, -0.05)
            prism_object(f"ceiling-edge-{room.id}", out, [inn], z - 0.0055, z - 0.0035, pal.led, col, bevel=False, role="interior")
            self.cove_lights(room, offset_polygon(poly, -0.04), kind="edge")
        spacing = spec.get("slotSpacing", 1.5)
        if spacing <= 0:
            return
        x0, x1, y0, y1 = room.bounds
        along_x = (x1 - x0) >= (y1 - y0)
        lo, hi = (y0, y1) if along_x else (x0, x1)
        a0, a1 = (x0, x1) if along_x else (y0, y1)
        margin = spec.get("slotMargin", 0.7)
        count = max(1, round((hi - lo - 2 * margin) / spacing) + 1)
        ring = [Vector(p) for p in offset_polygon(poly, -0.35)]
        strips = []
        for k in range(count):
            c = (lo + hi) / 2 if count == 1 else lo + margin + k * (hi - lo - 2 * margin) / (count - 1)
            # walk the line and keep the runs that stay inside the room and clear of holes in the ceiling
            run, t, step = None, a0, 0.05
            while t <= a1 + step:
                pt = Vector((t, c)) if along_x else Vector((c, t))
                ok = t <= a1 and inside(pt, ring) and not any(point_in_polygon((pt.x, pt.y), h) for h in holes)
                if ok and run is None:
                    run = t
                elif not ok and run is not None:
                    if t - step - run > 0.6:
                        strips.append((run, t - step, c))
                    run = None
                t += step
        boxes = []
        for s0, s1, c in strips:
            if along_x:
                boxes.append([(s0, c - 0.018, z - 0.0048), (s1, c - 0.018, z - 0.0048), (s1, c + 0.018, z - 0.0048), (s0, c + 0.018, z - 0.0048),
                              (s0, c - 0.018, z - 0.003), (s1, c - 0.018, z - 0.003), (s1, c + 0.018, z - 0.003), (s0, c + 0.018, z - 0.003)])
                mid, angle = (((s0 + s1) / 2, c)), 0.0
            else:
                boxes.append([(c - 0.018, s0, z - 0.0048), (c + 0.018, s0, z - 0.0048), (c + 0.018, s1, z - 0.0048), (c - 0.018, s1, z - 0.0048),
                              (c - 0.018, s0, z - 0.003), (c + 0.018, s0, z - 0.003), (c + 0.018, s1, z - 0.003), (c - 0.018, s1, z - 0.003)])
                mid, angle = ((c, (s0 + s1) / 2)), math.pi / 2
            self.lights.append({"kind": "slot", "room": room.id, "at": (mid[0], mid[1], z - 0.02), "length": s1 - s0, "angle": angle})
        if boxes:
            solid(f"ceiling-slots-{room.id}", boxes, pal.led, col, role="interior")

    def downlights(self, room, inset, col):
        """Small bright discs on a grid inside the ceiling, keeping clear of beams and holes."""
        pal = self.palette
        spacing = room.spec.get("downlightSpacing", 1.7)
        if spacing <= 0:
            return
        x0, x1, y0, y1 = room.bounds
        # a lowered ceiling hides the beams above it, so they do not push the lights away
        beams = [(v2(b["from"]), v2(b["to"])) for b in geometry.beams(room.level, room.above)] if room.above and not room.low else []
        holes = room.ceiling_holes()
        ring = [Vector(p) for p in inset]
        spots = []
        nx = max(1, round((x1 - x0) / spacing))
        ny = max(1, round((y1 - y0) / spacing))
        for i in range(nx):
            for j in range(ny):
                pt = Vector((x0 + (i + 0.5) * (x1 - x0) / nx, y0 + (j + 0.5) * (y1 - y0) / ny))
                if not inside(pt, ring):
                    continue
                if any(point_in_polygon((pt.x, pt.y), h) for h in holes):
                    continue
                if any(seg_dist(pt, a, b) < 0.35 for a, b in beams):
                    continue
                spots.append(pt)
        if not spots:
            return
        bm = bmesh.new()
        r = room.spec.get("downlightRadius", 0.055)
        for pt in spots:
            bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r, radius2=r, depth=0.01,
                                  matrix=Matrix.Translation((pt.x, pt.y, room.ceil_z - 0.006)))
        me = bpy.data.meshes.new(f"downlights-{room.id}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(pal.downlight)
        ob = bpy.data.objects.new(f"downlights-{room.id}", me)
        col.objects.link(ob)
        self.spot_lights(room, spots)

    # ---- lights (kept as plain data until the scene asks for them: engines want different shadow settings)
    def cove_lights(self, room, ring, kind="cove"):
        for i, p in enumerate(ring):
            q = ring[(i + 1) % len(ring)]
            a, b = Vector(p), Vector(q)
            if (b - a).length < 0.5:
                continue
            mid = (a + b) / 2
            self.lights.append({"kind": kind, "room": room.id, "at": (mid.x, mid.y, room.ceil_z - 0.01),
                                "length": (b - a).length, "angle": math.atan2((b - a).y, (b - a).x)})

    def spot_lights(self, room, spots):
        # a handful per room is enough: the discs themselves carry the look
        step = max(1, len(spots) // 4)
        for pt in spots[::step]:
            self.lights.append({"kind": "spot", "room": room.id, "at": (pt.x, pt.y, room.ceil_z - 0.02), "n": len(spots[::step]),
                                "radius": room.spec.get("spotRadius", 0.05)})

    def make_lights(self, shadows):
        cfg = self.cfg["lights"]
        warm = tuple(cfg.get("color", (1.0, 0.86, 0.7)))  # downlights, the stair and every new fitting
        for i, l in enumerate(self.lights):
            if l["kind"] == "cove":
                d = bpy.data.lights.new(f"cove-{l['room']}-{i}", "AREA")
                d.shape = "RECTANGLE"
                d.size, d.size_y = l["length"], 0.1
                d.energy = cfg["cove"] * max(0.4, min(2.0, l["length"] / 3.0))
                d.color = tuple(cfg.get("coveColor", (1.0, 0.82, 0.62)))
                rot = (math.pi, 0, l["angle"])
            elif l["kind"] in ("edge", "slot", "wash", "pendant"):
                # linear fittings shining down: the floating edge's groove, ceiling slots, wall washers, the hall pendant
                d = bpy.data.lights.new(f"{l['kind']}-{l['room']}-{i}", "AREA")
                d.shape = "RECTANGLE"
                d.size, d.size_y = l["length"], 0.06
                d.energy = cfg.get(l["kind"], 10) * l["length"]
                d.color = warm
                rot = (0, 0, l["angle"])
            elif l["kind"] == "stair":
                d = bpy.data.lights.new(f"stair-{l['room']}-{i}", "AREA")
                d.shape, d.size, d.size_y = "RECTANGLE", 1.8, 1.8
                d.energy = cfg.get("stair", 90)
                d.color = warm
                rot = (0, 0, 0)
            else:
                d = bpy.data.lights.new(f"spot-{l['room']}-{i}", "SPOT")
                d.spot_size, d.spot_blend, d.shadow_soft_size = math.radians(100), 0.8, l.get("radius", 0.05)
                d.energy = cfg["spot"]
                d.color = warm
                rot = (0, 0, 0)
            d.use_shadow = shadows
            o = bpy.data.objects.new(d.name, d)
            o.location, o.rotation_euler = l["at"], rot
            bpy.context.scene.collection.objects.link(o)

    # ---- fixed fittings: kitchen counters, bath ware, built-in wardrobes
    def fixtures(self, room, col):
        pal = self.palette
        parts = {"base": [], "upper": [], "vanity": [], "wardrobe": [], "basin": [], "top": [], "ceramic": [], "seat": [], "tray": [], "steel": [],
                 "mirror": [], "glass": [], "dark": [], "ledge": [], "glow": [], "console": [], "cistern": []}
        z = room.floor_z + FLOOR_T
        handleless = self.opt(room, "cabinetry") == "handleless"
        hung = self.opt(room, "wc") == "wall-hung"
        floating = self.opt(room, "vanityStyle") == "floating"
        rain = self.opt(room, "shower") == "rain"
        uppers = room.spec.get("uppers")  # counters that carry wall units; by default the 5 Marla kitchen's long run
        consoles = room.spec.get("consoles", [])
        for fx in room.level["fixtures"]:
            if not room.contains(Vector((fx["x"] + fx["w"] / 2, fx["y"] + fx["d"] / 2))):
                continue
            back = fx["back"]
            if back in ("left", "right"):
                length, depth = fx["d"], fx["w"]
            else:
                length, depth = fx["w"], fx["d"]
            if back == "left":
                origin, u, n = Vector((fx["x"], fx["y"])), Vector((0, 1)), Vector((1, 0))
            elif back == "right":
                origin, u, n = Vector((fx["x"] + fx["w"], fx["y"])), Vector((0, 1)), Vector((-1, 0))
            elif back == "front":
                origin, u, n = Vector((fx["x"], fx["y"])), Vector((1, 0)), Vector((0, 1))
            else:
                origin, u, n = Vector((fx["x"], fx["y"] + fx["d"])), Vector((1, 0)), Vector((0, -1))
            origin = origin + n * 0.018  # clear of the painted wall
            depth -= 0.018

            def box(key, s0, s1, o0, o1, z0, z1, parts=parts, origin=origin, u=u, n=n):
                parts[key].append(fbox(origin, u, n, s0, s1, o0, o1, z0, z1))

            kind = fx["type"]
            if kind == "counter" and fx["id"] in consoles:
                # a low floating media console in timber, lit underneath
                cd = min(depth, 0.42)
                box("console", 0, length, 0, cd, z + 0.3, z + 0.6)
                box("glow", 0.04, length - 0.04, 0.03, cd - 0.04, z + 0.288, z + 0.296)
            elif kind == "counter" and handleless:
                self._modern_counter(room, fx, box, origin, u, n, length, depth, z,
                                     uppers is not None and fx["id"] in uppers)
            elif kind == "counter":
                # base cabinets with a stone top, and a wall cabinet above the long run in the kitchen
                front = depth - 0.02
                box("dark", 0.0, length, 0.04, depth - 0.07, z, z + 0.09)  # recessed toe-kick
                box("dark", 0, length, 0, front - 0.018, z + 0.09, z + 0.86)  # the carcass, seen through the door gaps
                box("top", 0, length, 0, depth, z + 0.86, z + 0.9)
                mods = max(1, round(length / 0.6))
                w = length / mods
                for i in range(mods):
                    s0, s1 = i * w + 0.002, (i + 1) * w - 0.002
                    if i % 3 == 0 and w <= 0.9:  # a stack of three drawers, each with a bar pull
                        zc = z + 0.092
                        for h in (0.19, 0.25, 0.29):
                            box("base", s0, s1, front - 0.018, front, zc, zc + h - 0.004)
                            mid = (s0 + s1) / 2
                            bar = min(0.26, w * 0.45)
                            box("steel", mid - bar / 2, mid + bar / 2, front, front + 0.02, zc + h - 0.05, zc + h - 0.038)
                            zc += h
                    else:  # a door with a long vertical pull at its top corner
                        box("base", s0, s1, front - 0.018, front, z + 0.092, z + 0.858)
                        edge = s1 - 0.045 if i % 2 else s0 + 0.045
                        box("steel", edge - 0.008, edge + 0.008, front, front + 0.02, z + 0.62, z + 0.83)
                if (fx["id"] in uppers) if uppers is not None else (room.type == "kitchen" and fx["id"] == "k-counter"):
                    box("dark", 0, length, 0, 0.33 - 0.018, z + 1.45, z + 2.25)
                    ups = max(1, round(length / 0.5))
                    uw = length / ups
                    for i in range(ups):
                        s0, s1 = i * uw + 0.002, (i + 1) * uw - 0.002
                        box("upper", s0, s1, 0.33 - 0.018, 0.33, z + 1.452, z + 2.248)
                        edge = s1 - 0.04 if i % 2 else s0 + 0.04
                        box("steel", edge - 0.008, edge + 0.008, 0.33, 0.35, z + 1.47, z + 1.69)
            elif kind == "sink":
                box("basin", 0.18, length - 0.18, 0.12, depth - 0.1, z + 0.895, z + 0.903)
                box("steel", length / 2 - 0.015, length / 2 + 0.015, 0.03, 0.05, z + 0.9, z + 1.15)
                box("steel", length / 2 - 0.015, length / 2 + 0.015, 0.03, 0.2, z + 1.13, z + 1.15)
            elif kind == "hob":
                box("dark", 0.05, length - 0.05, 0.05, depth - 0.05, z + 0.9, z + 0.91)
            elif kind == "wc" and hung:
                # a wall-hung pan clear of the floor, in front of a box that hides the cistern: clad in the vanity's
                # timber with a stone shelf on top, so it reads as a fitting against the stone walls, not part of them
                cx = length / 2
                box("cistern", 0, length, 0, 0.17, z, z + 1.02)
                box("top", 0, length, 0, 0.19, z + 1.02, z + 1.05)
                box("ceramic", cx - 0.18, cx + 0.18, 0.18, 0.72, z + 0.28, z + 0.42)
                box("seat", cx - 0.185, cx + 0.185, 0.2, 0.74, z + 0.42, z + 0.44)
                box("steel", cx - 0.11, cx + 0.11, 0.17, 0.18, z + 0.82, z + 0.97)  # flush plate
            elif kind in ("basin", "vanity") and floating:
                # a wall-hung vanity with handleless drawers, lit underneath, a vessel basin, a wall spout and a mirror
                cx = length / 2
                d0 = min(depth - 0.02, 0.5)
                box("dark", 0.01, length - 0.01, 0, d0 - 0.02, z + 0.45, z + 0.8)
                for z0v, z1v in ((z + 0.452, z + 0.616), (z + 0.634, z + 0.79)):
                    box("vanity", 0.012, length - 0.012, d0 - 0.02, d0, z0v, z1v)
                box("top", 0, length, 0, d0 + 0.01, z + 0.8, z + 0.83)
                box("glow", 0.04, length - 0.04, 0.03, d0 - 0.04, z + 0.438, z + 0.446)
                bw = min(0.5, length - 0.15)
                box("ceramic", cx - bw / 2, cx + bw / 2, 0.07, min(d0 - 0.04, 0.42), z + 0.83, z + 0.95)
                box("steel", cx - 0.012, cx + 0.012, 0.0, 0.2, z + 1.03, z + 1.05)
                if room.spec.get("backlitMirror"):
                    box("glow", 0.08, length - 0.08, 0.0, 0.012, z + 1.12, z + 2.08)
                    box("mirror", 0.1, length - 0.1, 0.02, 0.032, z + 1.14, z + 2.06)
                else:
                    box("mirror", 0.1, length - 0.1, 0.0, 0.015, z + 1.2, z + 2.05)
            elif kind == "shower" and rain:
                # a flush tray, a rain head on an arm from the wall, a valve plate, frameless glass, and a lit niche
                box("tray", 0, length, 0, depth, z - 0.004, z + 0.008)
                box("steel", length / 2 - 0.012, length / 2 + 0.012, 0.0, 0.32, z + 2.12, z + 2.14)
                box("steel", length / 2 - 0.13, length / 2 + 0.13, 0.19, 0.45, z + 2.1, z + 2.112)
                box("steel", length / 2 - 0.06, length / 2 + 0.06, 0.0, 0.01, z + 1.0, z + 1.12)
                box("glass", 0, 0.01, 0, depth, z + 0.008, z + 2.0)
                box("glass", 0, length, depth - 0.01, depth, z + 0.008, z + 2.0)
                if room.spec.get("niche", True) and length > 1.0:
                    nw, nd, n0, n1 = 0.6, 0.07, z + 1.05, z + 1.45
                    s0 = length - nw - 0.15
                    for b in ((s0, s0 + nw, 0, nd, n0, n0 + 0.015), (s0, s0 + nw, 0, nd, n1 - 0.015, n1),
                              (s0, s0 + 0.015, 0, nd, n0, n1), (s0 + nw - 0.015, s0 + nw, 0, nd, n0, n1), (s0, s0 + nw, 0, 0.004, n0, n1)):
                        box("ledge", *b)
                    box("glow", s0 + 0.02, s0 + nw - 0.02, 0.01, nd - 0.01, n1 - 0.022, n1 - 0.015)
            elif kind == "wc":
                cx, hw = length / 2, 0.19
                box("ceramic", cx - hw, cx + hw, 0.0, 0.2, z + 0.35, z + 0.85)  # cistern
                box("ceramic", cx - 0.17, cx + 0.17, 0.0, 0.62, z, z + 0.4)  # bowl
                box("seat", cx - 0.19, cx + 0.19, 0.08, 0.66, z + 0.4, z + 0.43)  # seat
                box("seat", cx - 0.17, cx + 0.17, 0.16, 0.6, z + 0.43, z + 0.447)  # lid
                box("steel", cx - 0.04, cx + 0.04, 0.08, 0.12, z + 0.85, z + 0.87)  # flush button
            elif kind in ("basin", "vanity"):
                cx = length / 2
                vf = depth - 0.04
                box("dark", 0.02, length - 0.02, 0, vf - 0.018, z + 0.1, z + 0.78)
                bar = min(0.4, length * 0.5)
                for z0v, z1v in ((z + 0.102, z + 0.438), (z + 0.442, z + 0.778)):  # two drawers, long brass bar pulls
                    box("vanity", 0.022, length - 0.022, vf - 0.018, vf, z0v, z1v)
                    box("steel", cx - bar / 2, cx + bar / 2, vf, vf + 0.02, (z0v + z1v) / 2 + 0.1, (z0v + z1v) / 2 + 0.112)
                box("top", 0, length, 0, depth - 0.02, z + 0.78, z + 0.82)
                box("ceramic", cx - 0.25, cx + 0.25, 0.04, depth - 0.1, z + 0.82, z + 0.9)
                box("steel", cx - 0.015, cx + 0.015, 0.03, 0.06, z + 0.9, z + 1.1)
                box("steel", cx - 0.015, cx + 0.015, 0.03, 0.16, z + 1.08, z + 1.1)
                box("mirror", 0.1, length - 0.1, 0.0, 0.015, z + 1.2, z + 2.05)
            elif kind == "shower":
                # a tray, a rail with a head, and glass along the two open sides
                box("tray", 0, length, 0, depth, z, z + 0.03)
                box("steel", 0.08, 0.1, 0.02, 0.04, z + 0.8, z + 2.1)
                box("steel", 0.06, 0.3, 0.02, 0.04, z + 2.0, z + 2.05)
                box("glass", 0, 0.012, 0, depth, z + 0.03, z + 2.0)
                box("glass", 0, length, depth - 0.012, depth, z + 0.03, z + 2.0)
            elif kind == "wardrobe":
                top = room.ceil_z - 0.03
                front = depth - 0.05
                box("dark", 0, length, 0, front - 0.02, z, top)  # carcass and plinth, seen through the gaps
                doors = max(2, round(length / 0.5))
                step = length / doors
                for i in range(doors):
                    s0, s1 = i * step + 0.002, (i + 1) * step - 0.002
                    box("wardrobe", s0, s1, front - 0.02, front, z + 0.06, top - 0.003)
                    if handleless:  # push-to-open: the doors meet in hairline gaps, nothing on their faces
                        continue
                    # a slim vertical brass pull on the edge beside the gap between each pair of doors
                    edge = s1 - 0.035 if i % 2 == 0 else s0 + 0.035
                    box("steel", edge - 0.007, edge + 0.007, front, front + 0.022, z + 0.8, z + 1.45)
        for key, mat in (("base", pal.base), ("upper", pal.upper), ("vanity", pal.vanity), ("wardrobe", pal.wardrobe),
                         ("basin", pal.basin), ("top", pal.counter), ("ceramic", pal.ceramic), ("seat", pal.ceramic),
                         ("tray", pal.ceramic), ("steel", pal.steel),
                         ("mirror", pal.mirror), ("glass", pal.glass), ("dark", pal.dark),
                         # a shower niche is lined in the room's own wall slab, if it has one
                         ("ledge", pal.wall_tile(room.spec.get("wallTileKey", "bath")) if room.spec.get("wallTile") else pal.counter),
                         ("glow", pal.led), ("console", pal.vanity), ("cistern", pal.vanity)):
            if parts[key]:
                solid(f"fixtures-{key}-{room.id}", parts[key], mat, col,
                      bevel={"ceramic": 0.03, "seat": 0.012, "tray": 0.002}.get(key, 0.003 if key in ("base", "upper", "vanity", "wardrobe", "top", "cistern") else 0.0),
                      role="interior")

    def _modern_counter(self, room, fx, box, origin, u, n, length, depth, z, upper):
        """A handleless counter: flat fronts opened from a recessed groove under a thin stone top, the top running down
        a free end as a waterfall, a stone slab splashback, and wall units to the ceiling with a light line beneath."""
        spec = room.spec
        front = depth - 0.02
        box("dark", 0.0, length, 0.06, depth - 0.07, z, z + 0.1)  # recessed plinth
        box("dark", 0, length, 0, front - 0.018, z + 0.1, z + 0.87)  # the carcass, seen in the gaps and the groove
        mods = max(1, round(length / 0.6))
        w = length / mods
        for i in range(mods):
            s0, s1 = i * w + 0.0015, (i + 1) * w - 0.0015
            if i % 3 == 0 and w <= 0.9:  # a pair of deep drawers, the upper one opened from the groove under the top
                for z0, z1 in ((z + 0.102, z + 0.43), (z + 0.462, z + 0.82)):
                    box("base", s0, s1, front - 0.018, front, z0, z1)
            else:
                box("base", s0, s1, front - 0.018, front, z + 0.102, z + 0.82)
        top1 = z + 0.9
        box("top", 0, length, 0, depth, z + 0.87, top1)
        if spec.get("waterfall"):
            for end in (0.0, length):
                out = -0.25 if end == 0.0 else 0.25
                probe = origin + u * (end + out) + n * (depth / 2)
                taken = any(o is not fx and o["x"] - 0.05 <= probe.x <= o["x"] + o["w"] + 0.05 and o["y"] - 0.05 <= probe.y <= o["y"] + o["d"] + 0.05
                            for o in room.level["fixtures"])
                if room.contains(probe) and not taken:
                    a0, a1 = (-0.03, 0.0) if end == 0.0 else (length, length + 0.03)
                    box("top", a0, a1, 0, depth, z, top1)
        # windows and doors in the wall behind the counter: (s0, s1, bottom, top)
        behind = []
        for op in room.level["openings"]:
            a, b = v2(op["from"]), v2(op["to"])
            d = b - a
            if d.length < 1e-6 or abs(d.x * u.y - d.y * u.x) / d.length > 1e-3:
                continue
            if dist_to_line(a, origin, u) > op["thickness"] / 2 + SKIN + 0.06:
                continue
            o0, o1 = sorted(((a - origin).dot(u), (b - origin).dot(u)))
            if o1 > 0 and o0 < length:
                behind.append((o0, o1, op["bottom"], op["top"]))
        if spec.get("splashback") == "slab":
            high = z + 1.45 if upper else top1 + spec.get("splashHeight", 0.55)
            # stop under any window in the wall behind
            spans = [(0.0, length, high)]
            for o0, o1, bottom, _ in behind:
                if bottom >= high:
                    continue
                nxt = []
                for s0, s1, h in spans:
                    if o1 <= s0 or o0 >= s1:
                        nxt.append((s0, s1, h))
                        continue
                    nxt += [(s0, o0, h), (o0, o1, min(h, bottom - 0.01)), (o1, s1, h)]
                spans = [(max(s0, 0.0), min(s1, length), h) for s0, s1, h in nxt]
            for s0, s1, h in spans:
                if s1 - s0 > 0.01 and h - top1 > 0.02:
                    box("top", s0, s1, 0, 0.012, top1, h)
        if upper:
            # wall units to the ceiling, either side of any window or door they would cover
            zb, zt = z + 1.45, room.ceil_z - 0.005
            for s0, s1 in self._gaps(length, [(o0 - 0.05, o1 + 0.05) for o0, o1, _, top in behind if top > zb], least=0.3):
                run = s1 - s0
                box("dark", s0, s1, 0, 0.33 - 0.018, zb, zt)
                ups = max(1, round(run / 0.5))
                uw = run / ups
                for i in range(ups):
                    box("upper", s0 + i * uw + 0.0015, s0 + (i + 1) * uw - 0.0015, 0.33 - 0.018, 0.33, zb + 0.002, zt - 0.002)
                box("glow", s0 + 0.03, s1 - 0.03, 0.27, 0.3, zb - 0.005, zb)
                at = origin + u * ((s0 + s1) / 2) + n * 0.28
                self.lights.append({"kind": "wash", "room": room.id, "at": (at.x, at.y, zb - 0.02), "length": max(0.3, run - 0.1),
                                    "angle": math.atan2(u.y, u.x)})

    # ---- the stair: finished treads and painted risers and sides over the structural concrete
    def stairs(self, li, level):
        """Finished stairs. The exported stair is a solid mass of concrete under every step, which would fill the
        stairwell and hide the flight that arrives from below, so each step is rebuilt as part of a sloping slab."""
        pal = self.palette
        col = collection(f"interior-stair-{level['id']}", self.root)
        paint, treads = [], []
        outdoor = self.cfg.get("outdoorStairs", {})  # stairs out on a terrace: paving treads and rendered sides
        glassy = self.cfg.get("style", {}).get("balustrade") == "glass"
        both_axes = self.cfg.get("style", {}).get("stairRails") == "both"
        for st in level["stairs"]:
            if st.get("outdoor") or not st.get("steps"):
                continue
            out = outdoor.get(st["id"])
            if out is not None:
                o_paint, o_treads = [], []
            old = bpy.data.objects.get(f"stair-{level['id']}-{st['id']}")
            if old:
                bpy.data.objects.remove(old, do_unlink=True)
            steps = list(st["steps"])
            slab, riser = 0.25, st.get("riser", 0.18)
            # the exported flight stops one tread short: its last step is the floor above, which the stairwell hole
            # has cut away, leaving a gap. Add that tread, flush with the floor finish.
            if len(steps) > 1 and st.get("risers"):
                a, b = steps[-2], steps[-1]
                if abs(a["y"] - b["y"]) < 1e-3 and abs(a["x"] - b["x"]) > 1e-3:
                    top_z = st["bottom"] + st["risers"] * riser
                    if top_z - b["top"] < riser * 1.5 and b["top"] < top_z - 0.01:
                        steps.append(dict(b, x=2 * b["x"] - a["x"], top=top_z - 0.013))

            def run(i):
                """The axis a step rises along and its direction, from its neighbours in the same flight"""
                a = steps[i]
                for k in (i + 1, i - 1):
                    if not 0 <= k < len(steps):
                        continue
                    b = steps[k]
                    sign = 1 if k > i else -1
                    if abs(a["y"] - b["y"]) < 1e-3 and abs(a["d"] - b["d"]) < 1e-3 and abs(a["x"] - b["x"]) > 1e-3:
                        return "x", sign * (1 if b["x"] > a["x"] else -1)
                    if abs(a["x"] - b["x"]) < 1e-3 and abs(a["w"] - b["w"]) < 1e-3 and abs(a["y"] - b["y"]) > 1e-3:
                        return "y", sign * (1 if b["y"] > a["y"] else -1)
                return None, 0

            for i, step in enumerate(steps):
                axis, sign = run(i)
                top = step["top"]
                lo = max(step["bottom"], top - riser - slab)
                hi = max(step["bottom"], top - slab)
                for grow, ztop, bucket in ((0.012, top, paint if out is None else o_paint),
                                           (0.02, top + 0.025, treads if out is None else o_treads)):
                    g = grow
                    x0, y0, x1, y1 = step["x"] - g, step["y"] - g, step["x"] + step["w"] + g, step["y"] + step["d"] + g
                    # the underside: lower at the near end of the step, higher at the far end, so the soffit is one slope
                    z = {"x0": hi, "x1": hi, "y0": hi, "y1": hi}
                    if axis == "x":
                        near, far = ("x0", "x1") if sign > 0 else ("x1", "x0")
                        z[near], z[far] = lo, hi
                    elif axis == "y":
                        near, far = ("y0", "y1") if sign > 0 else ("y1", "y0")
                        z[near], z[far] = lo, hi
                    if grow == 0.02:  # a tread
                        bz = [ztop - 0.025] * 4
                    else:
                        bz = [min(z["x0"], z["y0"]) - g, min(z["x1"], z["y0"]) - g, min(z["x1"], z["y1"]) - g, min(z["x0"], z["y1"]) - g]
                        if axis == "x":
                            bz = [z["x0"] - g, z["x1"] - g, z["x1"] - g, z["x0"] - g]
                        elif axis == "y":
                            bz = [z["y0"] - g, z["y0"] - g, z["y1"] - g, z["y1"] - g]
                    bucket.append([(x0, y0, bz[0]), (x1, y0, bz[1]), (x1, y1, bz[2]), (x0, y1, bz[3]),
                                   (x0, y0, ztop), (x1, y0, ztop), (x1, y1, ztop), (x0, y1, ztop)])
            rails, posts, panes = [], [], []
            pane = glassy and out is None
            prev = None
            for i, step in enumerate(steps):
                axis, sign = run(i)
                if axis == "y" and both_axes and step["d"] <= 2 and i < len(steps) - 1:
                    # a flight rising along y: the same rail, built in swapped coordinates
                    inner = step["x"] + step["w"] - 0.035 if step["x"] < st["x"] + st["w"] / 2 else step["x"] + 0.035
                    pz0, along = step["top"] + 0.025, step["y"] + step["d"] / 2

                    def xy(a, c):
                        return (c, a)
                elif axis != "x" or step["w"] > 2 or i == len(steps) - 1:
                    prev = None
                    continue
                else:
                    inner = step["y"] + step["d"] - 0.035 if step["y"] < st["y"] + st["d"] / 2 else step["y"] + 0.035
                    pz0, along = step["top"] + 0.025, step["x"] + step["w"] / 2

                    def xy(a, c):
                        return (a, c)
                z0, px = pz0, along
                if prev and prev[3] != axis:
                    prev = None
                if not pane:
                    posts.append([(*xy(px - 0.015, inner - 0.015), z0), (*xy(px + 0.015, inner - 0.015), z0),
                                  (*xy(px + 0.015, inner + 0.015), z0), (*xy(px - 0.015, inner + 0.015), z0),
                                  (*xy(px - 0.015, inner - 0.015), z0 + 0.9), (*xy(px + 0.015, inner - 0.015), z0 + 0.9),
                                  (*xy(px + 0.015, inner + 0.015), z0 + 0.9), (*xy(px - 0.015, inner + 0.015), z0 + 0.9)])
                if prev and abs(prev[1] - inner) < 1e-3:
                    # glass: one sloping pane per step under a slim cap rail; otherwise a handrail and a mid rail
                    levels = ((0.9, 0.022, rails), (0.45, 0.012, rails)) if not pane else ((0.92, 0.011, rails), (0.46, 0.006, panes))
                    for h, t, bucket in levels:
                        if bucket is panes:  # the pane: from just above the treads to under the cap rail
                            p0, p1, c0, c1 = prev[2] + 0.06, prev[2] + 0.905, z0 + 0.06, z0 + 0.905
                        else:
                            p0, p1, c0, c1 = prev[2] + h - t, prev[2] + h + t, z0 + h - t, z0 + h + t
                        bucket.append([(*xy(prev[0], inner - t), p0), (*xy(px, inner - t), c0), (*xy(px, inner + t), c0),
                                       (*xy(prev[0], inner + t), p0), (*xy(prev[0], inner - t), p1), (*xy(px, inner - t), c1),
                                       (*xy(px, inner + t), c1), (*xy(prev[0], inner + t), p1)])
                prev = (px, inner, z0, axis)
            if posts or rails:
                solid(f"stair-rail-{level['id']}-{st['id']}", posts + rails, pal.brass, col, bevel=0.002 if posts else 0.0, role="interior")
            if panes:
                solid(f"stair-glass-{level['id']}-{st['id']}", panes, pal.glass, col, role="interior")
            if out is not None:
                solid(f"stair-sides-{level['id']}-{st['id']}", o_paint, materials.get(out.get("side", "plaster-sand")), col, role="interior")
                solid(f"stair-treads-{level['id']}-{st['id']}", o_treads, materials.get(out.get("tread", "paving-stone")), col,
                      bevel=0.003, role="interior")
                continue
            cx, cy = st["x"] + st["w"] / 2, st["y"] + st["d"] / 2
            self.lights.append({"kind": "stair", "room": f"stair-{level['id']}", "at": (cx, cy, level["slab"]["top"] + 2.3)})
        if paint:
            solid(f"stair-paint-{level['id']}", paint, pal.wall, col, role="interior")
            solid(f"stair-treads-{level['id']}", treads, pal.stair_tread, col, bevel=0.003, role="interior")

    # ---- holes in the slab above a level: a double-height hall and the stairwell
    @staticmethod
    def _along(p, u, length, items, tol=0.06):
        """The stretches (s0, s1, item) of walls or openings that run along the line from p in direction u."""
        out = []
        for w in items:
            a, b = v2(w["from"]), v2(w["to"])
            d = b - a
            if d.length < 1e-6 or abs(d.x * u.y - d.y * u.x) / d.length > 1e-3:
                continue
            if dist_to_line(a, p, u) > w["thickness"] / 2 + tol:
                continue
            s0, s1 = sorted(((a - p).dot(u), (b - p).dot(u)))
            s0, s1 = max(s0, 0.0), min(s1, length)
            if s1 - s0 > 0.02:
                out.append((s0, s1, w))
        return out

    @staticmethod
    def _union(intervals):
        """Overlapping or touching intervals joined."""
        out = []
        for a, b in sorted(intervals):
            if out and a <= out[-1][1] + 1e-4:
                out[-1] = (out[-1][0], max(out[-1][1], b))
            else:
                out.append((a, b))
        return out

    @staticmethod
    def _gaps(length, covered, least=0.1):
        """The parts of 0..length that no interval in `covered` reaches."""
        out, t = [], 0.0
        for s0, s1 in sorted(covered):
            if s0 - t > least:
                out.append((t, s0))
            t = max(t, s1)
        if length - t > least:
            out.append((t, length))
        return out

    def voids(self, li, level):
        """Finish the holes in the slab over this level. A double-height void becomes part of the room below it: its
        ceiling is the next slab up, its walls are finished up both storeys (with reveals for the windows in them), and
        the slab edges left open get a fascia and a frameless glass balustrade. A stairwell gets the same edges, minus
        the balustrade where the flight arrives; the rooms above finish their own walls."""
        from .util import ccw
        design, pal = self.design, self.palette
        upper = design["levels"][li + 1]
        roof = design["levels"][li + 2] if li + 2 < len(design["levels"]) else None
        col = collection(f"interior-voids-{level['id']}", self.root)
        uz = upper["slab"]["top"]
        zf = uz + FLOOR_T
        below = [r for (lid, _), r in self.rooms.items() if lid == level["id"]]
        panels, fascia, glass, metal, reveals, stools = [], [], [], [], [], []
        for v in upper["slab"].get("voids", []):
            ring = [v2(p) for p in ccw(v["outline"])]
            under = [r for r in below if r.overlaps(v["outline"])]
            if not under:
                continue
            double = v["kind"] == "double-height"
            if double:
                top = roof["slab"]["bottom"] if roof else upper["elevation"] + upper["height"]
                beams = geometry.beams(upper, roof) if roof else []
                if beams and not self.cfg.get("exposeBeams"):  # the same flush ceiling as the rooms beside it
                    top = min(top, min(b["bottom"] for b in beams) - SKIN - 0.006)
            else:
                top = uz
            arrive = self._arrival(level, ring) if not double else None
            offsets = []
            for i, p in enumerate(ring):
                q = ring[(i + 1) % len(ring)]
                u = (q - p).normalized()
                n = Vector((-u.y, u.x))  # into the void
                L = (q - p).length
                prev_u = (p - ring[i - 1]).normalized()
                next_u = (ring[(i + 2) % len(ring)] - q).normalized()
                convex0 = prev_u.x * u.y - prev_u.y * u.x > 0
                convex1 = u.x * next_u.y - u.y * next_u.x > 0
                pieces = self._along(p, u, L, upper["walls"])
                holes = self._along(p, u, L, upper["openings"])
                covered = [(s0, s1) for s0, s1, _ in pieces + holes]
                offsets.append(SKIN if covered else 0.0)
                # where the rooms below finish this face, and how high: the band above them is finished here
                lows = []
                for r in under:
                    for e in r.edges:
                        if e.open or abs(e.u.dot(u)) < 0.999 or dist_to_line(e.A, p, u) > SKIN + 0.05:
                            continue
                        a0, a1 = sorted(((e.A - p).dot(u), (e.B - p).dot(u)))
                        lows.append((max(a0, 0.0), min(a1, L), r.ceil_z))
                cuts = sorted({0.0, L, *[c for s0, s1, _ in lows for c in (s0, s1)], *[c for s0, s1 in covered for c in (s0, s1)]})
                for a0, a1 in zip(cuts, cuts[1:]):
                    if a1 - a0 < 0.005:
                        continue
                    mid = (a0 + a1) / 2
                    if not any(s0 <= mid <= s1 for s0, s1 in covered):
                        continue
                    z_lo = min((z for s0, s1, z in lows if s0 <= mid <= s1), default=level["slab"]["top"])
                    if top > z_lo:
                        panels.append(fbox(p, u, n, a0, a1, SKIN - 0.003, SKIN + 0.004, z_lo, min(uz, top)))
                    if double:  # the upper storey's wall pieces, broken by its windows; overlapping pieces painted once
                        heights = sorted((max(w["bottom"], uz), min(w["top"], top)) for s0, s1, w in pieces if s0 <= mid <= s1)
                        for z0, z1 in self._union(heights):
                            if z1 - z0 > 0.01:
                                panels.append(fbox(p, u, n, a0, a1, SKIN - 0.003, SKIN + 0.004, z0, z1))
                if double:
                    for s0, s1, op in holes:
                        self._void_reveals(op, n, upper, reveals, stools)
                def ext(s, d, at_end, L=L, convex0=convex0, convex1=convex1):
                    """How far a run ending at a corner of the hole reaches past it: on, round an outside corner; back
                    from an inside one, so runs on the two sides meet without crossing."""
                    if abs(s - (L if at_end else 0.0)) > 0.02:
                        return 0.0
                    return d if (convex1 if at_end else convex0) else -d

                # from the ceiling of the rooms that look up into the hole: a room tucked under the landing has its own
                # low ceiling, and measuring from that would hang a deep white band over the flight
                z_lo = min((r.ceil_z for r in under if not r.low), default=min(r.ceil_z for r in under)) - 0.004
                for g0, g1 in self._gaps(L, covered):
                    # the slab's cut edge, finished from the ceiling below to the floor above, and glass along it
                    fascia.append(fbox(p, u, n, g0 - ext(g0, 0.012, False), g1 + ext(g1, 0.012, True), 0.0, 0.012, z_lo, zf))
                    runs = [(g0, g1)]
                    if arrive and arrive[0] == i:
                        runs = [(g0, min(g1, arrive[1])), (max(g0, arrive[2]), g1)]
                    for b0, b1 in runs:
                        if b1 - b0 > 0.15:
                            self._balustrade(p, u, n, b0 - ext(b0, 0.075, False), b1 + ext(b1, 0.075, True), zf, glass, metal)
            if double:
                self._void_ceiling(v, ring, offsets, top, col, level["slab"]["top"] + FLOOR_T)
        if panels:
            solid(f"void-paint-{level['id']}", panels, pal.wall, col, role="interior")
        if reveals:
            solid(f"void-reveals-{level['id']}", reveals, pal.wall, col, role="interior")
        if stools:
            solid(f"void-stools-{level['id']}", stools, pal.stone, col, bevel=0.004, role="interior")
        if fascia:
            solid(f"void-fascia-{level['id']}", fascia, pal.wall, col, role="interior")
        if glass:
            solid(f"balustrade-glass-{level['id']}", glass, pal.glass, col, role="interior")
        if metal:
            solid(f"balustrade-rail-{level['id']}", metal, pal.brass, col, bevel=0.002, role="interior")

    def _arrival(self, level, ring):
        """(edge index, s0, s1): where a stair from this level arrives at the hole's edge, which stays open."""
        for st in level["stairs"]:
            steps = st.get("steps") or []
            if len(steps) < 2:
                continue
            a, b = steps[-2], steps[-1]
            run = Vector((b["x"] - a["x"], b["y"] - a["y"]))
            if run.length < 1e-6:
                continue
            run.normalize()
            c = Vector((b["x"] + b["w"] / 2, b["y"] + b["d"] / 2))
            for i, p in enumerate(ring):
                q = ring[(i + 1) % len(ring)]
                u = (q - p).normalized()
                n = Vector((-u.y, u.x))
                if n.dot(run) > -0.99 or dist_to_line(c, p, u) > max(b["w"], b["d"]) * 1.5:
                    continue  # the flight must run out of the hole across this edge, and end at it
                ends = [(Vector((b["x"] + dx, b["y"] + dy)) - p).dot(u) for dx in (0, b["w"]) for dy in (0, b["d"])]
                return i, min(ends) - 0.05, max(ends) + 0.05
        return None

    def _balustrade(self, p, u, n, s0, s1, zf, glass, metal):
        """Frameless glass about a metre high in a slim base shoe, with a thin metal cap rail, just off the slab edge."""
        if s1 - s0 < 0.1:
            return
        glass.append(fbox(p, u, n, s0, s1, -0.061, -0.049, zf + 0.03, zf + 0.985))
        metal.append(fbox(p, u, n, s0, s1, -0.08, -0.03, zf, zf + 0.09))
        metal.append(fbox(p, u, n, s0, s1, -0.068, -0.042, zf + 0.985, zf + 1.01))

    def _void_reveals(self, op, n, level, reveals, stools):
        """Reveals and a stone sill for a window in a wall that rises through the void (as trim() does for a room)."""
        a, b = v2(op["from"]), v2(op["to"])
        u = (b - a).normalized()
        W, t = (b - a).length, op["thickness"]
        face = t / 2 + SKIN
        exterior = any(w["wall"] == op["wall"] and w["kind"] == "exterior" for w in level["walls"])
        o_f = -(t / 2 - FRAME_SETBACK - FRAME_DEPTH) if exterior and op["type"] != "opening" else 0.0
        z0, z1 = op["bottom"], op["top"]
        reveals.append(fbox(a, u, n, SKIN - 0.002, SKIN + 0.003, o_f, face, z0, z1))
        reveals.append(fbox(a, u, n, W - SKIN - 0.003, W - SKIN + 0.002, o_f, face, z0, z1))
        reveals.append(fbox(a, u, n, SKIN, W - SKIN, o_f, face, z1 - SKIN - 0.003, z1 - SKIN + 0.002))
        if op["type"] == "window":
            stools.append(fbox(a, u, n, -0.01, W + 0.01, o_f, face + 0.04, z0 + SKIN - 0.002, z0 + SKIN + 0.03))

    def _void_ceiling(self, v, ring, offsets, top, col, floor_z):
        """The ceiling over a double-height void, floating like the rooms' own, with a lit edge and the hall pendant."""
        pal = self.palette
        lines = [(ring[i] + Vector((-(ring[(i + 1) % len(ring)] - ring[i]).normalized().y,
                                    (ring[(i + 1) % len(ring)] - ring[i]).normalized().x)) * offsets[i],
                  (ring[(i + 1) % len(ring)] - ring[i]).normalized()) for i in range(len(ring))]
        poly = [tuple(line_hit(lines[i - 1][0], lines[i - 1][1], lines[i][0], lines[i][1])) for i in range(len(lines))]
        inner = offset_polygon(poly, -0.02)
        prism_object(f"ceiling-{v['id']}", inner, [], top - 0.004, top + 0.02, pal.ceiling, col, bevel=False, role="interior")
        prism_object(f"ceiling-gap-{v['id']}", poly, [inner], top + 0.002, top + 0.02, pal.dark, col, bevel=False, role="interior")
        xs, ys = [q[0] for q in poly], [q[1] for q in poly]
        spec = dict(self.cfg.get("voidCeiling", {"edgeGlow": True, "slotSpacing": 0}))
        ns = SimpleNamespace(id=v["id"], spec=spec, bounds=(min(xs), max(xs), min(ys), max(ys)), ceil_z=top)
        self.slots(ns, poly, top, [], col)
        pd = self.cfg.get("pendant")
        if not pd:
            return
        # a long linear pendant on two fine cables, centred on the void and running along its longer side
        area = sum(poly[i][0] * poly[i - 1][1] - poly[i - 1][0] * poly[i][1] for i in range(len(poly))) / -2
        cx = sum((poly[i][0] + poly[i - 1][0]) * (poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1]) for i in range(len(poly))) / (6 * area)
        cy = sum((poly[i][1] + poly[i - 1][1]) * (poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1]) for i in range(len(poly))) / (6 * area)
        if "at" in pd:
            cx, cy = pd["at"]
        along_x = (max(xs) - min(xs)) >= (max(ys) - min(ys))
        u = Vector((1, 0)) if along_x else Vector((0, 1))
        n = Vector((-u.y, u.x))
        L = pd.get("length", 2.4)
        origin = Vector((cx, cy)) - u * (L / 2)
        zp = floor_z + pd.get("height", 3.2)  # the bar's underside above the hall floor
        body = [fbox(origin, u, n, 0, L, -0.022, 0.022, zp, zp + 0.045)]
        body += [fbox(origin, u, n, s - 0.0015, s + 0.0015, -0.0015, 0.0015, zp + 0.045, top - 0.004) for s in (0.25, L - 0.25)]
        body += [fbox(origin, u, n, s - 0.03, s + 0.03, -0.03, 0.03, top - 0.012, top - 0.004) for s in (0.25, L - 0.25)]  # canopies
        solid(f"pendant-{v['id']}", body, pal.brass, col, bevel=0.002, role="interior")
        solid(f"pendant-glow-{v['id']}", [fbox(origin, u, n, 0.02, L - 0.02, -0.014, 0.014, zp - 0.003, zp + 0.001)], pal.led, col,
              role="interior")
        self.lights.append({"kind": "pendant", "room": v["id"], "at": (cx, cy, zp - 0.02), "length": L - 0.04,
                            "angle": math.atan2(u.y, u.x)})

    # ---- feature walls: fluted timber, a stone media wall, a fabric headboard wall; and tone-on-tone panelling
    def _clear_of_fixtures(self, room, e, s0, s1, depth=0.15):
        """True if no built-in fitting stands in front of the stretch s0..s1 of edge e."""
        for k in range(9):
            s = s0 + (s1 - s0) * k / 8
            for o in (0.05, depth):
                pt = e.A + e.u * s + e.n * o
                for fx in room.level["fixtures"]:
                    if fx["x"] - 0.25 <= pt.x <= fx["x"] + fx["w"] + 0.25 and fx["y"] - 0.25 <= pt.y <= fx["y"] + fx["d"] + 0.25:
                        return False
        return True

    def _solid_spans(self, e):
        spans = []
        for w in e.pieces:
            if w["part"] != "solid":
                continue
            a, b = v2(w["from"]), v2(w["to"])
            s0, s1 = sorted(((a - e.A).dot(e.u), (b - e.A).dot(e.u)))
            spans.append((max(s0, 0), min(s1, e.length)))
        return spans

    def feature_wall(self, room, col):
        pal = self.palette
        want = room.spec["featureWall"]  # a compass side of the room, or "auto" for its best blank wall
        kind = room.spec.get("featureKind", "fluted")
        normals = {"east": (-1, 0), "west": (1, 0), "north": (0, -1), "south": (0, 1)}
        if want == "auto":
            cands = [e for e in room.edges if not e.open]
        else:
            nx, ny = normals[want]
            cands = [e for e in room.edges if not e.open and abs(e.n.x - nx) < 0.01 and abs(e.n.y - ny) < 0.01]
        best = None
        for e in cands:
            for s0, s1 in self._solid_spans(e):
                if s1 - s0 < 1.6 or not self._clear_of_fixtures(room, e, s0 + 0.3, s1 - 0.3):
                    continue
                if best is None or s1 - s0 > best[2] - best[1]:
                    best = (e, s0, s1)
        if best is None:
            return
        e, s0, s1 = best
        if kind in ("travertine", "fluted-tight", "oak-panel"):
            self._modern_feature(room, e, s0, s1, kind, col)
            return
        want_span = room.spec.get("featureSpan", {"fluted": 2.5, "media": 3.2, "headboard": 2.6}.get(kind, 2.5))
        span = min(want_span, s1 - s0 - 0.5)
        if span < 0.8:
            return
        self.featured[room.id] = e
        mid = (s0 + s1) / 2
        lo, hi = mid - span / 2, mid + span / 2
        zb0, zb1 = room.floor_z + SKIRT_H + FLOOR_T, room.ceil_z - 0.22

        def put(name, boxes, mat, bevel=0.001):
            solid(f"feature-{name}-{room.id}", boxes, mat, col, bevel=bevel, role="interior")

        def timber(a0, a1):
            pitch, w = 0.075, 0.04
            count = int((a1 - a0) / pitch)
            start = a0 + ((a1 - a0) - count * pitch) / 2
            return [fbox(e.A, e.u, e.n, start + i * pitch, start + i * pitch + w, 0.012, 0.05, zb0, zb1) for i in range(count)]

        def brass(*positions):
            return [fbox(e.A, e.u, e.n, p - 0.006, p + 0.006, 0.0, 0.056, zb0, zb1) for p in positions]

        if kind == "media":
            # a large-format stone panel in the middle, fluted walnut on both sides and a floating console beneath
            side = span * 0.2
            put("backer", [fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.012, zb0, zb1)], pal.dark, 0.002)
            put("stone", [fbox(e.A, e.u, e.n, lo + side, hi - side, 0.0, 0.03, zb0, zb1)], pal.feature_stone, 0.002)
            put("slats", timber(lo, lo + side - 0.01) + timber(hi - side + 0.01, hi), pal.slat, 0.002)
            put("brass", brass(lo + side - 0.005, hi - side + 0.005) + [fbox(e.A, e.u, e.n, lo - 0.012, lo, 0.0, 0.052, zb0, zb1),
                                                                         fbox(e.A, e.u, e.n, hi, hi + 0.012, 0.0, 0.052, zb0, zb1)], pal.brass)
            cz = room.floor_z + FLOOR_T + 0.34
            put("console", [fbox(e.A, e.u, e.n, lo + 0.1, hi - 0.1, 0.0, 0.4, cz, cz + 0.32)], pal.vanity, 0.003)
            put("console-glow", [fbox(e.A, e.u, e.n, lo + 0.12, hi - 0.12, 0.03, 0.37, cz - 0.014, cz - 0.002)], pal.led, 0.0)
            # a recessed niche's worth of depth reads behind a hidden shelf light above the TV zone
            put("wash", [fbox(e.A, e.u, e.n, lo + side, hi - side, 0.03, 0.06, zb1 - 0.02, zb1)], pal.led, 0.0)
        elif kind == "headboard":
            # a linen-covered panel with brass channel inlays, flanked by dark reveals
            put("backer", [fbox(e.A, e.u, e.n, lo - 0.03, hi + 0.03, 0.0, 0.012, zb0, zb1)], pal.dark, 0.002)
            put("fabric", [fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.028, zb0, zb1)], pal.fabric, 0.004)
            n_in = 3
            put("brass", brass(*[lo + span * (k + 1) / (n_in + 1) for k in range(n_in)]) +
                [fbox(e.A, e.u, e.n, lo - 0.012, lo, 0.0, 0.034, zb0, zb1), fbox(e.A, e.u, e.n, hi, hi + 0.012, 0.0, 0.034, zb0, zb1)], pal.brass)
            put("glow", [fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.05, zb1, zb1 + 0.02)], pal.led, 0.0)
        else:
            put("backer", [fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.012, zb0, zb1)], pal.dark, 0.002)
            put("slats", timber(lo, hi), pal.slat, 0.002)
            put("glow", [fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.03, zb1, zb1 + 0.02)], pal.led, 0.0)
            put("brass", [fbox(e.A, e.u, e.n, lo - 0.012, lo, 0.0, 0.052, zb0, zb1), fbox(e.A, e.u, e.n, hi, hi + 0.012, 0.0, 0.052, zb0, zb1)],
                pal.brass)

    def _modern_feature(self, room, e, s0, s1, kind, col):
        """Floor-to-ceiling feature walls, washed by a light slot in the ceiling just off the wall:
            travertine    vein-cut stone slabs with fine joints
            fluted-tight  close timber flutes on a dark ground
            oak-panel     oak veneer boards, with a lit reveal at headboard height unless `lightLine` is false
        `featureAll` covers every solid stretch of the chosen wall; otherwise one stretch of `featureSpan`."""
        pal, spec = self.palette, room.spec
        self.featured[room.id] = e
        if spec.get("featureAll"):
            spans = [(a, b) for a, b in self._union(self._solid_spans(e)) if b - a > 0.3]
        else:
            span = min(spec.get("featureSpan", s1 - s0), s1 - s0)
            mid = (s0 + s1) / 2
            spans = [(mid - span / 2, mid + span / 2)]
        z0, z1 = room.floor_z + FLOOR_T, room.ceil_z - 0.003
        mat = pal.named(spec.get("featureMaterial", {"travertine": "travertine", "fluted-tight": "oak", "oak-panel": "oak"}[kind]))
        backer, faces, glow, joints = [], [], [], []
        for lo, hi in spans:
            if kind == "travertine":
                # slabs about 1.2 m wide, set in two courses with a hairline joint between them
                count = max(1, round((hi - lo) / 1.2))
                w = (hi - lo) / count
                split = z0 + (z1 - z0) * 0.5
                for k in range(count):
                    a0, a1 = lo + k * w + 0.0012, lo + (k + 1) * w - 0.0012
                    faces.append(fbox(e.A, e.u, e.n, a0, a1, 0.0, 0.022, z0, split - 0.0012))
                    faces.append(fbox(e.A, e.u, e.n, a0, a1, 0.0, 0.022, split + 0.0012, z1))
                joints.append(fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.016, z0, z1))
            elif kind == "fluted-tight":
                backer.append(fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.01, z0, z1))
                pitch, fw = 0.032, 0.022
                count = int((hi - lo) / pitch)
                start = lo + ((hi - lo) - count * pitch) / 2 + (pitch - fw) / 2
                faces += [fbox(e.A, e.u, e.n, start + k * pitch, start + k * pitch + fw, 0.008, 0.03, z0, z1) for k in range(count)]
            else:
                line = spec.get("lightLine", True)
                zl = room.floor_z + spec.get("lightLineHeight", 1.15)
                count = max(1, round((hi - lo) / 0.6))
                w = (hi - lo) / count
                for k in range(count):
                    a0, a1 = lo + k * w + 0.001, lo + (k + 1) * w - 0.001
                    if line:
                        faces.append(fbox(e.A, e.u, e.n, a0, a1, 0.0, 0.026, z0, zl - 0.012))
                        faces.append(fbox(e.A, e.u, e.n, a0, a1, 0.0, 0.026, zl + 0.012, z1))
                    else:
                        faces.append(fbox(e.A, e.u, e.n, a0, a1, 0.0, 0.026, z0, z1))
                backer.append(fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.014, z0, z1))
                if line:  # the strip glows on its own; the slot above does the lighting
                    glow.append(fbox(e.A, e.u, e.n, lo, hi, 0.0, 0.016, zl - 0.006, zl + 0.006))
            if spec.get("featureWash", True):
                # a slot in the ceiling just off the wall grazes light down its face
                glow.append(fbox(e.A, e.u, e.n, lo + 0.05, hi - 0.05, 0.09, 0.12, room.ceil_z - 0.005, room.ceil_z - 0.003))
                a = e.A + e.u * ((lo + hi) / 2) + e.n * 0.12
                self.lights.append({"kind": "wash", "room": room.id, "at": (a.x, a.y, room.ceil_z - 0.02), "length": max(0.3, hi - lo - 0.1),
                                    "angle": math.atan2(e.u.y, e.u.x)})
        for name, boxes, m in (("backer", backer, pal.dark), ("joints", joints, pal.dark), ("face", faces, mat), ("glow", glow, pal.led)):
            if boxes:
                solid(f"feature-{name}-{room.id}", boxes, m, col, bevel=0.0015 if name == "face" else 0.0, role="interior")

    def panelling(self, room, col):
        """Slim raised picture-frame mouldings, painted the wall's own colour, on the plain stretches of the walls."""
        pal = self.palette
        frames = []
        z0, z1 = room.floor_z + 0.28, min(room.ceil_z - 0.32, room.floor_z + 2.35)
        for e in room.edges:
            if e.open or self.featured.get(room.id) is e:
                continue
            for s0, s1 in self._solid_spans(e):
                if s1 - s0 < 1.1 or not self._clear_of_fixtures(room, e, s0 + 0.2, s1 - 0.2, depth=0.1):
                    continue
                count = max(1, int((s1 - s0 - 0.3) / 1.05))
                pw = (s1 - s0 - 0.3) / count
                for i in range(count):
                    a0 = s0 + 0.15 + i * pw + 0.07
                    a1 = s0 + 0.15 + (i + 1) * pw - 0.07
                    f = 0.03
                    # bars butt against each other rather than overlap, so no coincident faces show at the corners
                    for (p0, p1, q0, q1) in ((a0, a1, z0, z0 + f), (a0, a1, z1 - f, z1), (a0, a0 + f, z0 + f, z1 - f), (a1 - f, a1, z0 + f, z1 - f)):
                        frames.append(fbox(e.A, e.u, e.n, p0, p1, 0.004, 0.018, q0, q1))
        if frames:
            solid(f"panelling-{room.id}", frames, pal.wall, col, bevel=0.002, role="interior")


def seg_dist(pt, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (pt - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (pt - (a + ab * t)).length


def geometry_piece_box(piece, grow):
    from .util import piece_box
    return piece_box(piece, grow=grow, grow_ends=0.0)


# ---------------------------------------------------------------- scene-level pieces
def split_world(fill, warm=(1.0, 0.95, 0.88)):
    """The camera and the windows still see the sky; light bounced in from it is dimmer and warmer, so a closed
    room is lit by its sun patch and its own lights rather than a flat blue wash."""
    world = bpy.data.worlds["noor-sky"]
    nt = world.node_tree
    sky = nt.nodes["sky"]
    out = next(n for n in nt.nodes if n.type == "OUTPUT_WORLD")
    tod = nt.nodes["tod"]
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type, tint.blend_type = "RGBA", "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs["B"].default_value = (*warm, 1)
    nt.links.new(tod.outputs["Result"], tint.inputs["A"])
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = fill
    nt.links.new(tint.outputs["Result"], bg.inputs["Color"])
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg.outputs[0], mix.inputs[1])
    nt.links.new(sky.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])


def drop_backplates():
    """The cards behind windows that stop them reading as voids from outside would block the view from inside."""
    bp = bpy.data.objects.get("interior-backplates")
    if bp:
        bpy.data.objects.remove(bp)


def build(design, root, cfg):
    return Interior(design, root, cfg)
