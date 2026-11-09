// One labelled image of every panorama in a walkthrough, for approving finishes and lighting before the set goes on the site.
//
//   node scripts/panorama-overview.mjs --design 5-marla [--engine cycles] [--quality high,mid,preview] [--cols 3] [--cell 640]
//
// Writes render/out/<design>/panoramas/overview-<engine>.png. A viewpoint with no render shows as a grey cell.
import { existsSync, readFileSync } from "node:fs";
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
  console.error("usage: node scripts/panorama-overview.mjs --design <slug> [--engine cycles] [--quality high,mid,preview] [--cols 3] [--cell 640]");
  process.exit(1);
}
const engine = opt("engine", "cycles");
const qualities = opt("quality", "high,mid,preview").split(",");
const cols = Number(opt("cols", "3"));
const CELL = Number(opt("cell", "640"));
const LABEL = 34;
const GAP = 8;

const walkthrough = JSON.parse(readFileSync(join(root, "src", "designs", "walkthroughs", `${design}.json`), "utf8"));
const folder = join(root, "render", "out", design, "panoramas");
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const cells = await Promise.all(
  walkthrough.viewpoints.map(async (v) => {
    const file = qualities.map((q) => join(folder, `${v.id}-${engine}-${q}.png`)).find((f) => existsSync(f)) ?? join(folder, `${v.id}-${engine}-${qualities[0]}.png`);
    const label = `${v.level} · ${v.label ?? v.room ?? v.id} (${v.id})${existsSync(file) ? "" : " · not rendered"}`;
    const height = Math.round(CELL / 2);
    const img = existsSync(file)
      ? await sharp(file).resize({ width: CELL, height }).png().toBuffer()
      : await sharp({ create: { width: CELL, height, channels: 3, background: "#2a2a28" } }).png().toBuffer();
    return { img, label, height };
  }),
);

const cellH = CELL / 2 + LABEL;
const rows = Math.ceil(cells.length / cols);
const width = cols * CELL + (cols + 1) * GAP;
const height = rows * cellH + (rows + 1) * GAP;
const composite = [];
cells.forEach(({ img, label }, i) => {
  const left = GAP + (i % cols) * (CELL + GAP);
  const top = GAP + Math.floor(i / cols) * (cellH + GAP);
  composite.push({ input: img, left, top });
  const svg = `<svg width="${CELL}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1c1c1b"/>
    <text x="8" y="22" font-family="IBM Plex Mono, Consolas, monospace" font-size="15" fill="#e6e3dd">${escape(label)}</text></svg>`;
  composite.push({ input: Buffer.from(svg), left, top: top + CELL / 2 });
});
const out = join(folder, `overview-${engine}.png`);
await sharp({ create: { width, height, channels: 3, background: "#121212" } }).composite(composite).png().toFile(out);
console.log(`Wrote ${out} (${cells.filter((c) => !c.label.endsWith("not rendered")).length} of ${cells.length} panoramas)`);
