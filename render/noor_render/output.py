"""Engine and quality presets, atomic image writes and resumable frame ranges."""

import json
import os
import time

import bpy

PRESETS = {
    ("eevee", "preview"): {"width": 1280, "samples": 16, "raytracing": False},
    ("eevee", "high"): {"width": 3200, "samples": 128, "raytracing": True},
    ("eevee", "final"): {"width": 3200, "samples": 256, "raytracing": True},
    ("cycles", "preview"): {"width": 1280, "samples": 48, "threshold": 0.05},
    ("cycles", "high"): {"width": 1920, "samples": 256, "threshold": 0.02},
    ("cycles", "final"): {"width": 3200, "samples": 512, "threshold": 0.01},
}
SEED = 0
RETRIES = 2


class BlankRender(Exception):
    pass


def _blank(path):
    """True if every pixel is black, which EEVEE returns without an error when a GPU allocation fails."""
    img = bpy.data.images.load(path, check_existing=False)
    try:
        img.scale(64, 36)  # averaging keeps any lit pixel above zero, and reading 64×36 is instant
        px = img.pixels[:]
        return max(max(px[0::4]), max(px[1::4]), max(px[2::4])) <= 0.0
    finally:
        bpy.data.images.remove(img)


def configure(engine, quality, aspect, width=None, crop=None):
    scene = bpy.context.scene
    preset = PRESETS[(engine, quality)]
    r = scene.render
    r.resolution_x = width or preset["width"]
    r.resolution_y = round(r.resolution_x / aspect)
    r.resolution_percentage = 100
    r.film_transparent = False
    r.use_compositing = False
    r.use_sequencer = False
    if crop:
        r.use_border, r.use_crop_to_border = True, True
        r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = crop
    img = r.image_settings
    img.file_format = "PNG"
    img.color_mode = "RGB"
    img.color_depth = "16"
    img.compression = 15

    if engine == "eevee":
        r.engine = "BLENDER_EEVEE"
        e = scene.eevee
        e.taa_render_samples = preset["samples"]
        e.use_shadows = True
        e.shadow_ray_count = 3 if quality != "preview" else 1
        e.shadow_step_count = 12 if quality != "preview" else 6
        e.shadow_resolution_scale = 1.0
        # 1024 MB fails silently on shared-memory GPUs (black frames); light cutoffs keep 512 enough
        e.shadow_pool_size = "512"
        e.use_raytracing = preset["raytracing"]
        e.ray_tracing_method = "SCREEN"
        e.ray_tracing_options.resolution_scale = "1" if quality != "preview" else "2"
        e.ray_tracing_options.use_denoise = True
        e.use_fast_gi = True
        e.fast_gi_method = "GLOBAL_ILLUMINATION"
        e.fast_gi_resolution = "2" if quality != "preview" else "4"
        e.fast_gi_ray_count = 4
        e.fast_gi_step_count = 12
        e.fast_gi_distance = 6.0
        e.use_volumetric_shadows = quality != "preview"
        e.volumetric_end = 400.0
        e.volumetric_tile_size = "4" if quality != "preview" else "8"
        e.volumetric_samples = 64 if quality != "preview" else 32
        e.clamp_surface_indirect = 10.0
    else:
        r.engine = "CYCLES"
        c = scene.cycles
        c.device = "CPU"
        c.samples = preset["samples"]
        c.use_adaptive_sampling = True
        c.adaptive_threshold = preset["threshold"]
        c.adaptive_min_samples = 32
        c.use_denoising = True
        c.denoiser = "OPENIMAGEDENOISE"
        c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
        c.denoising_prefilter = "ACCURATE"
        c.denoising_quality = "HIGH"
        c.seed = SEED
        c.use_animated_seed = False
        c.use_light_tree = True
        c.sample_clamp_direct = 0.0
        c.sample_clamp_indirect = 10.0
        c.max_bounces = 12
        c.diffuse_bounces = 4
        c.glossy_bounces = 4
        c.transmission_bounces = 12
        c.transparent_max_bounces = 16
        c.volume_bounces = 0
        c.caustics_reflective = False
        c.caustics_refractive = False
        r.use_persistent_data = True
        r.threads_mode = "AUTO"


def _save(path, meta):
    """Render the current scene and write path (16-bit PNG) and its .json sidecar atomically."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    start = time.time()
    tmp = path[:-4] + ".tmp.png"
    for attempt in range(1, RETRIES + 2):
        bpy.ops.render.render()
        bpy.data.images["Render Result"].save_render(filepath=tmp)
        if not _blank(tmp):
            break
        os.remove(tmp)
        if attempt > RETRIES:
            raise BlankRender(f"{path} rendered black {attempt} times (EEVEE out of GPU shadow memory?)")
        print(f"blank render for {path}; retrying ({attempt}/{RETRIES})", flush=True)
    meta = dict(meta, seconds=round(time.time() - start, 1))
    os.replace(tmp, path)
    side = path[:-4] + ".json"
    with open(side + ".tmp", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    os.replace(side + ".tmp", side)
    print(f"wrote {path} ({meta['seconds']}s)", flush=True)
    return meta


def still(path, meta):
    return _save(path, meta)


def clean_partials(folder):
    if not os.path.isdir(folder):
        return
    for name in os.listdir(folder):
        if name.endswith(".tmp.png") or name.endswith(".json.tmp"):
            os.remove(os.path.join(folder, name))


def frames(folder, first, last, at, set_state, meta, step=1, extra=None):
    """Render frames first..last (every step-th) into folder/NNNN.png, skipping any already written.

    at(frame) -> (build, time_of_day); set_state(build, tod) applies them.
    extra(frame) -> dict of more sidecar fields, applied before rendering (a sequence moves the camera here).
    """
    clean_partials(folder)
    done = total = 0
    for frame in range(first, last + 1, step):
        total += 1
        path = os.path.join(folder, f"{frame:04d}.png")
        if os.path.exists(path):
            continue
        build, tod = at(frame)
        bpy.context.scene.frame_set(frame)
        set_state(build, tod)
        more = extra(frame) if extra else {}
        _save(path, dict(meta, frame=frame, build=round(build, 4), time_of_day=round(tod, 4), **more))
        done += 1
    print(f"{done} frames rendered, {total - done} already present", flush=True)
