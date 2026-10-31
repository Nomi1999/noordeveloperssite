"""Download every asset in render/assets.lock.json into render/assets/ and verify its sha256.

Standard library only, so it runs in Blender's bundled Python:
    blender -b --factory-startup --python-exit-code 1 --python render/fetch_assets.py -- [--lock]

--lock fills in missing sha256 values from the downloaded files (use after adding an asset).
"""

import hashlib
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LOCK = os.path.join(HERE, "assets.lock.json")
ASSETS = os.path.join(HERE, "assets")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "noor-render-fetch/1"})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(tmp, dest)


def main(argv):
    update_lock = "--lock" in argv
    with open(LOCK, encoding="utf-8") as f:
        lock = json.load(f)
    failed = []
    fetched = 0
    for asset in lock["assets"]:
        if asset.get("license") != "CC0-1.0":
            failed.append(f"{asset['id']}: license is {asset.get('license')!r}, not CC0-1.0")
            continue
        for entry in asset["files"]:
            dest = os.path.join(ASSETS, entry["path"])
            want = entry.get("sha256")
            if os.path.exists(dest):
                if want and sha256(dest) == want:
                    continue
                if want is None and update_lock:
                    entry["sha256"] = sha256(dest)
                    continue
            print(f"fetch {asset['id']}: {entry['path']}", flush=True)
            try:
                download(entry["url"], dest)
            except OSError as e:
                failed.append(f"{asset['id']}: {entry['url']}: {e}")
                continue
            fetched += 1
            got = sha256(dest)
            if want is None and update_lock:
                entry["sha256"] = got
            elif got != want:
                os.remove(dest)
                failed.append(f"{asset['id']}: {entry['path']}: sha256 {got} does not match the lockfile")
    if update_lock:
        with open(LOCK, "w", encoding="utf-8", newline="\n") as f:
            json.dump(lock, f, indent=2)
            f.write("\n")
    total = sum(len(a["files"]) for a in lock["assets"])
    print(f"{fetched} downloaded, {total} files locked")
    if failed:
        print("\n".join(["FAILED:"] + failed), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
