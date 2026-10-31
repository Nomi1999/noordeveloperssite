"""Read a design export (render/data/<slug>.json) and convert it to scene units.

The export is in feet with the origin at the plot's front-left corner, x along the
street, y into the plot and z up from road level. Blender uses the same axes, so
the only change is feet to meters.
"""

import json
import os

SCHEMA_VERSION = 1
FT = 0.3048

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# Numbers under these keys are not lengths
_KEEP = {"schemaVersion", "north", "risers", "area"}


class ExportError(Exception):
    pass


def _to_meters(value, key=None):
    if key in _KEEP:
        return value
    if isinstance(value, dict):
        return {k: (v if k == "facts" else _to_meters(v, k)) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_meters(v, key) for v in value]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value * FT
    return value


def load(slug):
    path = os.path.join(DATA, f"{slug}.json")
    if not os.path.exists(path):
        found = sorted(f[:-5] for f in os.listdir(DATA) if f.endswith(".json") and f != "schema.json")
        raise ExportError(f"No export for design '{slug}' ({path}). Designs: {', '.join(found)}")
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    version = raw.get("schemaVersion")
    if version != SCHEMA_VERSION:
        raise ExportError(
            f"{path}: unsupported export schemaVersion: expected {SCHEMA_VERSION}, found {version!r}. "
            "Re-export with npm run designs:export, or update the render pipeline."
        )
    return _to_meters(raw)
