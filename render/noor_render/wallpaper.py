"""Wallpapers for finished rooms: tileable patterns drawn with numpy, then wrapped in a material.

The patterns are drawn here, not downloaded, so they need no licence and can be previewed without Blender:

    python render/noor_render/wallpaper.py <palette-config.json> <out.png>      # a contact sheet of every paper

Every pattern is a `tile(cfg)` function returning three float arrays shaped (rows, cols), row 0 at the bottom of the
tile as in a Blender image: `color` (rows, cols, 3, linear RGB), `height` (0..1, for bump) and `rough`.
`material()` is the only function that needs Blender. See design D3 of the add-10-marla-walkthrough change.

Paper config (the palette's `papers`):
    kind      fan | ribbed | geo | grasscloth | stripe | herringbone (a floor: `a`, `b` tones, `plank` width in metres)
    ground    linear RGB of the ground
    line      linear RGB of the printed line, flute crown or second stripe (where the kind has one)
    repeat    the pattern repeat in metres: one number (width), the height following from the kind
    rough     roughness of the ground; `lineRough` of the printed line (foil prints are shinier)
    ppm       pixels per metre of the tile (default fits the tile in 1024 px)
    seed      for the woven kind
"""

import math

import numpy as np

DEFAULT_PX = 1024


def _smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _line(dist, half, aa):
    """1 on a line of half-width `half` around dist == 0, with an anti-aliased edge `aa` wide (all in metres)."""
    return 1.0 - _smooth(half - aa / 2, half + aa / 2, np.abs(dist))


def _grid(cfg, tile_w, tile_h):
    """Metre coordinates of every pixel centre of a tile (y up) and the size of a pixel."""
    ppm = cfg.get("ppm") or min(2048.0, DEFAULT_PX / max(tile_w, tile_h))
    cols, rows = max(8, round(tile_w * ppm)), max(8, round(tile_h * ppm))
    x = (np.arange(cols) + 0.5) / cols * tile_w
    y = (np.arange(rows) + 0.5) / rows * tile_h
    xx, yy = np.meshgrid(x, y)
    return xx, yy, tile_w / cols


def _rgb(c):
    return np.array(c, dtype=float).reshape(1, 1, 3)


def _mix(a, b, f):
    return a * (1 - f[..., None]) + b * f[..., None]


# ---------------------------------------------------------------- patterns
def fan(cfg):
    """Art-deco fans: rows of overlapping circles, each drawn as concentric rings, the lowest row on top so the fans open upward."""
    w = cfg["repeat"]
    r_out = w / 2
    hh = r_out / 2  # row pitch
    xx, yy, px = _grid(cfg, w, 4 * hh)
    own = np.full(xx.shape, 9.0)  # distance to the centre of the circle that shows, as a fraction of its radius
    for k in range(5, -4, -1):  # the highest row first, overwritten by every lower one that reaches the point
        off = (k % 2) * w / 2
        cx = np.round((xx - off) / w) * w + off
        d = np.hypot(xx - cx, yy - k * hh) / r_out
        own = np.where(d < 1.0, d, own)
    ground, line = _rgb(cfg["ground"]), _rgb(cfg["line"])
    band = np.floor(np.clip(own, 0, 0.999) * 4)
    fill = _mix(ground, ground * 0.82 + line * 0.18, (band % 2))  # alternate rings a touch deeper
    ring = np.zeros_like(own)
    for t, half in ((0.25, 0.0008), (0.5, 0.0008), (0.75, 0.0008), (1.0, 0.0016)):
        ring = np.maximum(ring, _line((own - t) * r_out, half, px * 1.5))
    ring = np.maximum(ring, _line(own * r_out, 0.0016, px * 1.5))  # the dot at the centre
    colour = _mix(fill, line, ring)
    return colour, ring * 0.35, np.where(ring > 0.5, cfg.get("lineRough", 0.3), cfg.get("rough", 0.65)) * np.ones_like(ring)


def ribbed(cfg):
    """Fine vertical flutes: half-round ribs with a slightly lighter crown."""
    p = cfg["repeat"]
    xx, yy, px = _grid(cfg, p, p)
    f = (xx / p) % 1.0
    h = np.sqrt(np.clip(1 - (2 * f - 1) ** 2, 0, 1))
    ground = _rgb(cfg["ground"])
    line = _rgb(cfg.get("line", cfg["ground"]))
    colour = _mix(ground * 0.9, line, h**3)
    return colour, h, np.full(h.shape, cfg.get("rough", 0.5)) - 0.12 * h


def stripe(cfg):
    """A tonal stripe: a wide matte band and a narrow satin one, with a pinstripe where they meet."""
    p = cfg["repeat"]
    xx, yy, px = _grid(cfg, p, p / 4)
    f = (xx / p) % 1.0
    satin = (f > 0.82).astype(float)
    satin = np.clip(satin, 0, 1) * _smooth(0.82, 0.825, f) * (1 - _smooth(0.995, 1.0, f))
    pin = _line((f - 0.82) * p, 0.0008, px * 1.5)
    ground, line = _rgb(cfg["ground"]), _rgb(cfg["line"])
    colour = _mix(_mix(ground, line, satin), ground * 0.8 + line * 0.2, pin)
    rough = cfg.get("rough", 0.85) * (1 - satin) + cfg.get("lineRough", 0.35) * satin
    return colour, satin * 0.25 + pin * 0.2, rough


def geo(cfg):
    """A diamond trellis with a bead where the lines cross and a ring at the centre of each diamond."""
    w = cfg["repeat"]
    xx, yy, px = _grid(cfg, w, w)
    u, v = xx / w, yy / w
    s, t = (u + v) % 1.0, (u - v) % 1.0
    ds = np.minimum(s, 1 - s) * w / math.sqrt(2)
    dt = np.minimum(t, 1 - t) * w / math.sqrt(2)
    lines = np.maximum(_line(ds, 0.0007, px * 1.5), _line(dt, 0.0007, px * 1.5))
    dots = np.zeros_like(u)
    for cu, cv in ((0, 0), (1, 0), (0, 1), (1, 1), (0.5, 0.5)):  # where the diagonals cross
        dots = np.maximum(dots, _line(np.hypot(xx - cu * w, yy - cv * w) - 0.0, 0.006, px * 1.5))
    rings = np.zeros_like(u)
    for cu, cv in ((0.5, 0), (0.5, 1), (0, 0.5), (1, 0.5)):  # the diamond centres
        dist = np.hypot(xx - cu * w, yy - cv * w)
        rings = np.maximum(rings, _line(dist - 0.014, 0.0007, px * 1.5))
    ground, line = _rgb(cfg["ground"]), _rgb(cfg["line"])
    mark = np.maximum(lines * 0.7, np.maximum(dots, rings))
    colour = _mix(ground, line, mark)
    return colour, mark * 0.3, cfg.get("rough", 0.55) - 0.25 * mark


def grasscloth(cfg):
    """Woven grasscloth: horizontal strands that each carry their own tone, with slubs, joined by fine vertical weft."""
    t = cfg["repeat"]
    xx, yy, px = _grid(cfg, t, t)
    rows, cols = xx.shape
    rng = np.random.default_rng(cfg.get("seed", 7))
    pitch = cfg.get("strand", 0.0022)
    n = max(1, round(t / pitch))
    strand = np.minimum((yy / t * n).astype(int), n - 1)
    tone = rng.uniform(0.78, 1.18, n)
    # slubs: a slow drift along each strand, periodic over the tile so it repeats
    drift = np.zeros((n, cols))
    xs = np.arange(cols) / cols * 2 * np.pi
    for harmonic in (2, 3, 5, 9, 14):
        amp = rng.uniform(0.02, 0.09, (n, 1)) * (3.0 / harmonic) ** 0.5
        drift += amp * np.sin(harmonic * xs[None, :] + rng.uniform(0, 2 * np.pi, (n, 1)))
    shade = tone[strand] + drift[strand, np.arange(cols)[None, :]]
    prof = (yy / t * n) % 1.0
    round_profile = np.sqrt(np.clip(1 - (2 * prof - 1) ** 2, 0, 1))  # each strand is a little cylinder
    weft_n = max(1, round(t / cfg.get("weft", 0.0016)))
    weft = 0.5 + 0.5 * np.cos(2 * np.pi * xx / t * weft_n)
    shade = shade * (0.9 + 0.1 * round_profile) * (0.94 + 0.06 * weft)
    ground = _rgb(cfg["ground"])
    colour = np.clip(ground * shade[..., None], 0, 1.5)
    height = round_profile * 0.8 + weft * 0.2
    return colour, height, np.clip(cfg.get("rough", 0.78) + 0.1 * (1 - round_profile), 0, 1)


def herringbone(cfg):
    """A 90-degree herringbone floor of planks four times as long as wide: each plank its own tone, with grain along it
    and a dark joint round it. The tile is 8 plank-widths square and joins on all sides."""
    w = cfg.get("plank", 0.09)
    size = 8 * w
    xx, yy, px = _grid(cfg, size, size)
    ux, uy = xx / w, yy / w
    ident = np.full(xx.shape, -1)
    edge = np.full(xx.shape, 9.0)  # distance to the nearest plank edge, in metres
    along = np.zeros(xx.shape)  # position along the plank's own length, 0..4
    horiz = np.zeros(xx.shape, dtype=bool)
    planks = []
    for t in range(8):
        planks.append((t, t, 4, 1, True))  # A: horizontal, lower-left at (t, t)
        planks.append((t + 4, t - 3, 1, 4, False))  # B: vertical, lower-left at (t + 4, t - 3)
    for n, (x0, y0, pw, ph, h) in enumerate(planks):
        for dx in (-8, 0, 8):
            for dy in (-8, 0, 8):
                cx, cy = x0 + dx + pw / 2, y0 + dy + ph / 2
                inside_x, inside_y = np.abs(ux - cx) <= pw / 2, np.abs(uy - cy) <= ph / 2
                m = inside_x & inside_y
                d = np.minimum(pw / 2 - np.abs(ux - cx), ph / 2 - np.abs(uy - cy)) * w
                ident = np.where(m, n, ident)
                edge = np.where(m, d, edge)
                along = np.where(m, (ux - (x0 + dx)) if h else (uy - (y0 + dy)), along)
                horiz = np.where(m, h, horiz)
    rng = np.random.default_rng(cfg.get("seed", 11))
    tone = rng.uniform(0, 1, len(planks))
    a, b = _rgb(cfg["a"]), _rgb(cfg["b"])
    t = tone[np.clip(ident, 0, None)]
    base = a * (1 - t[..., None]) + b * t[..., None]
    # grain: thin lines along the plank, from a per-plank phase
    perp = np.where(horiz, uy, ux)
    phase = rng.uniform(0, 100, len(planks))[np.clip(ident, 0, None)]
    grain = 0.5 + 0.5 * np.sin(perp * w * cfg.get("grain", 900.0) + phase + 3.0 * np.sin(along * 1.7 + phase))
    colour = base * (0.9 + 0.2 * grain[..., None])
    joint = 1.0 - _smooth(0.0004, 0.0012, edge)
    colour = colour * (1 - 0.6 * joint[..., None])
    height = (1 - joint) * (0.8 + 0.2 * grain)
    return colour, height, np.clip(cfg.get("rough", 0.36) + 0.1 * grain, 0, 1)


KINDS = {"herringbone": herringbone, "fan": fan, "ribbed": ribbed, "stripe": stripe, "geo": geo, "grasscloth": grasscloth}


def tile_size(cfg):
    """The tile's width and height in metres: the repeat the material scales its coordinates by."""
    if cfg["kind"] == "herringbone":
        return (8 * cfg.get("plank", 0.09),) * 2
    w = cfg["repeat"]
    return {"fan": (w, w), "ribbed": (w, w), "stripe": (w, w / 4), "geo": (w, w), "grasscloth": (w, w)}[cfg["kind"]]


def tile(cfg):
    return KINDS[cfg["kind"]](cfg)


# ---------------------------------------------------------------- Blender
def material(name, cfg, origin_xy, floor_z, floor=False):
    """A paper as a Cycles material. Objects sit in world space, so the pattern starts square at the room's corner:
    the horizontal coordinate runs along whichever axis the wall runs, from `origin_xy`, and the vertical one from the floor.
    A wall that is not on an axis would take a wrong horizontal coordinate, so the caller rejects those rooms."""
    import bpy

    from . import materials

    colour, height, rough = tile(cfg)
    rows, cols = height.shape

    def image(label, data, color):
        img = bpy.data.images.new(f"{name}-{label}", cols, rows, alpha=True, float_buffer=True)
        img.colorspace_settings.name = "Non-Color"  # values are already linear: no colour management on top
        px = np.ones((rows, cols, 4), dtype=np.float32)
        px[..., :3] = data if color else data[..., None]
        img.pixels.foreach_set(px.ravel())
        img.update()
        img.pack()
        return img

    mat, nt, bsdf = materials._new(name)
    geo_node = nt.nodes.new("ShaderNodeNewGeometry")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    pos = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], pos.inputs[0])
    nrm = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo_node.outputs["Normal"], nrm.inputs[0])

    def math_node(op, a, b=None):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                nt.links.new(v, n.inputs[i])
        return n.outputs[0]

    ax, ay = math_node("ABSOLUTE", nrm.outputs["X"]), math_node("ABSOLUTE", nrm.outputs["Y"])
    # a wall facing +-y runs along x; one facing +-x runs along y
    along = math_node("ADD", math_node("MULTIPLY", math_node("SUBTRACT", pos.outputs["X"], origin_xy[0]), ay),
                      math_node("MULTIPLY", math_node("SUBTRACT", pos.outputs["Y"], origin_xy[1]), ax))
    tw, th = tile_size(cfg)
    if floor:  # a floor is laid in plan: both coordinates run along the ground
        u = math_node("DIVIDE", math_node("SUBTRACT", pos.outputs["X"], origin_xy[0]), tw)
        v = math_node("DIVIDE", math_node("SUBTRACT", pos.outputs["Y"], origin_xy[1]), th)
    else:
        u = math_node("DIVIDE", along, tw)
        v = math_node("DIVIDE", math_node("SUBTRACT", pos.outputs["Z"], floor_z), th)
    uv = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(u, uv.inputs["X"])
    nt.links.new(v, uv.inputs["Y"])

    def sample(img):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img
        n.interpolation = "Linear"
        n.extension = "REPEAT"
        nt.links.new(uv.outputs[0], n.inputs["Vector"])
        return n

    col_tex = sample(image("color", colour, True))
    nt.links.new(col_tex.outputs["Color"], bsdf.inputs["Base Color"])
    hr_img = np.stack([height, rough], axis=-1)
    packed = bpy.data.images.new(f"{name}-hr", cols, rows, alpha=True, float_buffer=True)
    packed.colorspace_settings.name = "Non-Color"
    px = np.ones((rows, cols, 4), dtype=np.float32)
    px[..., :2] = hr_img
    packed.pixels.foreach_set(px.ravel())
    packed.update()
    packed.pack()
    hr = sample(packed)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(hr.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = cfg.get("bump", 0.5)
    bump.inputs["Distance"].default_value = 0.0015
    nt.links.new(sep.outputs["Red"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Specular IOR Level"].default_value = cfg.get("spec", 0.4)
    if cfg.get("sheen"):
        bsdf.inputs["Sheen Weight"].default_value = cfg["sheen"]
        bsdf.inputs["Sheen Roughness"].default_value = 0.4
    return mat


# ---------------------------------------------------------------- preview
def _preview(papers, out, wall_h=1.2, wall_w=1.0):
    """A sheet of every paper on a 1 x 1.2 m piece of wall, drawn from the tile at full resolution and then reduced,
    to judge scale and look without rendering."""
    from PIL import Image

    def to_srgb(a):
        a = np.clip(a, 0, 1)
        return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)

    shown = 480  # pixels across one panel
    panels = []
    for name, cfg in papers.items():
        colour, height, _ = tile(cfg)
        tw, th = tile_size(cfg)
        rows, cols = height.shape
        W, H = round(wall_w * cols / tw), round(wall_h * rows / th)  # one tile pixel per wall pixel
        xi = np.arange(W) % cols
        yi = (np.arange(H)[::-1]) % rows  # image row 0 is the foot of the wall
        wall = colour[np.ix_(yi, xi)] * (0.92 + 0.16 * height[np.ix_(yi, xi)])[..., None]
        img = Image.fromarray((to_srgb(wall) * 255).astype(np.uint8)).resize((shown, round(shown * wall_h / wall_w)), Image.LANCZOS)
        panels.append((name, img))
    pw, ph = panels[0][1].size
    sheet = Image.new("RGB", (len(panels) * (pw + 12) + 12, ph + 12), (20, 20, 20))
    for i, (name, img) in enumerate(panels):
        sheet.paste(img, (12 + i * (pw + 12), 6))
    sheet.save(out)
    return [n for n, _ in panels]


if __name__ == "__main__":
    import json
    import sys

    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    print("pasted:", _preview(cfg["palette"]["papers"], sys.argv[2]))
