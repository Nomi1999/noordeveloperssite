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
