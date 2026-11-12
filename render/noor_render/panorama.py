"""360-degree panoramas: one equirectangular image from a point inside the house.

Two ways to get one. Cycles has a panoramic camera, which gives a single render with no seams. EEVEE has none, so
there a panorama is six 90-degree faces stitched together; the stitch is also kept as the fallback for Cycles.

Orientation (the same in both): the centre of the image looks along +y (world angle 90 degrees) and turning right
in the image turns clockwise, toward +x. A viewer's yaw is therefore 90 minus the world angle.
"""

import math
import os

import bpy
from mathutils import Vector

from . import output
from .walkthrough import CENTRE_ANGLE


def face_rotations():
    """Camera rotations for the four horizontal faces (starting at the centre, turning clockwise), up, down."""
    centre = math.radians(CENTRE_ANGLE)
    horiz = [(math.pi / 2, 0, centre - k * math.pi / 2 - math.pi / 2) for k in range(4)]
    return horiz + [(math.pi, 0, 0), (0, 0, 0)]


FACE_NAMES = ["f0", "f1", "f2", "f3", "up", "down"]


def native(cam, pos):
    """Aim a Cycles panoramic camera: equirectangular, centre along +y."""
    cam.data.type = "PANO"
    cam.data.panorama_type = "EQUIRECTANGULAR"
    cam.data.latitude_min, cam.data.latitude_max = -math.pi / 2, math.pi / 2
    cam.data.longitude_min, cam.data.longitude_max = -math.pi, math.pi
    cam.location = pos
    cam.rotation_euler = (math.pi / 2, 0, math.radians(CENTRE_ANGLE) - math.pi / 2)


def render_native(sc, pos, path, meta):
    native(sc.camera, pos)
    return output.still(path, dict(meta, method="native"))


def render_faces(sc, pos, folder, meta, only=None):
    """Render the six faces into folder (skipping any already written) and return their paths, in FACE_NAMES order."""
    cam = sc.camera
    cam.data.type = "PERSP"
    cam.data.sensor_fit = "AUTO"
    cam.data.sensor_width = 36
    cam.data.lens = 18  # 90 degrees across a square frame
    cam.data.shift_x = cam.data.shift_y = 0
    cam.location = pos
    paths = []
    for name, rot in zip(FACE_NAMES, face_rotations()):
        if only and name not in only:
            continue
        path = os.path.join(folder, f"{name}.png")
        paths.append(path)
        if os.path.exists(path):
            continue
        cam.rotation_euler = rot
        bpy.context.view_layer.update()
        output.still(path, dict(meta, face=name, method="faces"))
    return paths


def stitch(folder, dest):
    """Stitch six face renders into one equirectangular PNG at dest (written atomically)."""
    import numpy as np
    from mathutils import Matrix

    mats, imgs = [], []
    for name, rot in zip(FACE_NAMES, face_rotations()):
        mats.append(np.array(Matrix.Rotation(rot[2], 3, "Z") @ Matrix.Rotation(rot[1], 3, "Y") @ Matrix.Rotation(rot[0], 3, "X")))
        im = bpy.data.images.load(os.path.join(folder, f"{name}.png"), check_existing=False)
        im.colorspace_settings.name = "Non-Color"  # pass the encoded values straight through
        w, h = im.size
        a = np.empty(w * h * 4, dtype=np.float32)
        im.pixels.foreach_get(a)
        imgs.append(a.reshape(h, w, 4)[::-1, :, :3])  # top row first
        bpy.data.images.remove(im)
    N = imgs[0].shape[0]
    W = 4 * N
    H = W // 2
    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H
    lon, lat = np.meshgrid((u - 0.5) * 2 * np.pi, (0.5 - v) * np.pi)
    # turning right in the image is turning clockwise, so the world angle falls as longitude rises
    ang = math.radians(CENTRE_ANGLE) - lon
    d = np.stack([np.cos(lat) * np.cos(ang), np.cos(lat) * np.sin(ang), np.sin(lat)], axis=-1)
    out = np.zeros((H, W, 3), dtype=np.float32)
    done = np.zeros((H, W), dtype=bool)
    for R, img in zip(mats, imgs):
        dc = d @ R  # world to camera
        fwd = -dc[..., 2]
        with np.errstate(divide="ignore", invalid="ignore"):
            x, y = dc[..., 0] / fwd, dc[..., 1] / fwd
        m = (fwd > 0) & (np.abs(x) <= 1.0) & (np.abs(y) <= 1.0) & ~done
        px = np.clip((x[m] + 1) / 2 * N - 0.5, 0, N - 1)
        py = np.clip((1 - y[m]) / 2 * N - 0.5, 0, N - 1)
        x0, y0 = np.floor(px).astype(int), np.floor(py).astype(int)
        x1, y1 = np.minimum(x0 + 1, N - 1), np.minimum(y0 + 1, N - 1)
        fx, fy = (px - x0)[:, None], (py - y0)[:, None]
        out[m] = (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy)
                  + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)
        done |= m
    gaps = int((~done).sum())
    if gaps:
        raise RuntimeError(f"stitch left {gaps} pixels unfilled")
    rgba = np.concatenate([out[::-1], np.ones((H, W, 1), np.float32)], axis=-1)
    pano = bpy.data.images.new("pano", W, H, alpha=False)
    pano.colorspace_settings.name = "Non-Color"
    pano.pixels.foreach_set(rgba.ravel())
    tmp = dest[:-4] + ".tmp.png"
    pano.filepath_raw = tmp
    pano.file_format = "PNG"
    pano.save()
    bpy.data.images.remove(pano)
    os.replace(tmp, dest)
    return dest


# ---- depth: how far the nearest surface is along every ray of a panorama, for the viewer's parallax

DEPTH_MAX = 100.0  # metres: sky and anything farther are stored as this
DEPTH_WIDTH = 512  # an equirectangular depth image is 512 x 256: one mesh vertex per pixel in the viewer


def render_depth(sc, pos, dest, device="cpu"):
    """Write dest, an 8-bit PNG of the distance from `pos` to the first surface along each panorama ray.

    The distance (metres, 0 to DEPTH_MAX) is packed into 16 bits: red is the high byte and green the low byte, so
    metres = (red * 256 + green) / 65535 * DEPTH_MAX. It is drawn as an emission shader over the whole scene (no light
    transport, no haze, glass left out so a window shows the world beyond it), through the 'Raw' view transform, so the
    bytes in the PNG are the bytes the shader made. One sample with a pinhole filter keeps every pixel a single ray."""
    import numpy as np  # noqa: F401  (kept: the packing below is in the shader, but a failure here should be loud)

    scene = bpy.context.scene
    native(sc.camera, pos)
    output.configure("cycles", "preview", 2.0, DEPTH_WIDTH, device=device)
    c = scene.cycles
    c.samples = 1
    c.use_adaptive_sampling = False
    c.use_denoising = False
    c.max_bounces = 0
    c.filter_width = 0.01
    r = scene.render
    r.use_persistent_data = False
    r.image_settings.color_depth = "8"
    r.image_settings.color_mode = "RGB"
    r.image_settings.compression = 15
    r.dither_intensity = 0.0
    scene.view_settings.view_transform = "Raw"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    scene.display_settings.display_device = "sRGB"

    # glass is left out: a ray through a window goes on to what is outside it
    for ob in bpy.data.objects:
        mats = [m.name for m in getattr(ob.data, "materials", []) if m] if ob.type == "MESH" else []
        if mats and all(n.startswith("glass-") for n in mats):
            ob.hide_render = True

    def packed(nt, position):
        """Nodes turning the distance from `position` into the red and green bytes; returns an RGB colour output"""
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        sub = nt.nodes.new("ShaderNodeVectorMath")
        sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = tuple(position)
        nt.links.new(geo.outputs["Position"], sub.inputs[0])
        length = nt.nodes.new("ShaderNodeVectorMath")
        length.operation = "LENGTH"
        nt.links.new(sub.outputs[0], length.inputs[0])

        def math(op, a=None, b=None, clamp=False):
            n = nt.nodes.new("ShaderNodeMath")
            n.operation = op
            n.use_clamp = clamp
            for i, v in enumerate((a, b)):
                if isinstance(v, (int, float)):
                    n.inputs[i].default_value = v
                elif v is not None:
                    nt.links.new(v, n.inputs[i])
            return n.outputs[0]

        v = math("MULTIPLY", length.outputs["Value"], 65535.0 / DEPTH_MAX)
        v = math("MINIMUM", v, 65535.0)
        v = math("ROUND", v)
        hi = math("FLOOR", math("DIVIDE", v, 256.0))
        lo = math("SUBTRACT", v, math("MULTIPLY", hi, 256.0))
        comb = nt.nodes.new("ShaderNodeCombineColor")
        nt.links.new(math("DIVIDE", hi, 255.0), comb.inputs[0])
        nt.links.new(math("DIVIDE", lo, 255.0), comb.inputs[1])
        comb.inputs[2].default_value = 0.0
        return comb.outputs[0]

    mat = bpy.data.materials.new("depth-override")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    nt.links.new(packed(nt, pos), emit.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    bpy.context.view_layer.material_override = mat

    # the sky and the haze are replaced by a flat 'far away' colour: red and green full, so 65535, DEPTH_MAX
    world = bpy.data.worlds.new("depth-world")
    world.use_nodes = True
    wn = world.node_tree
    wn.nodes.clear()
    bg = wn.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (1.0, 1.0, 0.0, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    wo = wn.nodes.new("ShaderNodeOutputWorld")
    wn.links.new(bg.outputs[0], wo.inputs["Surface"])
    scene.world = world
    # no object in the scene may add light, fog or a volume of its own to the bytes
    for ob in bpy.data.objects:
        if ob.type == "LIGHT":
            ob.hide_render = True

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest[:-4] + ".tmp.png"
    bpy.ops.render.render()
    bpy.data.images["Render Result"].save_render(filepath=tmp)
    os.replace(tmp, dest)
    print(f"wrote {dest}", flush=True)
    return dest
