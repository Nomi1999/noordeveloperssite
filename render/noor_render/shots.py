"""Camera shots from render/shots/<slug>.json.

Positions and targets are in meters in plot coordinates (origin at the plot's
front-left corner, x along the street, y into the plot, z up from the road).
With "verticals": true the camera stays level and a lens shift frames the target,
so vertical edges stay vertical (two-point perspective).
"""

import json
import math
import os

import bpy
from mathutils import Vector

SHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shots")


class ShotError(Exception):
    pass


def load(slug):
    path = os.path.join(SHOTS, f"{slug}.json")
    if not os.path.exists(path):
        raise ShotError(f"No shot file for design '{slug}': {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get(config, name):
    shots = config["shots"]
    if name not in shots:
        raise ShotError(f"No shot '{name}'. Shots: {', '.join(shots)}")
    return shots[name]


def camera(shot):
    data = bpy.data.cameras.new("camera")
    data.lens = shot.get("lens", 28)
    data.sensor_fit = "HORIZONTAL"
    data.sensor_width = shot.get("sensor", 36)
    data.clip_start, data.clip_end = 0.1, 2000
    cam = bpy.data.objects.new("camera", data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    place(cam, shot)
    return cam


def place(cam, shot):
    pos, target = Vector(shot["position"]), Vector(shot["target"])
    d = target - pos
    data = cam.data
    cam.location = pos
    if shot.get("verticals", True):
        yaw = math.atan2(d.y, d.x)
        cam.rotation_euler = (math.pi / 2, 0, yaw - math.pi / 2)
        horizontal = math.hypot(d.x, d.y)
        data.shift_y = (data.lens * d.z / horizontal) / data.sensor_width + shot.get("shiftY", 0.0)
    else:
        cam.rotation_euler = (-d).to_track_quat("Z", "Y").to_euler()
        data.shift_y = shot.get("shiftY", 0.0)
    data.shift_x = shot.get("shiftX", 0.0)


def aspect(shot):
    w, h = shot.get("aspect", [16, 9])
    return w / h
