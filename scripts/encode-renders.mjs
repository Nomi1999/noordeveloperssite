// Turns rendered 16-bit PNGs (render/out/) into the site's image assets.
//
//   node scripts/encode-renders.mjs stills [--engine cycles] [--quality final]
//       every shot in render/shots/*.json → src/assets/renders/<design>/<shot>.jpg (JPEG q90 master)
//   node scripts/encode-renders.mjs share --design 1-kanal --shot front-day [--focus 0.5,0.55] [--zoom 1]
//       a 1200×630 crop of a delivered still → public/og/<design>.jpg
//   node scripts/encode-renders.mjs sequence <frames folder> --orientation landscape|portrait [--out public/hero]
//         [--avif 55] [--webp 80] [--avif-<tier> q] [--tiers <id>,<id>]
//       every frame → AVIF and WebP at two tiers (the frames' own size and two thirds of it, see tiersFor),
//       plus <out>/manifest.json
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
/**
 * Size tiers of a sequence, from the size of its rendered frames: the full size and two thirds of it,
 * never upscaled. Named by the short side, so 1920×1080 frames give tiers "1080" and "720", and the
 * 960×540 frames on the site now give "540" and "360".
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

async function sequence() {
  const folder = positional[0];
  const orientation = opt("orientation");
  const outDir = join(root, opt("out", "public/hero"));
  if (!folder || !["landscape", "portrait"].includes(orientation)) throw new Error("sequence needs <folder> and --orientation landscape|portrait");
  const avifQuality = Number(opt("avif", "55"));
  const webpQuality = Number(opt("webp", "80"));
  const frames = readdirSync(folder)
    .filter((f) => /^\d{4}\.png$/.test(f))
    .sort();
  if (!frames.length) throw new Error(`No frames (NNNN.png) in ${folder}`);
  const sidecars = frames.map((f) => JSON.parse(readFileSync(join(folder, f.replace(".png", ".json")), "utf8")));
  const only = opt("tiers")?.split(",");
  const size = await sharp(join(folder, frames[0])).metadata();
  if ((size.width > size.height) !== (orientation === "landscape")) throw new Error(`${folder} frames are ${size.width}×${size.height}, not ${orientation}`);
  const tiers = tiersFor(size.width, size.height);
  const totals = {};
  for (const tier of tiers) {
    if (only && !only.includes(tier.id)) {
      // keep the totals of a tier encoded earlier (re-encoding one tier at a higher quality)
      const prev = existsSync(join(outDir, "manifest.json"))
        ? JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8")).orientations?.[orientation]?.tiers?.find((t) => t.id === tier.id)
        : null;
      totals[tier.id] = { avif: prev?.formats.avif.bytes ?? 0, webp: prev?.formats.webp.bytes ?? 0 };
      continue;
    }
    const tierAvif = Number(opt(`avif-${tier.id}`, String(avifQuality)));
    totals[tier.id] = { avif: 0, webp: 0 };
    const dir = join(outDir, orientation, tier.id);
    for (const [i, f] of frames.entries()) {
      const name = String(i).padStart(4, "0");
      const base = sharp(join(folder, f)).resize(tier.width, tier.height, { fit: "cover" });
      totals[tier.id].avif += await writeAtomic(
        join(dir, `${name}.avif`),
        base.clone().avif({ quality: tierAvif, effort: 4, chromaSubsampling: "4:4:4" }),
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
  manifest.phases = phaseRanges(sidecars);
  manifest.orientations[orientation] = {
    // poster: the first view before any frame loads; staticPoster: the reduced-motion image
    poster: Number(opt("poster", "0")),
    staticPoster: Number(opt("static-poster", String(frames.length - 1))),
    tiers: tiers.map((t) => ({
      id: t.id,
      width: t.width,
      height: t.height,
      formats: Object.fromEntries(
        ["avif", "webp"].map((ext) => [ext, { url: `/hero/${orientation}/${t.id}/{frame}.${ext}`, bytes: totals[t.id][ext] }]),
      ),
    })),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  for (const t of tiers) {
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
