// Contact sheet for a folder of rendered stills or frames: node render/contact_sheet.mjs <folder> [--count 24] [--cols 4]
// Samples frames evenly and labels each with shot, frame, build progress and time of day from its .json sidecar.
// Writes <folder>/sheet.png.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--"));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
if (!folder || !existsSync(folder)) {
  console.error("usage: node render/contact_sheet.mjs <folder> [--count 24] [--cols 4]");
  process.exit(1);
}
const count = opt("count", 24);
const cols = opt("cols", 4);
const CELL = 480;
const LABEL = 30;
const GAP = 8;

const images = readdirSync(folder)
  .filter((f) => f.endsWith(".png") && !f.endsWith(".tmp.png") && f !== "sheet.png")
  .sort();
if (!images.length) {
  console.error(`No rendered images in ${folder}`);
  process.exit(1);
}
const picks =
  images.length <= count
    ? images
    : Array.from({ length: count }, (_, i) => images[Math.round((i * (images.length - 1)) / (count - 1))]);

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const num = (v) => (typeof v === "number" ? v.toFixed(2) : "–");

const cells = await Promise.all(
  picks.map(async (file) => {
    const sidecar = join(folder, file.replace(/\.png$/, ".json"));
    const meta = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, "utf8")) : {};
    const frame = meta.frame == null ? file.replace(/\.png$/, "") : `f${String(meta.frame).padStart(4, "0")}`;
    const label = `${meta.shot ?? "?"} · ${frame} · build ${num(meta.build)} · tod ${num(meta.time_of_day)}`;
    const img = await sharp(join(folder, file)).resize({ width: CELL }).png().toBuffer({ resolveWithObject: true });
    return { img, label };
  }),
);

const cellH = Math.max(...cells.map((c) => c.img.info.height)) + LABEL;
const rows = Math.ceil(cells.length / cols);
const width = cols * CELL + (cols + 1) * GAP;
const height = rows * cellH + (rows + 1) * GAP;
const composite = [];
cells.forEach(({ img, label }, i) => {
  const left = GAP + (i % cols) * (CELL + GAP);
  const top = GAP + Math.floor(i / cols) * (cellH + GAP);
  composite.push({ input: img.data, left, top });
  const svg = `<svg width="${CELL}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1c1c1b"/>
    <text x="8" y="20" font-family="IBM Plex Mono, Consolas, monospace" font-size="14" fill="#e6e3dd">${escape(label)}</text></svg>`;
  composite.push({ input: Buffer.from(svg), left, top: top + img.info.height });
});
const out = join(folder, "sheet.png");
await sharp({ create: { width, height, channels: 3, background: "#121212" } })
  .composite(composite)
  .png()
  .toFile(out);
console.log(`Wrote ${out} (${cells.length} of ${images.length} images)`);
