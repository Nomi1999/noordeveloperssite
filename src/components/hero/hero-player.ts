/**
 * Scroll-scrubbed frame player for the home hero (ScrollBuildHero.astro).
 *
 * - Native scroll only: the scroll position through the section picks a target
 *   frame and the shown frame eases toward it on requestAnimationFrame, which
 *   runs only while the hero is on screen and the two differ.
 * - One orientation, one size tier, one format: frames load as compressed Blobs
 *   in passes of falling stride (32, 16 … 1), nearest first, so the whole range is
 *   playable early. The nearest loaded frame stands in until the exact one arrives.
 * - Memory: only a window of ±W frames around the current one is decoded to
 *   ImageBitmaps (W = 24, or 10 on mobile and low-memory devices); bitmaps
 *   leaving the window are closed.
 * - Main thread: frames are decoded in two Web Workers (hero-decoder.ts), already
 *   cropped and scaled to the canvas, so drawing is a 1:1 copy of finished pixels.
 *   Decoding on the page (even createImageBitmap) costs a long main-thread task
 *   per frame, at load and while scrubbing; it is only the fallback.
 *
 * Add ?hero-debug to the URL for an overlay with frame, decoded count and rAF ticks.
 */

type Orientation = "landscape" | "portrait";
type Format = "avif" | "webp";

interface Manifest {
  frameCount: number;
  phases: { start: number | null; end: number | null }[];
  orientations: Partial<
    Record<Orientation, { tiers: { id: string; width: number; height: number; formats: Record<Format, { url: string }> }[] }>
  >;
}

const STRIDES = [32, 16, 8, 4, 2, 1];
const CONCURRENCY = 6;
const DECODE_CONCURRENCY = 3;
const SMOOTHING_MS = 90;
const PHASES = 6;
const AVIF_PROBE =
  "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAZQmMEwAA0AACQQM6Xt10S";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

async function supportsAvif(): Promise<boolean> {
  const img = new Image();
  img.src = AVIF_PROBE;
  try {
    await img.decode();
    return img.naturalWidth > 0;
  } catch {
    return false;
  }
}

const isMobile = () =>
  matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export function start(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-hero-stage]")!;
  const canvas = root.querySelector<HTMLCanvasElement>("[data-hero-canvas]")!;
  const poster = root.querySelector<HTMLImageElement>("[data-hero-poster]")!;
  const fill = root.querySelector<HTMLElement>("[data-hero-fill]");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const debug = new URLSearchParams(location.search).has("hero-debug");
  const windowSize = isMobile() || (nav.deviceMemory ?? 8) <= 4 ? 10 : 24;

  let frameCount = 192;
  let ranges = Array.from({ length: PHASES }, (_, i) => [Math.round((i * 192) / PHASES), Math.round(((i + 1) * 192) / PHASES) - 1]);
  let manifest: Manifest | null = null;
  let format: Format = "webp";

  // Playback state
  let visible = false;
  let target = 0; // frame the scroll position asks for
  let shown = 0; // eased frame (float)
  let progress = 0;
  let raf = 0;
  let last = 0;
  let drawn = -1; // frame index on the canvas
  let dirty = true; // canvas needs a redraw (resize, better frame decoded)
  let phase = 0;

  // Sequence state, per orientation
  let orientation: Orientation = innerWidth < innerHeight ? "portrait" : "landscape";
  let urlPattern = "";
  let frameW = 1920; // the chosen tier's frame size
  let frameH = 1080;
  let blobs = new Map<number, Blob>();
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  let queue: number[] = [];
  let passIndex = 0;
  let scheduled = new Set<number>();
  let inflight = 0;
  let abort = new AbortController();
  let generation = 0;
  let ticks = 0;
  let maxDecoded = 0;
  const failures = new Map<number, number>();
  const MAX_TRIES = 3;

  // ---------- scroll → target ----------
  function measure() {
    const rect = root.getBoundingClientRect();
    const span = rect.height - stage.clientHeight;
    progress = span > 0 ? clamp(-rect.top / span) : 0;
    target = progress * (frameCount - 1);
  }

  function kick() {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function onScroll() {
    if (!visible) return;
    measure();
    kick();
  }

  function tick(now: number) {
    raf = 0;
    ticks++;
    const dt = Math.min(100, now - last);
    last = now;
    shown += (target - shown) * (1 - Math.exp(-dt / SMOOTHING_MS));
    if (Math.abs(target - shown) < 0.02) shown = target;
    const frame = Math.round(shown);

    updateOverlays(frame);
    updateWindow(frame);
    draw(frame);
    if (debug) showDebug(frame);
    if (visible && shown !== target) raf = requestAnimationFrame(tick);
  }

  // ---------- overlays ----------
  function updateOverlays(frame: number) {
    if (fill) fill.style.transform = `scaleY(${(shown / (frameCount - 1)).toFixed(4)})`;
    let p = 0;
    for (let i = 0; i < ranges.length; i++) if (frame >= ranges[i][0]) p = i;
    if (p !== phase) {
      phase = p;
      stage.dataset.phase = String(p);
    }
  }

  // ---------- drawing ----------
  function nearestDecoded(frame: number): number {
    if (bitmaps.has(frame)) return frame;
    let best = -1;
    for (const f of bitmaps.keys()) if (best < 0 || Math.abs(f - frame) < Math.abs(best - frame)) best = f;
    return best;
  }

  /** Canvas backing size: the stage in device pixels, at most 2x. */
  function canvasSize(): [number, number] {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return [Math.max(1, Math.round(stage.clientWidth * dpr)), Math.max(1, Math.round(stage.clientHeight * dpr))];
  }

  function draw(frame: number) {
    const f = nearestDecoded(frame);
    if (f < 0) return; // nothing decoded yet: the poster (or the last drawn frame) stays on screen
    const [w, h] = canvasSize();
    let resized = false;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawn = -1;
      resized = true;
    }
    if (f === drawn && !dirty) return;
    const bmp = bitmaps.get(f)!;
    const s = Math.max(w / bmp.width, h / bmp.height);
    const dw = bmp.width * s;
    const dh = bmp.height * s;
    ctx!.imageSmoothingQuality = "high";
    ctx!.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
    drawn = f;
    dirty = false; // a closer frame decoding sets it again and kicks the loop
    if (!stage.hasAttribute("data-ready")) stage.setAttribute("data-ready", "");
    if (resized) {
      // Bitmaps were cut for the old size: drop all but this one (scaled meanwhile) and decode afresh
      for (const [k, b] of bitmaps) if (k !== f) (b.close(), bitmaps.delete(k));
      updateWindow(frame);
    }
  }

  // ---------- decoding (workers) ----------
  const workers: Worker[] = [];
  const replies = new Map<number, [(b: ImageBitmap) => void, (e: unknown) => void]>();
  let requestId = 0;
  try {
    for (let i = 0; i < 2; i++) {
      const w = new Worker(new URL("./hero-decoder.ts", import.meta.url), { type: "module" });
      w.onmessage = ({ data }) => {
        const r = replies.get(data.id);
        replies.delete(data.id);
        if (r) data.bmp ? r[0](data.bmp) : r[1](data.error);
      };
      workers.push(w);
    }
  } catch {
    // no module workers: decode on the page
  }

  /** Decode a frame cropped (cover-fit) and scaled to the canvas. */
  function decodeFor(blob: Blob): Promise<ImageBitmap> {
    const [w, h] = canvasSize();
    const s = Math.max(w / frameW, h / frameH);
    const sw = Math.min(frameW, w / s);
    const sh = Math.min(frameH, h / s);
    const crop: [number, number, number, number] = [
      Math.round((frameW - sw) / 2),
      Math.round((frameH - sh) / 2),
      Math.round(sw),
      Math.round(sh),
    ];
    if (workers.length) {
      const id = ++requestId;
      return new Promise((ok, fail) => {
        replies.set(id, [ok, fail]);
        workers[id % workers.length].postMessage({ id, blob, crop, size: [w, h] });
      });
    }
    return createImageBitmap(blob, ...crop, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" }).catch(() =>
      createImageBitmap(blob),
    );
  }

  // ---------- decoded window ----------
  const inWindow = (f: number, frame: number) => Math.abs(f - frame) <= windowSize;

  function nearestLoaded(frame: number): number {
    let best = -1;
    for (const f of blobs.keys()) if (best < 0 || Math.abs(f - frame) < Math.abs(best - frame)) best = f;
    return best;
  }

  /**
   * Decode what's loaded within ±windowSize (nearest first) and close everything outside.
   * When nothing loaded is inside the window yet, the nearest loaded frame anywhere is the
   * one decoded frame kept, so the count never exceeds 2 × windowSize + 1.
   */
  function updateWindow(frame: number) {
    const want: number[] = [];
    let loadedInWindow = false;
    for (let d = 0; d <= windowSize; d++) {
      for (const f of d ? [frame - d, frame + d] : [frame]) {
        if (!blobs.has(f)) continue;
        loadedInWindow = true;
        if (!bitmaps.has(f) && !decoding.has(f)) want.push(f);
      }
    }
    if (!loadedInWindow && blobs.size) {
      const f = nearestLoaded(frame);
      if (!bitmaps.has(f) && !decoding.has(f)) want.push(f);
    }

    let decodedInWindow = 0;
    for (const f of bitmaps.keys()) if (inWindow(f, frame)) decodedInWindow++;
    const keep = nearestDecoded(frame);
    for (const [f, bmp] of bitmaps) {
      if (!inWindow(f, frame) && (decodedInWindow > 0 || f !== keep)) {
        bmp.close();
        bitmaps.delete(f);
      }
    }

    for (const f of want) {
      if (decoding.size >= DECODE_CONCURRENCY) break;
      decode(f);
    }
  }

  function decode(f: number) {
    const blob = blobs.get(f);
    if (!blob) return;
    const gen = generation;
    decoding.add(f);
    decodeFor(blob)
      .then((bmp) => {
        decoding.delete(f);
        if (gen !== generation) return bmp.close(); // orientation changed meanwhile
        const frame = Math.round(shown);
        let decodedInWindow = 0;
        for (const k of bitmaps.keys()) if (inWindow(k, frame)) decodedInWindow++;
        if (!inWindow(f, frame) && decodedInWindow > 0) return bmp.close(); // scrolled away meanwhile
        bitmaps.set(f, bmp);
        if (drawn < 0 || Math.abs(f - frame) < Math.abs(drawn - frame)) dirty = true;
        updateWindow(frame);
        maxDecoded = Math.max(maxDecoded, bitmaps.size);
        if (dirty) {
          // Draw now even if the loop is idle (the scroll target hasn't moved)
          draw(frame);
          if (debug) showDebug(frame);
        }
      })
      .catch(() => {
        decoding.delete(f);
        if (gen === generation) fail(f); // corrupt: fetch again later
      });
  }

  // ---------- loading ----------
  function nextPass() {
    while (passIndex < STRIDES.length) {
      const stride = STRIDES[passIndex++];
      const here = Math.round(target);
      const pass: number[] = [];
      for (let f = 0; f < frameCount; f += stride) if (!scheduled.has(f)) pass.push(f);
      if (passIndex === 1 && !scheduled.has(frameCount - 1)) pass.push(frameCount - 1); // the end is reachable early too
      if (pass.length) {
        pass.sort((a, b) => Math.abs(a - here) - Math.abs(b - here));
        for (const f of pass) scheduled.add(f);
        queue = pass;
        return true;
      }
    }
    // Anything that failed gets another try once every pass has run
    const missing: number[] = [];
    for (let f = 0; f < frameCount; f++) {
      if (!blobs.has(f) && !scheduled.has(f) && (failures.get(f) ?? 0) < MAX_TRIES) missing.push(f);
    }
    queue = missing;
    for (const f of missing) scheduled.add(f);
    return missing.length > 0;
  }

  function pump() {
    while (inflight < CONCURRENCY) {
      if (!queue.length && !nextPass()) return;
      const f = queue.shift()!;
      load(f);
    }
  }

  function load(f: number) {
    const gen = generation;
    inflight++;
    const url = urlPattern.replace("{frame}", String(f).padStart(4, "0"));
    fetch(url, { signal: abort.signal, priority: "low" } as RequestInit)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
      .then(
        (blob) => {
          if (gen !== generation) return;
          blobs.set(f, blob);
          updateWindow(Math.round(shown));
        },
        () => {
          if (gen === generation) fail(f);
        },
      )
      .finally(() => {
        if (gen !== generation) return;
        inflight--;
        pump();
      });
  }

  function fail(f: number) {
    blobs.delete(f);
    scheduled.delete(f); // retried after the last pass, up to MAX_TRIES times
    failures.set(f, (failures.get(f) ?? 0) + 1);
  }

  function chooseSequence() {
    if (!manifest) return;
    const o = manifest.orientations[orientation] ?? manifest.orientations.landscape ?? manifest.orientations.portrait;
    if (!o) return;
    const tiers = [...o.tiers].sort((a, b) => a.width - b.width); // smallest first
    // Device pixels the frame's width covers once cover-fit to the stage
    const aspect = tiers[0].width / tiers[0].height;
    const need = Math.max(stage.clientWidth, stage.clientHeight * aspect) * Math.min(devicePixelRatio || 1, 2);
    // The smallest tier that is sharp at that size, else the largest; reduced data always takes the smallest
    const tier = nav.connection?.saveData ? tiers[0] : (tiers.find((t) => t.width >= need) ?? tiers[tiers.length - 1]);
    urlPattern = tier.formats[format]?.url ?? tier.formats.webp.url;
    frameW = tier.width;
    frameH = tier.height;
  }

  function resetSequence() {
    generation++;
    abort.abort();
    abort = new AbortController();
    // The canvas keeps showing its last frame (cover-fit by CSS) until the new orientation's first frame decodes
    for (const bmp of bitmaps.values()) bmp.close();
    bitmaps.clear();
    drawn = -1;
    failures.clear();
    blobs = new Map();
    decoding.clear();
    scheduled = new Set();
    queue = [];
    passIndex = 0;
    inflight = 0;
    chooseSequence();
    pump();
  }

  function switchedOrientation() {
    const o: Orientation = innerWidth < innerHeight ? "portrait" : "landscape";
    if (o === orientation) return;
    orientation = o;
    resetSequence();
  }

  function onResize() {
    // Only a real orientation change (aspect ratio crossing 1) switches sequences;
    // address-bar show/hide only resizes the canvas.
    switchedOrientation();
    dirty = true;
    measure();
    kick();
  }

  // ---------- debug ----------
  let panel: HTMLElement | null = null;
  function showDebug(frame: number) {
    if (!panel) {
      panel = document.createElement("pre");
      panel.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:1000;margin:0;padding:6px 8px;background:#000c;color:#f2a93b;font:12px/1.4 monospace;pointer-events:none";
      document.body.append(panel);
    }
    stage.dataset.frame = String(frame);
    stage.dataset.decoded = String(bitmaps.size);
    panel.textContent =
      `frame ${frame} (target ${target.toFixed(1)}) drawn ${drawn}\n` +
      `phase ${phase} progress ${progress.toFixed(3)}\n` +
      `${orientation} ${urlPattern.split("/").slice(-2, -1)[0] ?? ""} ${format}\n` +
      `loaded ${blobs.size}/${frameCount} pass ${STRIDES[Math.max(0, passIndex - 1)]}\n` +
      `decoded ${bitmaps.size} (max ${maxDecoded}, limit ${2 * windowSize + 1})\n` +
      `rAF ticks ${ticks} ${visible ? "visible" : "off-screen"}`;
  }

  // ---------- start ----------
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      measure();
      dirty = true;
      kick();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      if (debug) showDebug(Math.round(shown));
    }
  }).observe(root);

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize, { passive: true });
  screen.orientation?.addEventListener?.("change", onResize);

  measure();
  shown = target;

  const manifestUrl = "/hero/manifest.json";
  // Frames start loading only once the poster is on screen
  const posterReady = (
    poster.complete
      ? Promise.resolve()
      : new Promise((r) => {
          poster.addEventListener("load", r, { once: true });
          poster.addEventListener("error", r, { once: true });
        })
  ).then(() => poster.decode().catch(() => {}));
  Promise.all([
    fetch(manifestUrl, { priority: "low" } as RequestInit).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    supportsAvif(),
    posterReady,
  ])
    .then(([m, avif]: [Manifest, boolean, unknown]) => {
      manifest = m;
      frameCount = m.frameCount;
      if (m.phases?.length) ranges = m.phases.map((p, i) => [p.start ?? ranges[i]?.[0] ?? 0, p.end ?? ranges[i]?.[1] ?? 0]);
      format = avif ? "avif" : "webp";
      measure();
      shown = target;
      chooseSequence();
      pump();
      kick();
    })
    .catch(() => {
      // No manifest: the poster stays and the phase overlays still follow the scroll
    });
}
