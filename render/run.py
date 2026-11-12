"""Render pipeline entry point. Run headless:

    blender -b --factory-startup --python-exit-code 1 --python render/run.py -- <command> [options]

or through npm: npm run render:still -- --design 1-kanal --shot front-day
             npm run render:sequence -- --config 1-kanal-hero-landscape --every 8
"""

import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
OUT = os.path.join(HERE, "out")
# Exit code for a frame that keeps rendering black: EEVEE's GPU memory fills up over a long
# run; a fresh Blender process renders the frame fine, so scripts/blender.mjs restarts it.
BLANK_EXIT = 3


def _range(value):
    """'a' or 'a:b' → (a, b)."""
    parts = [float(v) for v in value.split(":")]
    if len(parts) not in (1, 2):
        raise argparse.ArgumentTypeError(f"expected a value or a:b, got {value!r}")
    return (parts[0], parts[-1])


def _frames(value):
    a, _, b = value.partition("-")
    first, last = int(a), int(b or a)
    if last < first:
        raise argparse.ArgumentTypeError(f"frame range {value!r} runs backwards")
    return first, last


def _crop(value):
    v = [float(x) for x in value.split(",")]
    if len(v) != 4:
        raise argparse.ArgumentTypeError("crop is x0,y0,x1,y1 as fractions of the frame")
    return v


def parser():
    p = argparse.ArgumentParser(prog="render/run.py", description="Noor Developers render pipeline (Blender 5.0, headless).")
    sub = p.add_subparsers(dest="command", required=True)
    for name, help_ in (("still", "render one image"), ("frames", "render a frame range, skipping frames already written"),
                        ("scene", "build the scene and save it as a .blend for inspection")):
        s = sub.add_parser(name, help=help_)
        s.add_argument("--design", required=True, help="design slug: 1-kanal, 2-kanal")
        s.add_argument("--shot", required=True, help="shot name from render/shots/<design>.json")
        s.add_argument("--engine", choices=("eevee", "cycles"), default="eevee")
        s.add_argument("--quality", choices=("preview", "high", "final"), default="preview")
        s.add_argument("--build", type=_range, default=(6.0, 6.0), help="construction progress 0-6, or a:b across frames")
        s.add_argument("--time-of-day", type=_range, default=None, help="0 day to 1 dusk, or a:b across frames (default: the shot's)")
        s.add_argument("--width", type=int, help="output width in pixels")
        s.add_argument("--crop", type=_crop, help="render only x0,y0,x1,y1 (fractions, origin bottom-left)")
        s.add_argument("--clay", nargs="?", const="all", choices=("all", "glass"), help="single grey material (glass: keep glazing)")
        s.add_argument("--name", help="output name (default <shot>-<engine>-<quality>)")
        if name == "frames":
            s.add_argument("--frames", type=_frames, required=True, help="first-last, e.g. 1-192")
        if name == "scene":
            s.add_argument("--save", required=True, help="path of the .blend to write")
    s = sub.add_parser("panorama", help="render a 360-degree panorama from a walkthrough viewpoint")
    s.add_argument("--design", required=True, help="design slug, e.g. 5-marla")
    s.add_argument("--viewpoint", required=True, help="viewpoint id from src/designs/walkthroughs/<design>.json")
    s.add_argument("--engine", choices=("eevee", "cycles"), default="cycles")
    s.add_argument("--quality", choices=("preview", "mid", "high", "final"), default="preview", help="mid: Cycles only (128 samples)")
    s.add_argument("--width", type=int, default=4096, help="width of the equirectangular image in pixels")
    s.add_argument("--device", choices=("cpu", "gpu"), default="cpu", help="Cycles device: gpu uses OptiX/CUDA when present (Colab), else the CPU")
    s.add_argument("--method", choices=("auto", "native", "faces"), default="auto",
                   help="native: Cycles' panoramic camera; faces: six 90-degree views stitched (auto: native for Cycles)")
    s.add_argument("--only", help="faces method: comma list of faces to render (f0-f3, up, down); no stitching")
    s.add_argument("--clay", nargs="?", const="all", choices=("all", "glass"), help="single grey material (geometry checks)")
    s.add_argument("--name", help="output name (default <viewpoint>)")
    s.add_argument("--fill", type=float, help="sky light bounced into the rooms (default: the interior config's skyFill)")
    s.add_argument("--exposure", type=float, help="exposure in stops (default: the interior config's)")
    s.add_argument("--perspective", type=float, metavar="YAW", help="test: one 16:9 view from the viewpoint, looking along this world angle")
    s.add_argument("--depth", action="store_true", help="write the view's depth image (512 x 256, metres packed into red and green) to render/out/<design>/depth/<name>-depth.png")
    s = sub.add_parser("sequence", help="render a keyed sequence (render/shots/<config>.json), skipping frames already written")
    s.add_argument("--config", required=True, help="sequence config name, e.g. 1-kanal-hero-landscape")
    s.add_argument("--engine", choices=("eevee", "cycles"), default="eevee")
    s.add_argument("--quality", choices=("preview", "high", "final"), default="preview")
    s.add_argument("--frames", type=_frames, help="first-last (default: the whole sequence)")
    s.add_argument("--every", type=int, default=1, help="render every n-th frame (contact sheets)")
    s.add_argument("--width", type=int, help="output width in pixels")
    s.add_argument("--clay", nargs="?", const="all", choices=("all", "glass"), help="single grey material (glass: keep glazing)")
    s.add_argument("--name", help="output folder name (default <config>-<engine>-<quality>)")
    return p


def sequence(args):
    from noor_render import output, shots
    from noor_render.assets import MissingAsset
    from noor_render.loader import ExportError
    from noor_render.scene import Scene

    try:
        seq = shots.load_sequence(args.config)
        sc = Scene(seq.config["design"], args.config, clay=args.clay, shot=seq.shot(0))
    except (ExportError, MissingAsset, shots.ShotError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    output.configure(args.engine, args.quality, shots.aspect(seq.config), args.width)
    first, last = args.frames or (0, seq.frames - 1)
    if last >= seq.frames:
        print(f"ERROR: {args.config} has frames 0-{seq.frames - 1}", file=sys.stderr)
        sys.exit(1)

    def extra(frame):
        shot = seq.shot(frame)
        shots.place(sc.camera, shot)
        return {"phase": seq.phase(frame), "camera": [round(v, 4) for v in shot["position"]],
                "target": [round(v, 4) for v in shot["target"]], "lens": round(shot["lens"], 3)}

    name = args.name or f"{args.config}-{args.engine}-{args.quality}"
    meta = {"design": seq.config["design"], "shot": args.config, "engine": args.engine, "quality": args.quality,
            "clay": args.clay}
    try:
        output.frames(os.path.join(OUT, seq.config["design"], name), first, last, seq.state, sc.set_state, meta,
                      step=max(1, args.every), extra=extra)
    except output.BlankRender as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(BLANK_EXIT)


def panorama(args):
    import math
    import bpy
    from mathutils import Vector
    from noor_render import interior, output, panorama as pano, shots, walkthrough
    from noor_render.assets import MissingAsset
    from noor_render.loader import ExportError
    from noor_render.scene import Scene

    try:
        wt = walkthrough.load(args.design)
        vp = walkthrough.get(wt, args.viewpoint)
        cfg = interior.load_config(args.design)
    except (walkthrough.ViewpointError, interior.InteriorError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    own = cfg.get("viewpoints", {}).get(vp["id"], {})
    # A view outside the house (the front gate) is lit like the exterior stills: the full sky, not the dimmed bounce
    # that keeps the rooms lit by their own lights, and its eye height is taken from the ground, not the floor slab
    outdoors = own.get("outdoors", False)
    sun = dict(cfg.get("sun", {}), **own.get("sun", {}))
    # exposure like a photographer's, per view where one is set (a dark bathroom wants more than a pale drawing room)
    exposure = args.exposure if args.exposure is not None else own.get("exposure", cfg.get("exposure", 0.5))
    light = {"sunAzimuth": sun.get("azimuth", 250), "duskAzimuth": 115, "exposureDay": exposure,
             "look": cfg.get("look", "AgX - Base Contrast"),
             "skyFill": None if outdoors else args.fill if args.fill is not None else cfg.get("skyFill", 0.15),
             "haze": own.get("haze", cfg.get("haze", 0.0015))}
    shot = {"lens": 18, "sensor": 36, "verticals": False, "position": [0, 0, 1], "target": [0, 1, 1], "timeOfDay": 0.0,
            "interior": True, "light": light}
    try:
        sc = Scene(args.design, args.viewpoint, clay=args.clay, shot=shot)
    except (ExportError, MissingAsset, shots.ShotError, interior.InteriorError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    level = next(l for l in sc.design["levels"] if l["id"] == vp["level"])
    from noor_render.geometry import GRADE
    pos = Vector((vp["at_m"][0], vp["at_m"][1], (GRADE if outdoors else level["slab"]["top"]) + vp.get("rise_m", 0) + interior.EYE))
    sc.set_state(6.0, 0.0)
    el = math.radians(sun.get("elevation", 45))
    az = math.radians(sun.get("azimuth", 250))
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    sc.rig.sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.rig.sun.data.energy = sun.get("strength", 4.2)
    sc.interior.make_lights(shadows=args.engine == "cycles")

    name = args.name or vp["id"]
    folder = os.path.join(OUT, args.design, "panoramas")
    meta = {"design": args.design, "shot": vp["id"], "engine": args.engine, "quality": args.quality, "clay": args.clay}
    try:
        if args.perspective is not None:
            output.configure(args.engine, args.quality, 16 / 9, args.width)
            # debugging: NOOR_AT="x,y" (feet) moves the camera, NOOR_DZ raises it (metres), NOOR_PITCH tilts it (degrees)
            cam_pos = Vector(pos)
            if os.environ.get("NOOR_AT"):
                ax, ay = (float(v) * 0.3048 for v in os.environ["NOOR_AT"].split(","))
                cam_pos.x, cam_pos.y = ax, ay
            cam_pos.z += float(os.environ.get("NOOR_DZ", "0"))
            tilt = math.tan(math.radians(float(os.environ.get("NOOR_PITCH", "0"))))
            shot2 = dict(shot, position=list(cam_pos), target=[cam_pos.x + math.cos(math.radians(args.perspective)),
                                                               cam_pos.y + math.sin(math.radians(args.perspective)), cam_pos.z + tilt], lens=16)
            shots.place(sc.camera, shot2)
            for spec in filter(None, os.environ.get("NOOR_PROBE", "").split(";")):
                # debugging: name what the pixel at (x, y) of the 1280 x 720 view shows, e.g. NOOR_PROBE="555,90;398,135"
                px, py = (float(v) for v in spec.split(","))
                nx, ny = (px - 640) / 640, (360 - py) / 360
                bpy.context.view_layer.update()
                local = Vector((nx * 18 / 16, ny * 18 / 16 * 9 / 16, -1.0))
                direction = (sc.camera.matrix_world.to_3x3() @ local).normalized()
                hit, loc, _, _, obj, _ = bpy.context.scene.ray_cast(bpy.context.view_layer.depsgraph, sc.camera.matrix_world.translation, direction)
                mats = [m.name for m in obj.data.materials] if hit and hasattr(obj.data, "materials") else []
                print(f"PROBE {spec}: {obj.name if hit else None} {mats} at {tuple(round(c, 3) for c in loc) if hit else ''}")
            output.still(os.path.join(folder, f"{name}-persp.png"), dict(meta, method="perspective"))
            return
        if args.depth:
            pano.render_depth(sc, pos, os.path.join(OUT, args.design, "depth", f"{name}-depth.png"), device=args.device)
            return
        method = args.method if args.method != "auto" else "faces"
        if method == "native" and args.engine != "cycles":
            print("ERROR: the native panoramic camera needs Cycles; use --method faces for EEVEE", file=sys.stderr)
            sys.exit(1)
        dest = os.path.join(folder, f"{name}-{args.engine}-{args.quality}.png")
        if method == "native":
            output.configure(args.engine, args.quality, 2.0, args.width, device=args.device)
            pano.render_native(sc, pos, dest, meta)
        else:
            output.configure(args.engine, args.quality, 1.0, args.width // 4, device=args.device)
            faces = os.path.join(folder, ".faces", f"{name}-{args.engine}-{args.quality}")
            only = args.only.split(",") if args.only else None
            output.clean_partials(faces)
            pano.render_faces(sc, pos, faces, meta, only)
            if not only:
                pano.stitch(faces, dest)
                print(f"wrote {dest}", flush=True)
    except output.BlankRender as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(BLANK_EXIT)


def main(argv):
    args = parser().parse_args(argv)
    if args.command == "sequence":
        return sequence(args)
    if args.command == "panorama":
        return panorama(args)

    import bpy
    from noor_render import output, shots
    from noor_render.assets import MissingAsset
    from noor_render.loader import ExportError
    from noor_render.scene import Scene

    try:
        sc = Scene(args.design, args.shot, clay=args.clay)
    except (ExportError, MissingAsset, shots.ShotError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    tod = args.time_of_day or (sc.shot.get("timeOfDay", 0.0),) * 2
    output.configure(args.engine, args.quality, shots.aspect(sc.shot), args.width, args.crop)
    name = args.name or f"{args.shot}-{args.engine}-{args.quality}"
    meta = {"design": args.design, "shot": args.shot, "engine": args.engine, "quality": args.quality,
            "clay": args.clay}

    try:
        if args.command == "scene":
            sc.set_state(args.build[1], tod[1])
            bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save))
        elif args.command == "still":
            b, t = args.build[1], tod[1]
            sc.set_state(b, t)
            path = os.path.join(OUT, args.design, "stills", f"{name}.png")
            output.still(path, dict(meta, frame=None, build=b, time_of_day=t))
        else:
            first, last = args.frames
            n = max(1, last - first)

            def at(frame):
                k = (frame - first) / n
                return (args.build[0] + (args.build[1] - args.build[0]) * k, tod[0] + (tod[1] - tod[0]) * k)

            folder = os.path.join(OUT, args.design, name)
            output.frames(folder, first, last, at, sc.set_state, meta)
    except output.BlankRender as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(BLANK_EXIT)


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
