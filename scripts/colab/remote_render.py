"""Runs on the Colab VM (colab exec -f): render one panorama, logging every line to /content/logs/<name>.log.

Environment: DESIGN, VIEW, QUALITY (mid), NAME (default <view>; the image is
render/out/<design>/panoramas/<name>-<engine>-<quality>.png), NOOR_GPU_BACKEND (optional: CUDA forces CUDA, as the
regression check needs; Blender inherits it), ENGINE (cycles, or eevee for quick probes) and DEPTH (1: write the view's depth image,
render/out/<design>/depth/<name>-depth.png, instead of its colour) and EXTRA (more run.py
panorama arguments for tests, such as "--perspective 0 --width 1280"; a perspective view is written as
<name>-persp.png). The last line names the image written: OUTPUT <path>.

A dropped connection does not stop the kernel, so the render may still be running, or may have finished, when the
driver asks again. This script therefore waits for a Blender already rendering the same image and reports an image
that is already there instead of rendering it twice.
"""

import os
import re
import subprocess
import time

design, view = os.environ["DESIGN"], os.environ["VIEW"]
quality = os.environ.get("QUALITY", "mid")
name = os.environ.get("NAME", view)
engine = os.environ.get("ENGINE") or "cycles"
extra = os.environ.get("EXTRA", "")
depth = os.environ.get("DEPTH") == "1"
root = "/content/noor"
image = f"{name}-depth.png" if depth else f"{name}-persp.png" if "--perspective" in extra else f"{name}-{engine}-{quality}.png"
out = os.path.join(root, "render", "out", design, "depth" if depth else "panoramas", image)
os.makedirs("/content/logs", exist_ok=True)
log_path = f"/content/logs/{design}-{name}-{'depth' if depth else quality}.log"


def running():
    r = subprocess.run(["pgrep", "-f", f"viewpoint {view} .*name {name} "], capture_output=True, text=True)
    return r.returncode == 0


while running():
    print("waiting for the render already running", flush=True)
    time.sleep(10)
if os.path.exists(out):
    print(f"RESULT {name}: already rendered, {os.path.getsize(out) / 1e6:.1f} MB", flush=True)
    print(f"OUTPUT {out}", flush=True)
    raise SystemExit(0)

cmd = (f"cd {root} && timeout 2400 /content/blender/blender -b --factory-startup --python-exit-code 1 --python render/run.py -- "
       f"panorama --design {design} --viewpoint {view} --engine {engine} --quality {quality} "
       f"{'--method native ' if engine == 'cycles' else ''}--device gpu --name {name} {'--depth ' if depth else ''}{extra} ")
t0 = time.time()
first = None
tail = []
with open(log_path, "w") as log:
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        log.write(f"{time.time() - t0:7.1f} {line}")
        log.flush()
        if first is None and re.search(r"Sample \d+/\d+", line):
            first = time.time() - t0
        if "cycles device" in line or "wrote" in line or "ERROR" in line or "Traceback" in line:
            print(line.rstrip(), flush=True)
        tail = (tail + [line.rstrip()])[-8:]
    p.wait()
ok = p.returncode == 0 and os.path.exists(out)
if not ok:
    print("\n".join(tail))
print(f"RESULT {name}: exit {p.returncode}, {time.time() - t0:.0f}s (first sample at {first and round(first)}s), "
      f"{'saved' if ok else 'NO IMAGE'}", flush=True)
print(f"OUTPUT {out}", flush=True)
