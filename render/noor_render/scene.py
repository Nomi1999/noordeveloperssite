"""Build the whole scene for one design and shot from the export and committed config."""

import bpy

from . import assets, construction, facade, geometry, lighting, loader, materials, shots, site, vegetation
from .util import collection


def clear():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.curves,
                 bpy.data.collections, bpy.data.node_groups, bpy.data.worlds, bpy.data.textures):
        for item in list(coll):
            coll.remove(item)
    materials.reset()


class Scene:
    def __init__(self, slug, shot_name, clay=None):
        design = loader.load(slug)  # stops on an unsupported export before anything is built
        config = shots.load(slug)
        shot = shots.get(config, shot_name)
        assets.check_all()
        clear()
        root = collection("noor")
        context = config.get("context", {})
        footprint = geometry.build(design, root)
        room_lights = facade.build(design, root)
        site.build(design, root, footprint, context)
        vegetation.build(design, root, context)
        construction.blueprint(design, root)
        construction.assign(design)
        soffits = [f for f in design["facade"] if f["type"] == "box" and f["role"] in ("soffit", "canopy")]
        self.rig = lighting.Rig(shot, room_lights, soffits, root)
        self.camera = shots.camera(shot)
        if clay:
            materials.apply_clay(keep_glass=clay == "glass")
        self.design, self.shot, self.shot_name = design, shot, shot_name
        bpy.app.handlers.frame_change_pre.append(construction.frame_handler)

    def set_state(self, build, tod):
        construction.apply(build)
        self.rig.apply(tod, build)
