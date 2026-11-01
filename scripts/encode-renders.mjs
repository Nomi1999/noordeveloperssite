// Turns rendered 16-bit PNGs (render/out/) into the site's image assets.
//
//   node scripts/encode-renders.mjs stills [--engine cycles] [--quality final]
//       every shot in render/shots/*.json → src/assets/renders/<design>/<shot>.jpg (JPEG q90 master)
//   node scripts/encode-renders.mjs share --design 1-kanal --shot front-day [--focus 0.5,0.55] [--zoom 1]
//       a 1200×630 crop of a delivered still → public/og/<design>.jpg
//   node scripts/encode-renders.mjs video <frames folder> --orientation landscape|portrait [--out public/hero]
//         [--fps 24] [--crf-av1 34] [--crf-h264 22]
//       the frame sequence → <out>/video/<orientation>.av1.mp4 and .h264.mp4 (ffmpeg on PATH), the first frame as
//       <out>/first/<orientation>.webp, plus <out>/manifest.json
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const [command, ...rest] = process.argv.slice(2);
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};

export const MANIFEST_VERSION = 2;
/** Playback rate of the hero video: 192 frames → 8 s */
export const VIDEO_FPS = 24;
/**
 * Size tiers of a rendered image (the hero posters in scripts/enhance-renders.mjs follow them): the full size and two thirds of it,
 * never upscaled. Named by the short side, so 1920×1080 gives tiers "1080" and "720", and 960×540
 * gives "540" and "360".
 */
export function tiersFor(width, height) {
  const short = Math.min(width, height);
  return [1, 2 / 3].map((k) => {
    const w = Math.round((width * k) / 2) * 2;
    const h = Math.round((height * k) / 2) * 2;
    return { id: String(Math.round(short * k)), width: w, height: h };
  });
}
export const PHASES = [
  { id: "design", name: "Design" },
  { id: "foundation", name: "Foundation" },
  { id: "structure", name: "Structure" },
  { id: "walls", name: "Walls" },
  { id: "finishing", name: "Finishing" },
  { id: "complete", name: "Complete" },
];
const STILL_MIN_WIDTH = 3200;

/** Write a file via a temporary name so an interrupted run never leaves a partial file. */
async function writeAtomic(path, pipeline) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await pipeline.toFile(tmp);
  renameSync(tmp, path);
  return statSync(path).size;
}

const shotFiles = () =>
  readdirSync(join(root, "render/shots"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(root, "render/shots", f), "utf8"))])
    .filter(([, config]) => config.shots); // sequence configs (e.g. 1-kanal-hero-landscape) have no stills

async function stills() {
  const engine = opt("engine", "cycles");
  const quality = opt("quality", "final");
  const missing = [];
  for (const [design, config] of shotFiles()) {
    for (const shot of Object.keys(config.shots)) {
      const src = join(root, "render/out", design, "stills", `${shot}-${engine}-${quality}.png`);
      if (!existsSync(src)) {
        missing.push(`${design}/${shot}`);
        continue;
      }
      const { width, height } = await sharp(src).metadata();
      if (width < STILL_MIN_WIDTH) throw new Error(`${src} is ${width}px wide; stills must be at least ${STILL_MIN_WIDTH}px`);
      const out = join(root, "src/assets/renders", design, `${shot}.jpg`);
      const bytes = await writeAtomic(out, sharp(src).jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true }));
      console.log(`${design}/${shot}: ${width}×${height} → ${(bytes / 1024).toFixed(0)} KB`);
    }
  }
  if (missing.length) {
    console.error(`Not rendered yet (${engine} ${quality}): ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function share() {
  const design = opt("design");
  const shot = opt("shot");
  if (!design || !shot) throw new Error("share needs --design and --shot");
  const [fx, fy] = opt("focus", "0.5,0.5").split(",").map(Number);
  const zoom = Number(opt("zoom", "1"));
  const src = join(root, "src/assets/renders", design, `${shot}.jpg`);
  if (!existsSync(src)) throw new Error(`${src} not found; run the stills command first`);
  const { width, height } = await sharp(src).metadata();
  // largest 1200:630 window at this zoom, centred on the focus point and kept inside the image
  const cw = Math.min(width, Math.round((height * 1200) / 630)) / zoom;
  const ch = (cw * 630) / 1200;
  const left = Math.round(Math.min(Math.max(fx * width - cw / 2, 0), width - cw));
  const top = Math.round(Math.min(Math.max(fy * height - ch / 2, 0), height - ch));
  const out = join(root, "public/og", `${design}.jpg`);
  const bytes = await writeAtomic(
    out,
    sharp(src)
      .extract({ left, top, width: Math.round(cw), height: Math.round(ch) })
      .resize(1200, 630)
      .jpeg({ quality: 86, mozjpeg: true }),
  );
  console.log(`${out}: 1200×630 from ${shot} (${(bytes / 1024).toFixed(0)} KB)`);
}

/**
 * First and last frame index of each phase. Each entry is a frame's sidecar: its `phase`
 * (written by keyed sequences, which hold a finished step at the end of its phase) or,
 * failing that, the phase its `build` value (0–6) falls in.
 */
export function phaseRanges(sidecars) {
  const phaseOf = (m) =>
    Number.isInteger(m.phase) ? m.phase : Math.min(PHASES.length - 1, Math.max(0, Math.floor(m.build ?? 0)));
  return PHASES.map((p, k) => {
    const idx = sidecars
      .map((m, i) => [phaseOf(m), i])
      .filter(([phase]) => phase === k)
      .map(([, i]) => i);
    return { ...p, start: idx.length ? idx[0] : null, end: idx.length ? idx[idx.length - 1] : null };
  });
}

/** Run ffmpeg (on PATH) and reject with its stderr on failure. */
function ffmpeg(args) {
  return new Promise((ok, fail) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", fail);
    p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}: ${err}`))));
  });
}

/**
 * The hero's video encodings, smallest first; the player takes the first one canPlayType accepts.
 * AV1 for current browsers, H.264 for everything else. 24 fps, no audio, yuv420p.
 */
export const VIDEO_CODECS = [
  {
    id: "av1",
    type: 'video/mp4; codecs="av01.0.04M.08"',
    args: (crf) => ["-c:v", "libsvtav1", "-crf", String(crf ?? 34), "-preset", "4", "-svtav1-params", "tune=0"],
  },
  {
    id: "h264",
    type: 'video/mp4; codecs="avc1.4d401f"',
    args: (crf) => ["-c:v", "libx264", "-crf", String(crf ?? 22), "-preset", "slow", "-profile:v", "main", "-tune", "film"],
  },
];

async function video() {
  const folder = positional[0];
  const orientation = opt("orientation");
  const outDir = join(root, opt("out", "public/hero"));
  if (!folder || !["landscape", "portrait"].includes(orientation)) throw new Error("video needs <folder> and --orientation landscape|portrait");
  const fps = Number(opt("fps", String(VIDEO_FPS)));
  const frames = readdirSync(folder)
    .filter((f) => /^\d{4}\.png$/.test(f))
    .sort();
  if (!frames.length) throw new Error(`No frames (NNNN.png) in ${folder}`);
  frames.forEach((f, i) => {
    if (f !== `${String(i).padStart(4, "0")}.png`) throw new Error(`${folder}: frame ${i} is missing (found ${f})`);
  });
  const sidecars = frames.map((f) => JSON.parse(readFileSync(join(folder, f.replace(".png", ".json")), "utf8")));
  const size = await sharp(join(folder, frames[0])).metadata();
  if ((size.width > size.height) !== (orientation === "landscape")) throw new Error(`${folder} frames are ${size.width}×${size.height}, not ${orientation}`);

  const sources = [];
  for (const codec of VIDEO_CODECS) {
    const name = `${orientation}.${codec.id}.mp4`;
    const out = join(outDir, "video", name);
    mkdirSync(dirname(out), { recursive: true });
    const tmp = `${out}.tmp.mp4`;
    const crf = opt(`crf-${codec.id}`);
    await ffmpeg([
      "-framerate", String(fps), "-i", join(folder, "%04d.png"),
      ...codec.args(crf && Number(crf)),
      "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", tmp,
    ]);
    renameSync(tmp, out);
    const bytes = statSync(out).size;
    sources.push({ url: `/hero/video/${name}`, type: codec.type, bytes });
    console.log(`${orientation} ${codec.id}: ${size.width}×${size.height}, ${frames.length} frames at ${fps} fps → ${(bytes / 1048576).toFixed(2)} MB`);
  }

  // The first frame as a still: what motion mode paints before the video's own first frame arrives
  // (WebP only: it is a CSS background, and image-set() with types can't fall back through a custom property)
  const firstOut = join(outDir, "first", `${orientation}.webp`);
  const w = await writeAtomic(firstOut, sharp(join(folder, frames[0])).webp({ quality: 80, effort: 5 }));
  console.log(`${orientation} first frame: ${(w / 1024).toFixed(0)} KB`);

  const manifestPath = join(outDir, "manifest.json");
  const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  const manifest =
    prev?.schemaVersion === MANIFEST_VERSION
      ? prev
      : { schemaVersion: MANIFEST_VERSION, fps, frameCount: frames.length, phases: [], orientations: {} };
  if (manifest.frameCount !== frames.length || manifest.fps !== fps) {
    throw new Error(
      `${orientation} has ${frames.length} frames at ${fps} fps but the manifest says ${manifest.frameCount} at ${manifest.fps}; re-encode both orientations`,
    );
  }
  manifest.phases = phaseRanges(sidecars);
  manifest.orientations[orientation] = { width: size.width, height: size.height, sources };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote ${manifestPath}`);
}

const commands = { stills, share, video };
if (!commands[command]) {
  console.error("usage: node scripts/encode-renders.mjs <stills|share|video> [options] (see the header of this file)");
  process.exit(1);
}
await commands[command]();
