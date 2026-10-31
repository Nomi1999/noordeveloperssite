// Turns rendered 16-bit PNGs (render/out/) into the site's image assets.
//
//   node scripts/encode-renders.mjs stills [--engine cycles] [--quality final]
//       every shot in render/shots/*.json → src/assets/renders/<design>/<shot>.jpg (JPEG q90 master)
//   node scripts/encode-renders.mjs share --design 1-kanal --shot front-day [--focus 0.5,0.55] [--zoom 1]
//       a 1200×630 crop of a delivered still → public/og/<design>.jpg
//   node scripts/encode-renders.mjs sequence <frames folder> --orientation landscape|portrait [--out public/hero]
//       every frame → AVIF and WebP at two tiers, plus <out>/manifest.json
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
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

export const MANIFEST_VERSION = 1;
export const TIERS = {
  landscape: [
    { id: "1080", width: 1920, height: 1080 },
    { id: "720", width: 1280, height: 720 },
  ],
  portrait: [
    { id: "1080", width: 1080, height: 1920 },
    { id: "720", width: 720, height: 1280 },
  ],
};
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
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(root, "render/shots", f), "utf8"))]);

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

/** First and last frame index of each phase, from each frame's build value (0–6). */
export function phaseRanges(builds) {
  return PHASES.map((p, k) => {
    const idx = builds
      .map((b, i) => [b, i])
      .filter(([b]) => (k === PHASES.length - 1 ? b >= k : b >= k && b < k + 1))
      .map(([, i]) => i);
    return { ...p, start: idx.length ? idx[0] : null, end: idx.length ? idx[idx.length - 1] : null };
  });
}

async function sequence() {
  const folder = positional[0];
  const orientation = opt("orientation");
  const outDir = join(root, opt("out", "public/hero"));
  if (!folder || !TIERS[orientation]) throw new Error("sequence needs <folder> and --orientation landscape|portrait");
  const avifQuality = Number(opt("avif", "55"));
  const webpQuality = Number(opt("webp", "80"));
  const frames = readdirSync(folder)
    .filter((f) => /^\d{4}\.png$/.test(f))
    .sort();
  if (!frames.length) throw new Error(`No frames (NNNN.png) in ${folder}`);
  const builds = frames.map((f) => JSON.parse(readFileSync(join(folder, f.replace(".png", ".json")), "utf8")).build);
  const totals = {};
  for (const tier of TIERS[orientation]) {
    totals[tier.id] = { avif: 0, webp: 0 };
    const dir = join(outDir, orientation, tier.id);
    for (const [i, f] of frames.entries()) {
      const name = String(i).padStart(4, "0");
      const base = sharp(join(folder, f)).resize(tier.width, tier.height, { fit: "cover" });
      totals[tier.id].avif += await writeAtomic(
        join(dir, `${name}.avif`),
        base.clone().avif({ quality: avifQuality, effort: 4, chromaSubsampling: "4:4:4" }),
      );
      totals[tier.id].webp += await writeAtomic(join(dir, `${name}.webp`), base.clone().webp({ quality: webpQuality, effort: 5 }));
    }
  }

  const manifestPath = join(outDir, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { schemaVersion: MANIFEST_VERSION, frameCount: frames.length, frameDigits: 4, phases: [], orientations: {} };
  if (manifest.frameCount !== frames.length) {
    throw new Error(`${orientation} has ${frames.length} frames but the manifest says ${manifest.frameCount}; re-encode both orientations`);
  }
  manifest.phases = phaseRanges(builds);
  manifest.orientations[orientation] = {
    poster: Number(opt("poster", String(frames.length - 1))),
    tiers: TIERS[orientation].map((t) => ({
      id: t.id,
      width: t.width,
      height: t.height,
      formats: Object.fromEntries(
        ["avif", "webp"].map((ext) => [ext, { url: `/hero/${orientation}/${t.id}/{frame}.${ext}`, bytes: totals[t.id][ext] }]),
      ),
    })),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  for (const t of TIERS[orientation]) {
    const mb = (n) => (n / 1048576).toFixed(2);
    console.log(`${orientation} ${t.width}×${t.height}: avif ${mb(totals[t.id].avif)} MB, webp ${mb(totals[t.id].webp)} MB`);
  }
  console.log(`Wrote ${frames.length} frames per tier and ${manifestPath}`);
}

const commands = { stills, share, sequence };
if (!commands[command]) {
  console.error("usage: node scripts/encode-renders.mjs <stills|share|sequence> [options] (see the header of this file)");
  process.exit(1);
}
await commands[command]();
