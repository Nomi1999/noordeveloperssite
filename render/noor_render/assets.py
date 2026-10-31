"""Locate locked CC0 assets in render/assets/ and stop clearly when one is missing."""

import json
import os

RENDER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(RENDER, "assets")
LOCK = os.path.join(RENDER, "assets.lock.json")

_locked = None


class MissingAsset(Exception):
    pass


def _lock():
    global _locked
    if _locked is None:
        with open(LOCK, encoding="utf-8") as f:
            _locked = {a["id"]: a for a in json.load(f)["assets"]}
    return _locked


def require(asset_id, path):
    """Absolute path of one locked file, e.g. require("red_brick", "textures/red_brick/diff.jpg")."""
    asset = _lock().get(asset_id)
    if asset is None or not any(f["path"] == path for f in asset["files"]):
        raise MissingAsset(f"'{asset_id}' ({path}) is not in render/assets.lock.json")
    full = os.path.join(ASSETS, path)
    if not os.path.exists(full):
        raise MissingAsset(f"Asset '{asset_id}' is missing: render/assets/{path}. Run: npm run render:fetch")
    return full


def check_all():
    """Stop before building anything if any locked file is missing."""
    for asset in _lock().values():
        for f in asset["files"]:
            require(asset["id"], f["path"])
