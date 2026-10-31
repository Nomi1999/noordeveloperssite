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
        s.add_argument("--design", required=True, help="design slug: 1-kanal, 2-kanal, commercial")
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


def main(argv):
    args = parser().parse_args(argv)
    if args.command == "sequence":
        return sequence(args)

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
