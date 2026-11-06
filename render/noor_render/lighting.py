"""Sky, sun, haze and interior light, all on one time-of-day control (0 day → 1 dusk).

Context materials fade into a distance haze of the sky's color (materials.haze_group),
which stands in for a fog volume: it softens the neighbours the same way in both
engines without EEVEE's low-resolution volume grid showing in the sky.

The world mixes a CC0 daylight HDRI with a CC0 dusk HDRI. Each HDRI's own sun is
clamped out of the lighting and replaced by a sun lamp pointing the same way, so
the visible sky and the shadows agree while the lamp stays controllable: high and
neutral at 0, low and warm at 1. Interior lights and backplates ramp in from 0.6
to 1.0, only once the building is finished.
"""

import json
import math
import os
import shutil
import tempfile

import bpy
from mathutils import Vector

from . import assets, materials

DAY = ("kloofendal_48d_partly_cloudy_puresky", "hdri/kloofendal_48d_partly_cloudy_puresky.hdr")
DUSK = ("belfast_sunset_puresky", "hdri/belfast_sunset_puresky.hdr")
ROOM_WATTS = 22.0      # per m² of ceiling light
SOFFIT_WATTS = 9.0     # per downlight
SCONCE_WATTS = 14.0    # per spot, one up and one down from each wall light
SOFFIT_GLOW_WATTS = 5.0
WASH_WATTS = 9.0       # per hidden downlight that scallops the wall below it
LED_GLOW = 22.0        # emission of the LED lines at full dusk
BACKPLATE_GLOW = 2.2
BACKPLATE_DAY = 0.1     # rooms seen through glass by day: dim, never a black void
NEIGHBOUR_GLOW = 0.15


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def _sun_direction(path):
    """Azimuth (radians, from +x counterclockwise) and elevation of an equirect HDRI's brightest point.

    Measured on a downscaled temporary copy (scaling the image in place would also shrink the
    world texture, which shares Blender's cached buffer) and cached next to the HDRI.
    """
    cache = path + ".sun.json"
    if os.path.exists(cache):
        with open(cache, encoding="utf-8") as f:
            return tuple(json.load(f))
    with tempfile.TemporaryDirectory() as tmp:
        copy = os.path.join(tmp, "probe.hdr")
        shutil.copyfile(path, copy)
        img = bpy.data.images.load(copy, check_existing=False)
        img.scale(256, 128)
        px = img.pixels[:]
        w, h = img.size
        bpy.data.images.remove(img)
    best, bi = -1.0, 0
    for i in range(0, len(px), 4):
        lum = px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722
        if lum > best:
            best, bi = lum, i // 4
    u = ((bi % w) + 0.5) / w
    v = ((bi // w) + 0.5) / h
    a = 2 * math.pi * (u - 0.5)
    result = (math.atan2(math.sin(a), -math.cos(a)), math.pi * (v - 0.5))
    with open(cache, "w", encoding="utf-8") as f:
        json.dump(result, f)
    return result


class Rig:
    def __init__(self, shot, lights, facade_boxes, root, facade=()):
        self.shot = shot
        look = shot.get("light", {})
        self.day_az = math.radians(look.get("sunAzimuth", 210))
        self.dusk_az = math.radians(look.get("duskAzimuth", look.get("sunAzimuth", 210) + 40))
        self.dusk_elevation = math.radians(look.get("duskElevation", 3))
        self.exposure = (look.get("exposureDay", 0.0), look.get("exposureDusk", 0.0))
        self.look = look.get("look", "AgX - Medium High Contrast")
        day_path = assets.require(*DAY)
        dusk_path = assets.require(*DUSK)
        day_tex_az, self.day_elevation = _sun_direction(day_path)
        dusk_tex_az, _ = _sun_direction(dusk_path)
        self._world(day_path, dusk_path, day_tex_az - self.day_az, dusk_tex_az - self.dusk_az)
        self._sun()
        materials.haze_group().nodes["density"].outputs[0].default_value = look.get("haze", 0.006)
        self.room_lights = [self._room_light(l) for l in lights]
        self.soffit_lights = self._soffits(facade_boxes)
        self.fittings = self._fittings(facade)
        self.has_leds = any(f["role"] == "led" for f in facade)
        self.backplate_glow = look.get("backplateGlow", BACKPLATE_GLOW)

    # ---- world ----
    def _world(self, day_path, dusk_path, day_rot, dusk_rot):
        world = bpy.data.worlds.new("noor-sky")
        bpy.context.scene.world = world
        nt = world.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputWorld")
        coord = nt.nodes.new("ShaderNodeTexCoord")

        def env(path, rot, clamp, tint):
            m = nt.nodes.new("ShaderNodeMapping")
            m.inputs["Rotation"].default_value = (0, 0, rot)
            nt.links.new(coord.outputs["Generated"], m.inputs["Vector"])
            e = nt.nodes.new("ShaderNodeTexEnvironment")
            e.image = bpy.data.images.load(path, check_existing=True)
            nt.links.new(m.outputs[0], e.inputs["Vector"])
            c = nt.nodes.new("ShaderNodeVectorMath")
            c.operation = "MINIMUM"
            c.inputs[1].default_value = (clamp, clamp, clamp)
            nt.links.new(e.outputs["Color"], c.inputs[0])
            t = nt.nodes.new("ShaderNodeVectorMath")
            t.operation = "MULTIPLY"
            t.inputs[1].default_value = tint
            nt.links.new(c.outputs[0], t.inputs[0])
            return t.outputs[0]

        day = env(day_path, day_rot, 12.0, (1.0, 1.0, 1.0))
        dusk = env(dusk_path, dusk_rot, 3.0, tuple(self.shot.get("light", {}).get("duskTint", (0.55, 0.66, 1.0))))  # pushed toward blue hour
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.name = "tod"
        nt.links.new(day, mix.inputs["A"])
        nt.links.new(dusk, mix.inputs["B"])
        bg = nt.nodes.new("ShaderNodeBackground")
        bg.name = "sky"
        nt.links.new(mix.outputs["Result"], bg.inputs["Color"])
        nt.links.new(bg.outputs[0], out.inputs["Surface"])
        world.sun_threshold = 1000.0  # the lamp is the sun; don't extract another from the sky in EEVEE
        self.world = world

    def _sun(self):
        data = bpy.data.lights.new("sun", "SUN")
        data.use_temperature = True
        self.sun = bpy.data.objects.new("sun", data)
        bpy.context.scene.collection.objects.link(self.sun)

    # ---- interior ----
    def _room_light(self, l):
        data = bpy.data.lights.new(f"room-{l['room']}", "AREA")
        data.shape = "RECTANGLE"
        data.size, data.size_y = max(0.4, l["w"]), max(0.4, l["d"])
        data.use_temperature = True
        data.temperature = 3000
        data.color = (1.0, 0.92, 0.85)
        data.use_shadow = True  # rooms are closed boxes; shadows are what keep light from leaking through walls
        data.shadow_maximum_resolution = 0.03
        # EEVEE sizes a light's reach from its energy: bright room lights would update shadows across
        # the whole scene and overflow the shadow budget (black frames), so reach stops past the room
        data.use_custom_distance = True
        data.cutoff_distance = max(data.size, data.size_y) + 2.5
        # On a narrow plot the rooms overlap in view, so a shot can shorten the reach further ("roomReach", m)
        reach = self.shot.get("light", {}).get("roomReach")
        if reach:
            data.cutoff_distance = min(data.cutoff_distance, reach)
        obj = bpy.data.objects.new(f"room-{l['level']}-{l['room']}", data)
        obj.location = (l["x"], l["y"], l["z"])
        obj["watts"] = ROOM_WATTS * data.size * data.size_y
        bpy.context.scene.collection.objects.link(obj)
        return obj

    def _soffits(self, boxes):
        lights = []
        for b in boxes:
            nx = max(1, round(b["w"] / 2.2))
            ny = max(1, round(b["d"] / 2.2))
            for i in range(nx):
                for j in range(ny):
                    data = bpy.data.lights.new("downlight", "SPOT")
                    data.spot_size = math.radians(95)
                    data.spot_blend = 0.6
                    data.shadow_soft_size = 0.04
                    data.use_temperature = True
                    data.temperature = 2900
                    data.use_shadow = False  # they wash the soffit and wall below; nothing to occlude
                    data.use_custom_distance = True
                    data.cutoff_distance = 6.0
                    obj = bpy.data.objects.new("downlight", data)
                    obj.location = (b["x"] + (i + 0.5) * b["w"] / nx, b["y"] + (j + 0.5) * b["d"] / ny, b["bottom"] - 0.02)
                    obj["watts"] = SOFFIT_WATTS
                    bpy.context.scene.collection.objects.link(obj)
                    lights.append(obj)
                    if b["material"] == "wood-slat":  # a timber soffit glows in the light bouncing back up, which EEVEE doesn't trace
                        lights.append(self._spot("soffit-glow", (obj.location.x, obj.location.y, b["bottom"] - 0.6), False, 150, 1.5, SOFFIT_GLOW_WATTS))
        return lights

    def _spot(self, name, at, down, size, reach, watts):
        data = bpy.data.lights.new(name, "SPOT")
        data.spot_size = math.radians(size)
        data.spot_blend = 1.0
        data.shadow_soft_size = 0.02
        data.use_temperature = True
        data.temperature = 3400
        data.use_shadow = False  # each one lights only the wall beside it
        data.use_custom_distance = True
        data.cutoff_distance = reach
        obj = bpy.data.objects.new(name, data)
        obj.location = at
        obj.rotation_euler = (0 if down else math.pi, 0, 0)
        obj["watts"] = watts
        bpy.context.scene.collection.objects.link(obj)
        return obj

    def _fittings(self, facade):
        """Wall lights throw a scallop up and down the wall; hidden downlights throw one down it."""
        lights = []
        for f in facade:
            if f["role"] not in ("sconce", "wash"):
                continue
            p = f["pieces"][0]
            x, y = (p["from"][0] + p["to"][0]) / 2, (p["from"][1] + p["to"][1]) / 2
            if f["role"] == "sconce":
                lights.append(self._spot("sconce-up", (x, y, p["top"] + 0.01), False, 70, 1.8, SCONCE_WATTS))
                lights.append(self._spot("sconce-down", (x, y, p["bottom"] - 0.01), True, 70, 1.8, SCONCE_WATTS))
            else:
                lights.append(self._spot("wash", (x, y, p["bottom"] - 0.01), True, 95, 2.4, WASH_WATTS))
        return lights

    # ---- the control ----
    def apply(self, tod, build=6.0):
        scene = bpy.context.scene
        mix = smoothstep(0.0, 1.0, tod)
        self.world.node_tree.nodes["tod"].inputs["Factor"].default_value = mix
        self.world.node_tree.nodes["sky"].inputs["Strength"].default_value = lerp(1.0, 0.32, mix)

        elevation = lerp(self.day_elevation, self.dusk_elevation, smoothstep(0.0, 0.95, tod))
        azimuth = lerp(self.day_az, self.dusk_az, smoothstep(0.0, 0.95, tod))
        d = Vector((math.cos(elevation) * math.cos(azimuth), math.cos(elevation) * math.sin(azimuth), math.sin(elevation)))
        self.sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sun = self.sun.data
        sun.energy = lerp(4.2, 0.18, smoothstep(0.15, 0.95, tod))
        sun.temperature = lerp(5600, 2300, smoothstep(0.2, 1.0, tod))
        sun.angle = math.radians(lerp(0.6, 2.5, tod))

        haze = materials.haze_group().nodes
        haze["color"].outputs[0].default_value = (*[lerp(a, b, mix) for a, b in zip((0.62, 0.70, 0.82), (0.035, 0.05, 0.10))], 1)

        inside = smoothstep(0.6, 1.0, tod) * max(0.0, min(1.0, (build - 4.8) / 0.2))
        for l in self.room_lights + self.soffit_lights + self.fittings:
            l.data.energy = l["watts"] * inside
            l.hide_render = inside <= 0
        for name, value in (("backplate", lerp(BACKPLATE_DAY, self.backplate_glow, inside)), ("neighbour-window", NEIGHBOUR_GLOW * smoothstep(0.6, 1.0, tod))):
            mat = materials.get(name)
            mat.node_tree.nodes["glow"].outputs[0].default_value = value
        materials.get("backplate").node_tree.nodes["warmth"].inputs["Factor"].default_value = inside
        if self.has_leds:
            materials.get("led-strip").node_tree.nodes["glow"].outputs[0].default_value = LED_GLOW * inside

        vs = scene.view_settings
        vs.view_transform = "AgX"
        vs.look = self.look
        vs.exposure = lerp(*self.exposure, mix)
        scene["time_of_day"] = tod
