/**
 * Build-video player for the home hero (BuildVideoHero.astro).
 *
 * - Starts at once: the video's source is set as soon as this runs (the manifest is
 *   embedded in data-manifest) and it plays whenever the hero is in view. Until its
 *   first frame arrives, CSS paints that frame (the blueprint) under it; data-phase
 *   leaves "intro" once it is playing.
 * - Plays once. At the end the stage takes data-ended: the video fades back out to
 *   the poster (the photoreal version of the last frame), the Move in phase and both
 *   actions stay up, and the toggle offers Replay.
 * - Phase overlays and the ruler follow the playing frame (requestVideoFrameCallback,
 *   else requestAnimationFrame, only while playing). A ruler tick seeks to its phase.
 * - The toggle pauses and resumes (WCAG 2.2.2). Off screen or in a hidden tab the
 *   video pauses and resumes when back, unless the visitor paused it.
 * - One orientation at a time (portrait when the viewport is taller than wide); the
 *   first source in the manifest the browser can play (AV1, else H.264). A real
 *   orientation change swaps the source at the same time position.
 *
 * Add ?hero-debug to the URL for an overlay with time, frame, phase and source.
 */
import { withBase } from "../../lib/paths.ts";

type Orientation = "landscape" | "portrait";
type ToggleState = "pause" | "play" | "replay";

interface Manifest {
  fps: number;
  frameCount: number;
  phases: { start: number | null; end: number | null }[];
  orientations: Partial<Record<Orientation, { width: number; height: number; sources: { url: string; type: string }[] }>>;
}

const PHASES = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const viewportOrientation = (): Orientation => (innerWidth < innerHeight ? "portrait" : "landscape");

export function start(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-hero-stage]")!;
  const video = root.querySelector<HTMLVideoElement>("[data-hero-video]")!;
  const fill = root.querySelector<HTMLElement>("[data-hero-fill]");
  const toggle = root.querySelector<HTMLButtonElement>("[data-hero-toggle]");
  const tickButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-hero-jump]")];
  const debug = new URLSearchParams(location.search).has("hero-debug");

  let fps = 24;
  let frameCount = 192;
  let ranges = Array.from({ length: PHASES }, (_, i) => [(i * 192) / PHASES, ((i + 1) * 192) / PHASES - 1]);
  let manifest: Manifest | null = null;
  let orientation = viewportOrientation();
  let source = "";

  let started = false; // playback has been asked for
  let userPaused = false;
  let visible = false;
  let phase: number | "intro" = "intro";

  // ---------- overlays ----------
  function setPhase(p: number | "intro") {
    if (p === phase) return;
    phase = p;
    stage.dataset.phase = String(p);
    tickButtons.forEach((t, i) => (i === p ? t.setAttribute("aria-current", "step") : t.removeAttribute("aria-current")));
  }

  function update(time = video.currentTime) {
    const frame = clamp(Math.round(time * fps), 0, frameCount - 1);
    if (fill) fill.style.transform = `scaleY(${(frame / (frameCount - 1)).toFixed(4)})`;
    let p = 0;
    for (let i = 0; i < ranges.length; i++) if (frame >= ranges[i][0]) p = i;
    setPhase(p);
    if (debug) showDebug(time, frame);
  }

  function setToggle(state: ToggleState) {
    if (!toggle) return;
    toggle.dataset.state = state;
    toggle.hidden = false;
  }

  // ---------- sync while playing ----------
  const rvfc = "requestVideoFrameCallback" in video;
  let syncHandle = 0;
  function onFrame(_now: number, meta?: { mediaTime: number }) {
    syncHandle = 0;
    // A frame presented before a seek (a tick, Replay) would put back the old phase; "seeked" updates after it
    if (!video.seeking) update(meta?.mediaTime ?? video.currentTime);
    if (!video.paused && !video.ended) loop();
  }
  function loop() {
    if (syncHandle) return;
    syncHandle = rvfc ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
  }
  function stopSync() {
    if (!syncHandle) return;
    if (rvfc) video.cancelVideoFrameCallback(syncHandle);
    else cancelAnimationFrame(syncHandle);
    syncHandle = 0;
  }

  // ---------- playback ----------
  const active = () => visible && !document.hidden;

  function play() {
    video.play().catch(() => {
      // Autoplay refused (e.g. iOS Low Power Mode): the first frame stays and the toggle offers Play
      if (video.paused) setToggle(video.ended ? "replay" : "play");
    });
  }

  /** Start the build as soon as there is a source and the hero is in view */
  function begin() {
    if (started || !source || !active()) return;
    started = true;
    play();
  }

  video.addEventListener("playing", () => {
    started = true;
    delete stage.dataset.ended;
    stage.setAttribute("data-ready", "");
    update(); // leaves "intro": the phase overlays take over from the opening line
    setToggle("pause");
    loop();
  });
  video.addEventListener("pause", () => {
    stopSync();
    if (!video.ended) setToggle("play");
  });
  video.addEventListener("ended", () => {
    stopSync();
    update(video.duration);
    stage.dataset.ended = "";
    setToggle("replay");
  });
  video.addEventListener("seeked", () => {
    if (started) update();
  });

  toggle?.addEventListener("click", () => {
    if (video.ended || stage.hasAttribute("data-ended")) {
      userPaused = false;
      video.currentTime = 0;
      play();
    } else if (video.paused) {
      userPaused = false;
      started = true;
      play();
    } else {
      userPaused = true;
      video.pause();
    }
  });

  /** Seek to the first frame of phase i and play from there */
  function jumpTo(i: number) {
    if (!source) return;
    started = true;
    userPaused = false;
    const startFrame = ranges[i]?.[0] ?? 0;
    // a quarter frame in, so rounding lands inside the phase
    video.currentTime = (startFrame + 0.25) / fps;
    delete stage.dataset.ended;
    stage.setAttribute("data-ready", "");
    update(video.currentTime);
    play();
  }
  for (const t of tickButtons) t.addEventListener("click", () => jumpTo(Number(t.dataset.heroJump)));

  function onActiveChange() {
    if (!active()) {
      if (!video.paused) video.pause(); // not the visitor's pause: resumes when back
    } else if (!started) {
      begin();
    } else if (!userPaused && video.paused && !video.ended && !stage.hasAttribute("data-ended")) {
      play();
    }
  }

  // ---------- sources ----------
  function setSource(time = 0): boolean {
    if (!manifest) return false;
    const entry = manifest.orientations[orientation] ?? manifest.orientations.landscape ?? manifest.orientations.portrait;
    const s = entry?.sources.find((x) => video.canPlayType(x.type) !== "") ?? entry?.sources[entry.sources.length - 1];
    if (!s) return false;
    source = withBase(s.url); // manifest URLs are root-relative
    if (time > 0) video.addEventListener("loadedmetadata", () => (video.currentTime = time), { once: true });
    video.preload = "auto";
    video.src = source;
    return true;
  }

  function onResize() {
    // Only a real orientation change switches sources; address-bar show/hide changes nothing
    const o = viewportOrientation();
    if (o === orientation) return;
    orientation = o;
    if (!source) return;
    const time = video.currentTime;
    const resume = started && !video.paused;
    setSource(time);
    if (resume) play();
  }

  // ---------- debug ----------
  let panel: HTMLElement | null = null;
  function showDebug(time: number, frame: number) {
    if (!panel) {
      panel = document.createElement("pre");
      panel.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:1000;margin:0;padding:6px 8px;background:#000c;color:#f2a93b;font:12px/1.4 monospace;pointer-events:none";
      document.body.append(panel);
    }
    stage.dataset.frame = String(frame);
    panel.textContent =
      `time ${time.toFixed(2)} frame ${frame} phase ${phase}\n` +
      `${video.paused ? (video.ended ? "ended" : "paused") : "playing"}${userPaused ? " (by visitor)" : ""}\n` +
      `${orientation} ${source.split("/").pop() ?? ""}`;
  }

  // ---------- start ----------
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onActiveChange();
  }).observe(root);
  document.addEventListener("visibilitychange", onActiveChange);
  addEventListener("resize", onResize, { passive: true });
  screen.orientation?.addEventListener?.("change", onResize);

  try {
    const m: Manifest = JSON.parse(root.dataset.manifest ?? "");
    fps = m.fps || fps;
    frameCount = m.frameCount || frameCount;
    if (m.phases?.length) ranges = m.phases.map((p, i) => [p.start ?? ranges[i]?.[0] ?? 0, p.end ?? ranges[i]?.[1] ?? 0]);
    manifest = m;
  } catch {
    return; // no manifest: the first frame and the opening copy stay
  }
  if (setSource()) begin();
}
