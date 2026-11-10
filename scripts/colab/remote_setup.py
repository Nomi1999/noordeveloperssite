"""Runs on the Colab VM (colab exec -f): unpack the uploaded code, and install Blender and the CC0 assets once.

Safe to run again on the same VM: the code is replaced by the latest bundle, Blender and the assets are kept.
"""

import os
import shutil
import subprocess
import time

BLENDER_URL = "https://download.blender.org/release/Blender5.0/blender-5.0.1-linux-x64.tar.xz"
ROOT = "/content/noor"


def sh(cmd, timeout=1800):
    t = time.time()
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    print(f"$ {cmd[:90]}\n{(r.stdout + r.stderr)[-600:].rstrip()}\n[{time.time() - t:.0f}s, exit {r.returncode}]", flush=True)
    if r.returncode:
        raise SystemExit(f"setup failed: {cmd}")


# the code: replaced on every upload, keeping the downloaded assets and any finished renders
keep = {}
for sub in ("render/assets", "render/out"):
    path = os.path.join(ROOT, sub)
    if os.path.isdir(path):
        keep[sub] = f"/content/.keep-{sub.replace('/', '-')}"
        shutil.rmtree(keep[sub], ignore_errors=True)
        shutil.move(path, keep[sub])
shutil.rmtree(ROOT, ignore_errors=True)
os.makedirs(ROOT)
sh(f"tar -xzf /content/noor-bundle.tgz -C {ROOT}")
for sub, tmp in keep.items():
    shutil.rmtree(os.path.join(ROOT, sub), ignore_errors=True)
    shutil.move(tmp, os.path.join(ROOT, sub))

if not os.path.exists("/content/blender/blender"):
    sh("apt-get -qq install -y libxkbcommon0 libsm6 libxi6 libxrender1 libxxf86vm1 libxfixes3 libgl1 libegl1 > /dev/null 2>&1; true", 900)
    sh(f"cd /content && wget -q {BLENDER_URL} -O blender.tar.xz && mkdir -p blender && tar -xf blender.tar.xz -C blender --strip-components=1 && rm blender.tar.xz", 900)
sh("/content/blender/blender --version | head -1")
sh(f"cd {ROOT} && python3 render/fetch_assets.py 2>&1 | tail -3", 1500)
sh("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader")
print("SETUP OK", flush=True)
