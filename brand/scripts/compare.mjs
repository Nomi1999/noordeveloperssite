// Usage: node brand/scripts/compare.mjs <svg> <out.png> [x y w h]  (units on the 1000 grid)
// Renders the svg at 2 px/unit and diffs it against brand/review/original.png.
// Grey = both, red = new only, blue = original only.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const [svg, out, x = 0, y = 0, w = 1000, h = 1000] = process.argv.slice(2);
const r = (n) => Math.round(+n * 2);
const orig = await sharp("brand/review/original.png").greyscale().raw().toBuffer();
const src = readFileSync(svg, "utf8").replace("<svg ", '<svg width="2000" height="2000" ');
const nw = await sharp(Buffer.from(src)).flatten({ background: "#fff" }).greyscale().raw().toBuffer();
const rgb = Buffer.alloc(2000 * 2000 * 3, 255);
let both = 0, onlyN = 0, onlyO = 0;
for (let py = r(y); py < r(+y + +h); py++) for (let px = r(x); px < r(+x + +w); px++) {
  const i = py * 2000 + px, o = orig[i] < 128, n = nw[i] < 128, k = i * 3;
  if (o && n) { both++; rgb[k] = rgb[k + 1] = rgb[k + 2] = 90; }
  else if (n) { onlyN++; rgb[k] = 230; rgb[k + 1] = 30; rgb[k + 2] = 30; }
  else if (o) { onlyO++; rgb[k] = 30; rgb[k + 1] = 80; rgb[k + 2] = 230; }
}
console.log(`IoU ${(both / (both + onlyN + onlyO)).toFixed(4)}  new-only ${onlyN}  orig-only ${onlyO}`);
await sharp(rgb, { raw: { width: 2000, height: 2000, channels: 3 } })
  .extract({ left: r(x), top: r(y), width: r(w), height: r(h) }).png().toFile(out);
