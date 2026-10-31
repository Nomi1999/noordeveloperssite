"""Camera shots from render/shots/<slug>.json.

Positions and targets are in meters in plot coordinates (origin at the plot's
front-left corner, x along the street, y into the plot, z up from the road).
With "verticals": true the camera stays level and a lens shift frames the target,
so vertical edges stay vertical (two-point perspective). A number between 0 and 1
blends: that fraction of the tilt is taken by the lens shift instead of the camera.

Sequences (render/shots/<name>.json with a "sequence" block) key the camera, lens,
build and time of day per frame; see Sequence.
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
    data.sensor_fit = shot.get("sensorFit", "HORIZONTAL")
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
    if "lens" in shot:
        data.lens = shot["lens"]
    v = shot.get("verticals", True)
    if v is not False:
        v = 1.0 if v is True else float(v)
        yaw = math.atan2(d.y, d.x)
        pitch = math.atan2(d.z, math.hypot(d.x, d.y))
        cam.rotation_euler = (math.pi / 2 + (1 - v) * pitch, 0, yaw - math.pi / 2)
        data.shift_y = data.lens * math.tan(v * pitch) / data.sensor_width + shot.get("shiftY", 0.0)
    else:
        cam.rotation_euler = (-d).to_track_quat("Z", "Y").to_euler()
        data.shift_y = shot.get("shiftY", 0.0)
    data.shift_x = shot.get("shiftX", 0.0)


def aspect(shot):
    w, h = shot.get("aspect", [16, 9])
    return w / h


# ---- sequences ----

def _pchip(xs, ys, ease_ends):
    """Tangents of a monotone cubic (Fritsch–Carlson / PCHIP) through the keys.

    C1 smooth, never overshoots a key, and flat wherever the keys hold a value,
    so a value that rises between two holds eases in and out on its own.
    """
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            continue
        w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    if n > 1 and not ease_ends:
        m[0], m[-1] = d[0], d[-1]
    return m


class Curve:
    """A value keyed at frames: [[frame, value], ...]."""

    def __init__(self, keys, ease_ends=False):
        keys = sorted(keys)
        if not keys:
            raise ShotError("a keyed value needs at least one key")
        self.xs = [float(k[0]) for k in keys]
        self.ys = [float(k[1]) for k in keys]
        if len(set(self.xs)) != len(self.xs):
            raise ShotError(f"two keys on the same frame: {keys}")
        self.m = _pchip(self.xs, self.ys, ease_ends)

    def __call__(self, x):
        xs, ys, m = self.xs, self.ys, self.m
        if x <= xs[0] or len(xs) == 1:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = max(k for k in range(len(xs) - 1) if xs[k] <= x)
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        t2, t3 = t * t, t * t * t
        return ((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
                + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1])


class Spline(Curve):
    """A C2 cubic spline through the keys: velocity and acceleration change smoothly,
    so a camera has no kinks at its keys. Clamped to rest at both ends with ease_ends,
    natural otherwise. May overshoot slightly between uneven keys (fine for a camera,
    not for holds: use Curve for those)."""

    def __init__(self, keys, ease_ends=False):
        super().__init__(keys)
        xs, ys, n = self.xs, self.ys, len(self.xs)
        if n < 3:
            return  # Curve's Hermite segment is already smooth
        h = [xs[i + 1] - xs[i] for i in range(n - 1)]
        d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
        # tridiagonal system for the second derivatives M
        a, b, c, r = [0.0] * n, [0.0] * n, [0.0] * n, [0.0] * n
        for i in range(1, n - 1):
            a[i], b[i], c[i], r[i] = h[i - 1], 2 * (h[i - 1] + h[i]), h[i], 6 * (d[i] - d[i - 1])
        if ease_ends:
            b[0], c[0], r[0] = 2 * h[0], h[0], 6 * d[0]
            a[-1], b[-1], r[-1] = h[-1], 2 * h[-1], -6 * d[-1]
        else:
            b[0], b[-1] = 1.0, 1.0
        for i in range(1, n):  # Thomas algorithm
            w = a[i] / b[i - 1]
            b[i] -= w * c[i - 1]
            r[i] -= w * r[i - 1]
        M = [0.0] * n
        M[-1] = r[-1] / b[-1]
        for i in range(n - 2, -1, -1):
            M[i] = (r[i] - c[i] * M[i + 1]) / b[i]
        self.M = M

    def __call__(self, x):
        if not hasattr(self, "M"):
            return super().__call__(x)
        xs, ys, M = self.xs, self.ys, self.M
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = max(k for k in range(len(xs) - 1) if xs[k] <= x)
        h = xs[i + 1] - xs[i]
        u, v = xs[i + 1] - x, x - xs[i]
        return (M[i] * u ** 3 / (6 * h) + M[i + 1] * v ** 3 / (6 * h)
                + (ys[i] / h - M[i] * h / 6) * u + (ys[i + 1] / h - M[i + 1] * h / 6) * v)


CAMERA_CHANNELS =("azimuth", "distance", "height", "lens", "verticals", "shiftX", "shiftY")


class Sequence:
    """A keyed frame sequence.

    {
      "design": "1-kanal", "frames": 192, "phaseFrames": 32, "aspect": [16, 9],
      "sensor": 36, "sensorFit": "AUTO", "light": {...},
      "orbit": [cx, cy],                     # the camera orbits this point (plot meters)
      "camera": [                            # keys; each channel is interpolated on its own
        {"frame": 0, "azimuth": -135, "distance": 30, "height": 18, "target": [x, y, z],
         "lens": 28, "verticals": 0, "shiftX": 0, "shiftY": 0}, ...],
      "easeCamera": true,                    # camera starts and ends at rest
      "build": [[frame, value], ...],
      "timeOfDay": [[frame, value], ...]
    }

    Azimuth is in degrees counterclockwise from +x (the street runs along x, the
    plot lies toward +y, so the street side is around -90). Camera channels are
    cylindrical around the orbit point, which keeps an orbit circular between keys
    instead of cutting chords between them.
    """

    def __init__(self, config):
        self.config = config
        self.frames = int(config["frames"])
        self.phase_frames = int(config.get("phaseFrames", self.frames))
        self.orbit = config.get("orbit", [0.0, 0.0])
        ease = config.get("easeCamera", True)
        keys = config["camera"]
        if not keys:
            raise ShotError("a sequence needs camera keys")
        self.curves = {}
        for ch in CAMERA_CHANNELS:
            pts = [[k["frame"], k[ch]] for k in keys if ch in k]
            if pts:
                self.curves[ch] = Spline(pts, ease)
        for i in range(3):
            self.curves[f"target{i}"] = Spline([[k["frame"], k["target"][i]] for k in keys if "target" in k], ease)
        for ch in ("azimuth", "distance", "height"):
            if ch not in self.curves:
                raise ShotError(f"camera keys need '{ch}'")
        self.build = Curve(config["build"])
        self.tod = Curve(config["timeOfDay"])

    def phase(self, frame):
        return min(frame // self.phase_frames, self.frames // self.phase_frames - 1)

    def shot(self, frame):
        """The camera at a frame, in the same form as a still shot."""
        c = {k: f(frame) for k, f in self.curves.items()}
        a = math.radians(c["azimuth"])
        cx, cy = self.orbit
        shot = {
            "position": [cx + c["distance"] * math.cos(a), cy + c["distance"] * math.sin(a), c["height"]],
            "target": [c["target0"], c["target1"], c["target2"]],
            "lens": c.get("lens", self.config.get("lens", 28)),
            "sensor": self.config.get("sensor", 36),
            "sensorFit": self.config.get("sensorFit", "AUTO"),
            "verticals": min(1.0, max(0.0, c.get("verticals", 0.0))),
            "shiftX": c.get("shiftX", 0.0),
            "shiftY": c.get("shiftY", 0.0),
            "aspect": self.config.get("aspect", [16, 9]),
            "light": self.config.get("light", {}),
            "timeOfDay": self.tod(frame),
        }
        return shot

    def state(self, frame):
        return self.build(frame), self.tod(frame)


def load_sequence(name):
    path = os.path.join(SHOTS, f"{name}.json")
    if not os.path.exists(path):
        raise ShotError(f"No sequence config: {path}")
    with open(path, encoding="utf-8") as f:
        config = json.load(f)
    if "camera" not in config or "frames" not in config:
        raise ShotError(f"{path} is not a sequence config (needs 'frames' and 'camera')")
    return Sequence(config)
