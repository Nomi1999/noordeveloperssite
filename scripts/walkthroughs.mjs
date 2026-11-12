// Encodes a walkthrough's rendered panoramas for the site.
//
//   node scripts/walkthroughs.mjs --design 5-marla [--engine cycles] [--quality high,mid,preview]
//
// Reads render/out/<design>/panoramas/<viewpoint>-<engine>-<quality>.png (--quality is a preference list: each
// viewpoint uses the first quality that has a render, so a few rooms can be re-rendered cleaner than the rest) and writes
// public/walkthroughs/<design>/<viewpoint>.jpg (4096 × 2048, JPEG q85) and <viewpoint>-thumb.jpg (800 px wide, the
// poster and the blurred preview shown while the full image loads). Fails, writing nothing, if any viewpoint of the
// walkthrough has no rendered panorama, so a tour is never published with a room missing.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const design = opt("design");
if (!design) {
  console.error("usage: node scripts/walkthroughs.mjs --design <slug> [--engine cycles] [--quality high,mid,preview]");
  process.exit(1);
}
const engine = opt("engine", "cycles");
const qualities = opt("quality", "high,mid,preview").split(",");

const file = join(root, "src", "designs", "walkthroughs", `${design}.json`);
if (!existsSync(file)) {
  console.error(`No walkthrough for design "${design}": ${file}`);
  process.exit(1);
}
const walkthrough = JSON.parse(readFileSync(file, "utf8"));
const candidates = (id) => qualities.map((q) => join(root, "render", "out", design, "panoramas", `${id}-${engine}-${q}.png`));
const source = (id) => candidates(id).find((f) => existsSync(f));

// A walking tour moves through the house in 3D and needs each view's depth image (npm run render with --depth)
const depthSource = (id) => join(root, "render", "out", design, "depth", `${id}-depth.png`);
const walking = walkthrough.walking === true;
const noDepth = walking ? walkthrough.viewpoints.filter((v) => !existsSync(depthSource(v.id))).map((v) => v.id) : [];
if (noDepth.length) {
  console.error(`No depth image for: ${noDepth.join(", ")}. Render them with node scripts/colab/panoramas.mjs --design ${design} --views all --depth`);
  process.exit(1);
}

const missing = walkthrough.viewpoints.filter((v) => !source(v.id)).map((v) => v.id);
if (missing.length) {
  console.error(`No ${engine} (${qualities.join("/")}) panorama for: ${missing.join(", ")}. Render them with npm run render:panoramas -- --design ${design}`);
  process.exit(1);
}

const out = join(root, "public", "walkthroughs", design);
mkdirSync(out, { recursive: true });
// Drop images of viewpoints that are no longer in the walkthrough
const keep = new Set(walkthrough.viewpoints.flatMap((v) => [`${v.id}.jpg`, `${v.id}-thumb.jpg`, ...(walking ? [`${v.id}-depth.png`] : [])]));
for (const name of readdirSync(out)) if (!keep.has(name)) rmSync(join(out, name));

for (const v of walkthrough.viewpoints) {
  const image = sharp(source(v.id));
  const { width, height } = await image.metadata();
  if (width !== 2 * height) throw new Error(`${v.id}: panorama is ${width} × ${height}, not 2:1`);
  await image.clone().resize({ width: 4096, height: 2048 }).jpeg({ quality: 85, mozjpeg: true, progressive: true }).toFile(join(out, `${v.id}.jpg`));
  await image.clone().resize({ width: 800, height: 400 }).jpeg({ quality: 78, mozjpeg: true }).toFile(join(out, `${v.id}-thumb.jpg`));
  if (walking) copyFileSync(depthSource(v.id), join(out, `${v.id}-depth.png`));
  console.log(`${v.id}: written from ${source(v.id).split(/[\/]/).pop()}`);
}
console.log(`${walkthrough.viewpoints.length} panoramas in ${out}`);
