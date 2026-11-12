"""The interior style switches and their defaults (no Blender needed, so plain Python can test them).

Every switch defaults to what the 5 Marla was built with, so a config that names none of them builds exactly as
before. `render/shots/1-kanal-interior.json` turns them on. See design D2 of the add-1-kanal-walkthrough change.
"""

# style choices a room type (or room) may make, falling back to the config's "style" block, then to these
STYLE = {
    "skirting": "board",  # or "shadow-gap": a flush dark reveal at the foot of the wall
    "doors": "cased",  # or "flush": no casing, a timber panel from the head to the ceiling
    "cabinetry": "handled",  # or "handleless": J-groove counters, push-to-open wardrobes
    "wc": "floor",  # or "wall-hung"
    "vanityStyle": "standing",  # or "floating"
    "shower": "rail",  # or "rain": rain head, valve plate, lit niche
    "openDoors": False,  # or True: inside door leaves stand open, swung against the wall, so a doorway is an opening to walk through
}

# design-wide switches read from the top of the config
GLOBAL = {
    "voids": False,  # finish double-height voids and stairwell edges (ceiling, walls, fascia, balustrade, pendant)
    "mergeWallPieces": False,  # paint overlapping wall pieces once (they render black in Cycles when doubled)
    "outdoorStairs": {},  # stair id -> {"tread", "side"}: built in exterior materials
    "pendant": None,  # {"length", "height"}: a linear pendant in a double-height void
    "voidCeiling": None,  # the void ceiling's slot spec
    "clearColumns": False,  # trim a window the export runs into a column to the column's face (fixups.py)
}
GLOBAL_STYLE = {
    "balustrade": "rail",  # or "glass" for the main stair
    "stairRails": "x",  # or "both": rails on flights rising along y too
}

# room-type keys that switch on new elements; absent means off
ROOM_OFF = ("uppers", "consoles", "waterfall", "splashback", "backlitMirror", "featureAll", "featureMaterial", "lightLine",
            "ceilingHeight", "door", "edgeGlow", "slotSpacing", "downlightRadius", "wall", "featurePaper")
NEW_CEILINGS = ("slots",)
NEW_FEATURES = ("travertine", "fluted-tight", "oak-panel", "paper")
PALETTE_OFF = ("metal", "door", "slat", "upper", "vanity", "wardrobe", "stairTread", "woods", "stones", "papers")
LIGHTS_OFF = ("color", "coveColor", "edge", "slot", "wash", "pendant")


def choice(cfg, spec, key):
    """A style choice for a room: its own spec, else the config's style block, else the default."""
    return spec.get(key, cfg.get("style", {}).get(key, STYLE[key]))
