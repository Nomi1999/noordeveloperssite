// Overlay comparison of candidate fonts against the original wordmark.
// Writes brand/review/wordmark-candidates.png and prints a ranking (IoU of ink masks).
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { loadFont, layout, pathFor, inkWidth } from "./type.mjs";

const FONTS = process.argv[2]; // .../node_modules/@fontsource
const families = ["barlow-condensed", "saira-extra-condensed", "antonio", "teko", "oswald", "big-shoulders-display"];
const CAP = 93, BASE = 654, X0 = 104;
const N1 = [104, 316], N2 = [378, 896];

const orig = await sharp("brand/review/original.png").extract({ left: 160, top: 1100, width: 1700, height: 230 }).greyscale().raw().toBuffer();
const mask = (buf) => Array.from(buf, (v) => v < 128);
const om = mask(orig);

const results = [];
for (const fam of families) {
  const dir = `${FONTS}/${fam}/files`;
  const weights = readdirSync(dir).filter((n) => /latin-\d+-normal\.woff$/.test(n)).map((n) => +n.match(/latin-(\d+)-/)[1]).filter((w) => w >= 400);
  for (const w of weights) {
    const font = loadFont(`${dir}/${fam}-latin-${w}-normal.woff`);
    const w1 = inkWidth(font, "NOOR", CAP), w2 = inkWidth(font, "DEVELOPERS", CAP);
    const t = ((N1[1] - N1[0] - w1) / 3 + (N2[1] - N2[0] - w2) / 9) / 2;
    const a = layout(font, "NOOR", CAP, t, 0);
    const b = layout(font, "DEVELOPERS", CAP, t, 0);
    const d = pathFor(font, a, N1[0], BASE) + pathFor(font, b, N2[0], BASE);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#fff"/><path d="${d}"/></svg>`;
    const nb = await sharp(Buffer.from(svg)).extract({ left: 160, top: 1100, width: 1700, height: 230 }).greyscale().raw().toBuffer();
    const nm = mask(nb);
    let both = 0, any = 0;
    for (let i = 0; i < nm.length; i++) { if (nm[i] && om[i]) both++; if (nm[i] || om[i]) any++; }
    results.push({ fam, w, t: +t.toFixed(2), iou: both / any, svg });
  }
}
results.sort((a, b) => b.iou - a.iou);
for (const r of results.slice(0, 12)) console.log(`${r.fam} ${r.w}  track ${r.t}  IoU ${r.iou.toFixed(4)}`);

// overlay image of the best per family
const best = [...new Map([...results].reverse().map((r) => [r.fam, r])).values()];
const tiles = [];
for (const r of best) {
  const base = await sharp(Buffer.from(r.svg)).extract({ left: 160, top: 1100, width: 1700, height: 230 }).greyscale().raw().toBuffer();
  const rgb = Buffer.alloc(1700 * 230 * 3, 255);
  for (let i = 0; i < base.length; i++) {
    const n = base[i] < 128, o = orig[i] < 128, k = i * 3;
    if (n && o) { rgb[k] = rgb[k + 1] = rgb[k + 2] = 80; }
    else if (n) { rgb[k] = 230; rgb[k + 1] = 40; rgb[k + 2] = 40; }
    else if (o) { rgb[k] = 40; rgb[k + 1] = 90; rgb[k + 2] = 230; }
  }
  tiles.push(await sharp(rgb, { raw: { width: 1700, height: 230, channels: 3 } }).resize(850).png().toBuffer());
}
await sharp({ create: { width: 850, height: 115 * tiles.length, channels: 3, background: "#fff" } })
  .composite(tiles.map((input, i) => ({ input, top: i * 115, left: 0 }))).png().toFile("brand/review/wordmark-candidates.png");
console.log("order:", best.map((r) => `${r.fam} ${r.w}`).join(" | "));
