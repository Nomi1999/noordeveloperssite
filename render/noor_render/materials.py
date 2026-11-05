"""Material tags → physically based node materials.

Textures are box-projected in object space. Scene objects are built in world
coordinates with identity transforms, so this is world-space triplanar mapping:
pieces that rise, slice or grow never stretch their textures.

Every material ends in the shared reveal group, which reads per-object attributes
set by construction.py:
    cover        0 = fully built, 1 = not started
    ax, ay, az   reveal axis (0, 0, 1 rises from the bottom, 0, 0, -1 skins from the top)
    v0, v1       the object's extent along that axis
    course       quantization of the cut (brick courses), meters
    jitter       noise on the cut edge, meters
"""

import os

import bpy

from . import assets

ACCENT = (0.888, 0.396, 0.044)  # --noor #f2a93b in linear sRGB
WARM_INTERIOR = (1.0, 0.70, 0.42)  # ≈3000K, pulled slightly toward the accent

# tex: texture id; size: tile size (m); tint: linear RGB multiplier; sat: saturation;
# rough: (scale, bias) applied to the roughness map; bump: strength; top: texture for upward faces
T = lambda tex, size, tint=(1, 1, 1), sat=1.0, rough=(1.0, 0.0), bump=0.2, top=None: dict(
    tex=tex, size=size, tint=tint, sat=sat, rough=rough, bump=bump, top=top)
TEXTURED = {
    "plaster-white": T("white_stucco", 2.0, (1.0, 1.0, 1.0), sat=0.35, rough=(1.0, 0.05), bump=0.12),
    "plaster-warm-grey": T("painted_plaster_wall", 2.4, (0.66, 0.645, 0.62), sat=0.45, bump=0.1),
    "stone-cladding": T("granite_wall", 1.9, (0.78, 0.78, 0.8), sat=0.35, bump=0.45),
    "wood-panel": T("oak_wood_planks", 1.4, (0.95, 0.85, 0.75), sat=0.9, rough=(0.9, 0.0), bump=0.15),
    "exposed-concrete": T("wood_textured_concrete", 1.8, (1.05, 1.05, 1.05), sat=0.15, bump=0.25,
                          top="concrete_wall_006"),
    "brick-structure": T("red_brick", 1.4, bump=0.5),
    # Thin terracotta brick tiles: the same texture as the structure's brick, smaller and warmer
    "brick-cladding": T("red_brick", 0.9, (1.08, 0.86, 0.72), sat=1.0, rough=(0.95, 0.0), bump=0.3),
    "plaster-charcoal": T("painted_plaster_wall", 2.4, (0.13, 0.13, 0.135), sat=0.2, rough=(0.95, 0.0), bump=0.12),
    "porcelain-paving": T("large_floor_tiles_02", 3.0, (1.1, 1.08, 1.05), sat=0.4, rough=(0.45, 0.0), bump=0.15),
    "paving-stone": T("concrete_pavement", 1.8, (1.0, 0.98, 0.95), sat=0.6, bump=0.3),
    "grass": T("leafy_grass", 2.0, (0.5, 0.78, 0.36), sat=1.0, rough=(1.0, 0.05), bump=0.3),
    "planter-soil": T("farm_soil", 1.5, bump=0.4),
    # context and construction tags (not in the design vocabulary)
    "asphalt": T("asphalt_02", 3.0, (0.8, 0.8, 0.82), sat=0.3, bump=0.25),
    "footpath": T("concrete_pavement", 1.8, (0.9, 0.9, 0.9), sat=0.3, bump=0.3),
    "kerb": T("concrete_wall_006", 1.2, (1.05, 1.05, 1.05), sat=0.2, bump=0.1),
    "soil": T("dirt", 2.0, (1.0, 0.95, 0.9), bump=0.4),
    "neighbour": T("painted_plaster_wall", 3.0, (0.55, 0.54, 0.53), sat=0.25, rough=(1.0, 0.05), bump=0.05),
}

HAZED = {"asphalt", "footpath", "kerb", "soil", "neighbour", "neighbour-window"}

_cache = {}
_clay = None


def reset():
    global _clay
    _cache.clear()
    _clay = None


# ---- reveal ----

def _attr(nodes, name, kind="OBJECT"):
    a = nodes.new("ShaderNodeAttribute")
    a.attribute_type = kind
    a.attribute_name = name
    return a.outputs["Fac"]


def _math(ng, op, a, b=None, clamp=False):
    n = ng.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            ng.links.new(v, n.inputs[i])
    return n.outputs[0]


def reveal_group():
    ng = bpy.data.node_groups.get("noor-reveal")
    if ng:
        return ng
    ng = bpy.data.node_groups.new("noor-reveal", "ShaderNodeTree")
    ng.interface.new_socket("Alpha", in_out="OUTPUT", socket_type="NodeSocketFloat")
    ng.interface.new_socket("Fresh", in_out="OUTPUT", socket_type="NodeSocketFloat")
    n = ng.nodes
    out = n.new("NodeGroupOutput")
    geo = n.new("ShaderNodeNewGeometry")
    cover, v0, v1 = _attr(n, "cover"), _attr(n, "v0"), _attr(n, "v1")
    course, jitter = _attr(n, "course"), _attr(n, "jitter")
    comb = n.new("ShaderNodeCombineXYZ")
    for i, k in enumerate("xyz"):
        ng.links.new(_attr(n, "a" + k), comb.inputs[i])
    dot = n.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    ng.links.new(geo.outputs["Position"], dot.inputs[0])
    ng.links.new(comb.outputs[0], dot.inputs[1])
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.5
    noise.inputs["Detail"].default_value = 3
    ng.links.new(geo.outputs["Position"], noise.inputs["Vector"])
    v = _math(ng, "ADD", dot.outputs["Value"], _math(ng, "MULTIPLY", _math(ng, "SUBTRACT", noise.outputs["Fac"], 0.5), jitter))
    # cut = v0 + floor((1 - cover)(v1 - v0) / course) * course
    span = _math(ng, "SUBTRACT", v1, v0)
    reach = _math(ng, "MULTIPLY", _math(ng, "SUBTRACT", 1.0, cover), span)
    step = _math(ng, "MAXIMUM", course, 1e-4)
    cut = _math(ng, "ADD", v0, _math(ng, "MULTIPLY", _math(ng, "FLOOR", _math(ng, "DIVIDE", reach, step)), step))
    below = _math(ng, "LESS_THAN", v, _math(ng, "ADD", cut, 1e-4))
    done = _math(ng, "LESS_THAN", cover, 1e-5)
    alpha = _math(ng, "MAXIMUM", below, done)
    building = _math(ng, "SUBTRACT", 1.0, done)
    near = _math(ng, "GREATER_THAN", v, _math(ng, "SUBTRACT", cut, 0.018))
    fresh = _math(ng, "MULTIPLY", _math(ng, "MULTIPLY", near, below), building)
    ng.links.new(alpha, out.inputs["Alpha"])
    ng.links.new(fresh, out.inputs["Fresh"])
    return ng


def _finish(mat, bsdf, fresh_strength=4.0):
    """Wire the reveal into a Principled BSDF's alpha and a bright fresh-edge emission."""
    nt = mat.node_tree
    rg = nt.nodes.new("ShaderNodeGroup")
    rg.node_tree = reveal_group()
    nt.links.new(rg.outputs["Alpha"], bsdf.inputs["Alpha"])
    strength = nt.nodes.new("ShaderNodeMath")
    strength.operation = "MULTIPLY"
    strength.inputs[1].default_value = fresh_strength
    # the fresh edge is a drawn accent, not a light: seen by the camera only, so in Cycles it
    # doesn't wash the walls around a thin rising soffit in orange
    camera = nt.nodes.new("ShaderNodeLightPath")
    fresh = nt.nodes.new("ShaderNodeMath")
    fresh.operation = "MULTIPLY"
    nt.links.new(rg.outputs["Fresh"], fresh.inputs[0])
    nt.links.new(camera.outputs["Is Camera Ray"], fresh.inputs[1])
    nt.links.new(fresh.outputs[0], strength.inputs[0])
    if not bsdf.inputs["Emission Strength"].is_linked and bsdf.inputs["Emission Strength"].default_value == 0:
        bsdf.inputs["Emission Color"].default_value = (*ACCENT, 1)
        nt.links.new(strength.outputs[0], bsdf.inputs["Emission Strength"])
    mat.surface_render_method = "DITHERED"
    mat.use_transparent_shadow = True
    mat["reveal"] = True
    return mat


def _new(name):
    mat = bpy.data.materials.new(name)
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return mat, nt, bsdf


# ---- distance haze for the context ----

def haze_group():
    """Shader in, shader out, blended toward a sky-colored haze with camera distance.

    lighting.py sets the nodes named "density" and "color".
    """
    ng = bpy.data.node_groups.get("noor-haze")
    if ng:
        return ng
    ng = bpy.data.node_groups.new("noor-haze", "ShaderNodeTree")
    ng.interface.new_socket("Shader", in_out="INPUT", socket_type="NodeSocketShader")
    ng.interface.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")
    n = ng.nodes
    gi, go = n.new("NodeGroupInput"), n.new("NodeGroupOutput")
    cam = n.new("ShaderNodeCameraData")
    density = n.new("ShaderNodeValue")
    density.name = "density"
    color = n.new("ShaderNodeRGB")
    color.name = "color"
    d = _math(ng, "MULTIPLY", cam.outputs["View Distance"], density.outputs[0])
    fac = _math(ng, "SUBTRACT", 1.0, _math(ng, "EXPONENT", _math(ng, "MULTIPLY", d, -1.0)))
    emit = n.new("ShaderNodeEmission")
    ng.links.new(color.outputs[0], emit.inputs["Color"])
    mix = n.new("ShaderNodeMixShader")
    ng.links.new(fac, mix.inputs["Fac"])
    ng.links.new(gi.outputs[0], mix.inputs[1])
    ng.links.new(emit.outputs[0], mix.inputs[2])
    ng.links.new(mix.outputs[0], go.inputs[0])
    return ng


def _hazed(mat):
    nt = mat.node_tree
    out = nt.nodes["Material Output"]
    src = out.inputs["Surface"].links[0].from_socket
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = haze_group()
    nt.links.new(src, g.inputs[0])
    nt.links.new(g.outputs[0], out.inputs["Surface"])
    return mat


# ---- textured PBR ----

def _image(path, color):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = "sRGB" if color else "Non-Color"
    return img


def _tex(nt, vec, path, color):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = _image(path, color)
    t.projection = "BOX"
    t.projection_blend = 0.2
    t.interpolation = "Cubic" if color else "Linear"
    nt.links.new(vec, t.inputs["Vector"])
    return t


def _layer(nt, vec, tex_id):
    files = {m: assets.require(tex_id, f"textures/{tex_id}/{m}.jpg") for m in ("diff", "rough", "disp")}
    return (_tex(nt, vec, files["diff"], True).outputs["Color"], _tex(nt, vec, files["rough"], False).outputs["Color"],
            _tex(nt, vec, files["disp"], False).outputs["Color"])


def _mix(nt, kind, fac, a, b):
    m = nt.nodes.new("ShaderNodeMix")
    m.data_type = kind
    nt.links.new(fac, m.inputs["Factor"])
    nt.links.new(a, m.inputs["A"])
    nt.links.new(b, m.inputs["B"])
    return m.outputs["Result"]


def textured(tag):
    spec = TEXTURED[tag]
    mat, nt, bsdf = _new(tag)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1 / spec["size"],) * 3
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    vec = mapping.outputs[0]
    color, rough, disp = _layer(nt, vec, spec["tex"])
    if spec["top"]:
        # upward faces (slab tops, roofs) take a plain texture; board marks belong on vertical faces
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Normal"], sep.inputs[0])
        up = nt.nodes.new("ShaderNodeMapRange")
        up.inputs["From Min"].default_value, up.inputs["From Max"].default_value = 0.6, 0.8
        nt.links.new(sep.outputs["Z"], up.inputs["Value"])
        top_map = nt.nodes.new("ShaderNodeMapping")
        top_map.inputs["Scale"].default_value = (1 / 4.5,) * 3  # large roofs show any repeat
        nt.links.new(coord.outputs["Object"], top_map.inputs["Vector"])
        tc, tr, td = _layer(nt, top_map.outputs[0], spec["top"])
        color = _mix(nt, "RGBA", up.outputs["Result"], color, tc)
        rough = _mix(nt, "FLOAT", up.outputs["Result"], rough, tr)
        disp = _mix(nt, "FLOAT", up.outputs["Result"], disp, td)

    # saturation, tint and slow macro variation so large walls don't show tiling
    hsv = nt.nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Saturation"].default_value = spec["sat"]
    nt.links.new(color, hsv.inputs["Color"])
    tinted = nt.nodes.new("ShaderNodeMix")
    tinted.data_type, tinted.blend_type = "RGBA", "MULTIPLY"
    tinted.inputs["Factor"].default_value = 1.0
    nt.links.new(hsv.outputs["Color"], tinted.inputs["A"])
    tinted.inputs["B"].default_value = (*spec["tint"], 1)
    macro = nt.nodes.new("ShaderNodeTexNoise")
    macro.inputs["Scale"].default_value = 0.18
    macro.inputs["Detail"].default_value = 2
    nt.links.new(coord.outputs["Object"], macro.inputs["Vector"])
    vary = nt.nodes.new("ShaderNodeMix")
    vary.data_type, vary.blend_type = "RGBA", "MULTIPLY"
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.35, 0.65
    ramp.inputs["To Min"].default_value, ramp.inputs["To Max"].default_value = 0.0, 0.12
    nt.links.new(macro.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], vary.inputs["Factor"])
    nt.links.new(tinted.outputs["Result"], vary.inputs["A"])
    vary.inputs["B"].default_value = (0.84, 0.83, 0.82, 1)
    nt.links.new(vary.outputs["Result"], bsdf.inputs["Base Color"])

    scale, bias = spec["rough"]
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value = bias
    r.inputs["To Max"].default_value = min(1.0, scale + bias)
    nt.links.new(rough, r.inputs["Value"])
    nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])

    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = spec["bump"]
    b.inputs["Distance"].default_value = 0.01
    nt.links.new(disp, b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])

    if tag == "wood-panel":
        bsdf.inputs["Coat Weight"].default_value = 0.25
        bsdf.inputs["Coat Roughness"].default_value = 0.3
    if tag == "porcelain-paving":
        bsdf.inputs["Specular IOR Level"].default_value = 0.6
    _finish(mat, bsdf)
    return _hazed(mat) if tag in HAZED else mat


# ---- procedural ----

def metal_dark():
    mat, nt, bsdf = _new("metal-dark")
    bsdf.inputs["Base Color"].default_value = (0.042, 0.038, 0.034, 1)  # dark bronze-charcoal
    bsdf.inputs["Metallic"].default_value = 1.0
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 40
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = 0.31, 0.4
    nt.links.new(noise.outputs["Fac"], r.inputs["Value"])
    nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
    return _finish(mat, bsdf)


def glass(tag):
    """A thin pane: seen straight through (tinted, no refraction offset) plus the surface's reflection.

    Built from a Transparent BSDF rather than transmission so the room behind shows the same way in
    EEVEE without ray tracing (where refraction falls back to the sky probe) and in Cycles.
    """
    mat, nt, bsdf = _new(tag)
    tint = (0.86, 0.92, 0.91, 1) if tag == "glass-clear" else (0.42, 0.5, 0.52, 1)
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Roughness"].default_value = 0.02
    bsdf.inputs["IOR"].default_value = 1.52
    _finish(mat, bsdf, fresh_strength=0.0)
    clear = nt.nodes.new("ShaderNodeBsdfTransparent")
    clear.inputs["Color"].default_value = tint
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(clear.outputs[0], add.inputs[0])
    nt.links.new(bsdf.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    mat.surface_render_method = "BLENDED"  # dithering a ~90% transparent pane leaves visible noise at preview samples
    return mat


def hedge():
    mat, nt, bsdf = _new("hedge")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 28
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3
    for t in (vor, noise):
        nt.links.new(coord.outputs["Object"], t.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.018, 0.045, 0.012, 1)
    ramp.color_ramp.elements[1].color = (0.09, 0.16, 0.04, 1)
    mixf = nt.nodes.new("ShaderNodeMath")
    mixf.operation = "MULTIPLY"
    nt.links.new(vor.outputs["Distance"], mixf.inputs[0])
    nt.links.new(noise.outputs["Fac"], mixf.inputs[1])
    nt.links.new(mixf.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Subsurface Weight"].default_value = 0.15
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.9
    b.inputs["Distance"].default_value = 0.03
    nt.links.new(vor.outputs["Distance"], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return _finish(mat, bsdf, fresh_strength=0.0)


def backplate():
    """Interior impression behind glazing: a dim warm room by day, glowing at dusk.

    Emission strength and tint are set by lighting.apply through the nodes named "glow" and "warmth".
    """
    mat, nt, bsdf = _new("interior-backplate")
    nt.nodes.remove(bsdf)
    out = nt.nodes["Material Output"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["UV"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")  # floor → ceiling falloff
    ramp.color_ramp.elements[0].color = (0.18, 0.12, 0.08, 1)
    ramp.color_ramp.elements[1].color = (1.0, 0.86, 0.68, 1)
    ramp.color_ramp.elements[1].position = 0.85
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    blobs = nt.nodes.new("ShaderNodeTexNoise")  # soft shapes suggesting furniture and lamps
    blobs.inputs["Scale"].default_value = 2.2
    blobs.inputs["Detail"].default_value = 1
    nt.links.new(coord.outputs["Object"], blobs.inputs["Vector"])
    shade = nt.nodes.new("ShaderNodeMix")
    shade.data_type, shade.blend_type = "RGBA", "MULTIPLY"
    shade.inputs["Factor"].default_value = 0.35
    nt.links.new(ramp.outputs["Color"], shade.inputs["A"])
    nt.links.new(blobs.outputs["Color"], shade.inputs["B"])
    dim = nt.nodes.new("ShaderNodeMix")  # by day a room seen through glass is much darker than the facade
    dim.data_type, dim.blend_type = "RGBA", "MULTIPLY"
    dim.inputs["Factor"].default_value = 1.0
    nt.links.new(shade.outputs["Result"], dim.inputs["A"])
    dim.inputs["B"].default_value = (0.3, 0.3, 0.3, 1)
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    nt.links.new(dim.outputs["Result"], diffuse.inputs["Color"])
    emit = nt.nodes.new("ShaderNodeEmission")
    warm = nt.nodes.new("ShaderNodeMix")
    warm.data_type, warm.blend_type = "RGBA", "MULTIPLY"
    warm.name = "warmth"  # 0: the room's own dim tones by day, 1: lit warm white at dusk
    warm.inputs["Factor"].default_value = 1.0
    nt.links.new(shade.outputs["Result"], warm.inputs["A"])
    warm.inputs["B"].default_value = (*WARM_INTERIOR, 1)
    nt.links.new(warm.outputs["Result"], emit.inputs["Color"])
    glow = nt.nodes.new("ShaderNodeValue")
    glow.name = "glow"
    glow.outputs[0].default_value = 0.0
    nt.links.new(glow.outputs[0], emit.inputs["Strength"])
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(diffuse.outputs[0], add.inputs[0])
    nt.links.new(emit.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return mat


def blueprint():
    """Emissive accent linework for phase 0. Strength is set through the node named "glow"."""
    mat, nt, bsdf = _new("blueprint")
    nt.nodes.remove(bsdf)
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (*ACCENT, 1)
    glow = nt.nodes.new("ShaderNodeValue")
    glow.name = "glow"
    glow.outputs[0].default_value = 6.0
    nt.links.new(glow.outputs[0], emit.inputs["Strength"])
    transparent = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    fade = nt.nodes.new("ShaderNodeValue")
    fade.name = "opacity"
    fade.outputs[0].default_value = 1.0
    nt.links.new(fade.outputs[0], mix.inputs["Fac"])
    nt.links.new(transparent.outputs[0], mix.inputs[1])
    nt.links.new(emit.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    mat.surface_render_method = "BLENDED"
    return mat


def neighbour_window():
    """Dark glazing on the context houses; at dusk some windows glow warm, scaled by the node named "glow"."""
    mat, nt, bsdf = _new("neighbour-window")
    bsdf.inputs["Base Color"].default_value = (0.09, 0.095, 0.1, 1)
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Emission Color"].default_value = (*WARM_INTERIOR, 1)
    glow = nt.nodes.new("ShaderNodeValue")
    glow.name = "glow"
    lit = nt.nodes.new("ShaderNodeAttribute")  # per-window 0 (dark) or brightness, set by site.py
    lit.attribute_name = "lit"
    strength = nt.nodes.new("ShaderNodeMath")
    strength.operation = "MULTIPLY"
    nt.links.new(glow.outputs[0], strength.inputs[0])
    nt.links.new(lit.outputs["Fac"], strength.inputs[1])
    nt.links.new(strength.outputs[0], bsdf.inputs["Emission Strength"])
    return _hazed(mat)


def clay_material():
    global _clay
    if _clay is None:
        mat, nt, bsdf = _new("clay")
        bsdf.inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1)
        bsdf.inputs["Roughness"].default_value = 0.75
        _clay = _finish(mat, bsdf)
    return _clay


_SPECIAL = {
    "metal-dark": metal_dark,
    "glass-clear": lambda: glass("glass-clear"),
    "glass-tinted": lambda: glass("glass-tinted"),
    "hedge": hedge,
    "backplate": backplate,
    "blueprint": blueprint,
    "neighbour-window": neighbour_window,
}


def get(tag):
    if tag not in _cache:
        if tag in _SPECIAL:
            _cache[tag] = _SPECIAL[tag]()
        elif tag in TEXTURED:
            _cache[tag] = textured(tag)
        else:
            raise KeyError(f"No material for tag '{tag}'")
    return _cache[tag]


def apply_clay(keep_glass=False):
    """Replace every building, site and context material with one grey (geometry checks)."""
    clay = clay_material()
    keep = {"blueprint", "backplate", "clay"} | ({"glass-clear", "glass-tinted"} if keep_glass else set())
    for obj in bpy.data.objects:
        if obj.type not in {"MESH", "CURVE"} or obj.get("vegetation") or obj.get("keep_material"):
            continue
        for slot in obj.material_slots:
            if slot.material and slot.material.name.split(".")[0] not in keep:
                slot.material = clay
        if obj.type == "MESH":
            mats = obj.data.materials
            for i, m in enumerate(mats):
                if m and m.name.split(".")[0] not in keep:
                    mats[i] = clay
