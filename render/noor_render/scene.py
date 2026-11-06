"""Build the whole scene for one design and shot from the export and committed config."""

import bpy

from . import assets, construction, facade, geometry, lighting, loader, materials, shots, site, vegetation
from .util import collection


KERB_HEIGHT = 0.335  # m, where a shot hides a boundary wall


def clear():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.curves,
                 bpy.data.collections, bpy.data.node_groups, bpy.data.worlds, bpy.data.textures):
        for item in list(coll):
            coll.remove(item)
    materials.reset()


def hide_boundary(design, sides):
    """Leaves the named plot edges out of one shot: the panels above the base go, and any taller wall drops to a kerb."""
    prefixes = tuple(f"boundary-{side}-" for side in sides)
    if prefixes:
        design["facade"] = [f for f in design["facade"] if not f["id"].startswith(prefixes)]
    for w in design["site"]["boundary"]["walls"]:
        if w["side"] in sides:
            w["top"] = min(w["top"], KERB_HEIGHT)


class Scene:
    def __init__(self, slug, shot_name, clay=None, shot=None):
        """shot: a shot dict to use instead of looking shot_name up (a sequence's first frame)."""
        design = loader.load(slug)  # stops on an unsupported export before anything is built
        config = shots.load(slug)
        shot = shot or shots.get(config, shot_name)
        hide_boundary(design, shot.get("hideBoundary", []))
        assets.check_all()
        clear()
        root = collection("noor")
        context = {**config.get("context", {}), **shot.get("context", {})}
        footprint = geometry.build(design, root)
        room_lights = facade.build(design, root)
        site.build(design, root, footprint, context)
        vegetation.build(design, root, context)
        construction.blueprint(design, root)
        construction.assign(design)
        soffits = [f for f in design["facade"] if f["type"] == "box" and f["role"] in ("soffit", "canopy")]
        self.rig = lighting.Rig(shot, room_lights, soffits, root, design["facade"])
        self.camera = shots.camera(shot)
        if clay:
            materials.apply_clay(keep_glass=clay == "glass")
        self.design, self.shot, self.shot_name = design, shot, shot_name
        bpy.app.handlers.frame_change_pre.append(construction.frame_handler)

    def set_state(self, build, tod):
        construction.apply(build)
        self.rig.apply(tod, build)
