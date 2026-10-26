// Outlines the wordmark and tagline in Big Shoulders Display (winner of font-compare.mjs)
// into brand/master/wordmark.svg and brand/master/tagline.svg on the 1000-unit grid.
// Usage: node brand/scripts/make-type.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { loadFont, layout, pathFor, inkWidth } from "./type.mjs";

const dir = "node_modules/@fontsource/big-shoulders-display/files";
const file = (w) => `${dir}/big-shoulders-display-latin-${w}-normal.woff`;
const AXIS = 500;

// --- wordmark: cap 93, baseline 654; words start where the original's did, one shared tracking ---
const WM = { weight: 500, cap: 93, base: 654, words: [["NOOR", 104, 316], ["DEVELOPERS", 378, 896]] };
{
  const font = loadFont(file(WM.weight));
  const t = WM.words.reduce((s, [w, a, b]) => s + (b - a - inkWidth(font, w, WM.cap)) / (w.length - 1), 0) / WM.words.length;
  let d = "", L = Infinity, R = -Infinity;
  const parts = WM.words.map(([w, a]) => {
    const lay = layout(font, w, WM.cap, t, 0);
    return { lay, a, w: lay.inkR - lay.inkL };
  });
  // center the whole line on the axis, keeping the original word gap
  const gap = WM.words[1][1] - WM.words[0][2];
  const total = parts[0].w + gap + parts[1].w;
  let x = AXIS - total / 2;
  for (const p of parts) { d += pathFor(font, p.lay, x, WM.base); x += p.w + gap; }
  writeFileSync("brand/master/wordmark.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n<path id="wordmark" d="${d}"/>\n</svg>\n`);
  // two-line variant for the horizontal lockup: left-aligned at x = 0, cap tops at y = 0 and y = LINE
  const LINE = WM.cap + 30;
  const two = WM.words.map(([w], i) => pathFor(font, parts[i].lay, 0, WM.cap + i * LINE)).join("");
  writeFileSync("brand/master/wordmark-2line.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 216">
<path id="wordmark-2line" d="${two}"/>
</svg>
`);
  console.log(`wordmark weight ${WM.weight} track ${t.toFixed(2)} width ${total.toFixed(1)} (original 792)`);
}

// --- tagline: cap 34, baseline 729.5, ink 279 -> 720, weight 400 matches the original stem ratio (0.088 of cap) ---
const TG = { cap: 34, base: 729.5, left: 279, right: 720, text: "BUILDING THE FUTURE" };
{
  const region = { left: 520, top: 1370, width: 960, height: 120 };
  const orig = await sharp("brand/review/original.png").extract(region).greyscale().raw().toBuffer();
  let best = null;
  for (const w of [400]) {
    const font = loadFont(file(w));
    // solve the shared tracking so the ink width matches; word gap grows with the tracking
    const wid = (t) => { const l = layout(font, TG.text, TG.cap, t, 8 + 2 * t); return l.inkR - l.inkL; };
    let lo = 0, hi = 60;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (wid(mid) < TG.right - TG.left) lo = mid; else hi = mid; }
    const t = (lo + hi) / 2, sp = 8 + 2 * t;
    const lay = layout(font, TG.text, TG.cap, t, sp);
    const d = pathFor(font, lay, (TG.left + TG.right) / 2 - (lay.inkR - lay.inkL) / 2, TG.base);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#fff"/><path d="${d}"/></svg>`;
    const nb = await sharp(Buffer.from(svg)).extract(region).greyscale().raw().toBuffer();
    let both = 0, any = 0;
    for (let i = 0; i < nb.length; i++) { const a = nb[i] < 128, o = orig[i] < 128; if (a && o) both++; if (a || o) any++; }
    const iou = both / any;
    console.log(`tagline weight ${w} track ${t.toFixed(2)} IoU ${iou.toFixed(4)} width ${(lay.inkR - lay.inkL).toFixed(1)}`);
    if (!best || iou > best.iou) best = { w, d, iou };
  }
  writeFileSync("brand/master/tagline.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n<path id="tagline" d="${best.d}"/>\n</svg>\n`);
  console.log(`tagline weight ${best.w}`);
}
