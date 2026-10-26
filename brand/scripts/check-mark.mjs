// Verifies the master mark: houses are mirror-symmetric (outside the chimney) and the ground arc
// stays within 1% of the logo width of the measured original arc.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("brand/master/mark.svg", "utf8");
const housesOnly = svg.replace(/<path id="monogram"[^>]*\/>/, "").replace("<svg ", '<svg width="2000" height="2000" ');
const px = await sharp(Buffer.from(housesOnly)).flatten({ background: "#fff" }).greyscale().raw().toBuffer();
const dark = (x, y) => px[y * 2000 + x] < 128;

// Symmetry: pixel x mirrors to 1999 - x about the axis x = 500 units. Chimney region excluded.
let bad = 0, total = 0;
for (let y = 0; y < 2000; y++) for (let x = 0; x < 1000; x++) {
  const mx = 1999 - x;
  if (mx > 1120 && mx < 1250 && y < 680) continue; // chimney (units 560-625, y < 340)
  if (dark(x, y)) total++;
  if (dark(x, y) !== dark(mx, y)) bad++;
}
console.log(`symmetry mismatch: ${bad} px of ${total} (${((bad / total) * 100).toFixed(3)}%)`);

// Arc: compare against measured points of the original lower edge (x, y in units).
const arc = [[345, 515], [288.5, 516.5], [232.5, 518.5], [180.5, 522.5], [814, 522.5], [711.5, 516.5], [655, 516]];
let maxDev = 0;
for (const [x, y] of arc) {
  const X = Math.round(x * 2);
  let yb = 0;
  for (let Y = 1200; Y > 800; Y--) if (dark(X, Y)) { yb = Y / 2; break; }
  maxDev = Math.max(maxDev, Math.abs(yb - y));
}
console.log(`arc max deviation: ${maxDev.toFixed(2)} units (limit 9.6 = 1% of logo width)`);
if (bad / total > 0.002 || maxDev > 9.6) process.exit(1);
