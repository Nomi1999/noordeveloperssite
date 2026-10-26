// Builds brand/review/sheet.html (+ sheet.png): original vs redraw, overlay, variants on ink / paper / concrete,
// and the icon set at 16, 32 and 180 px. Run after `npm run brand:build`.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const svg = (n) => readFileSync(`brand/dist/${n}.svg`, "utf8");
const node = process.execPath;

// overlay of the redrawn stacked lockup on the original render (same 1000 grid)
const stacked = svg("logo-stacked").replace("<svg ", '<svg width="1000" height="1000" ').replace(/viewBox="[^"]+"/, 'viewBox="0 0 1000 1000"');
// re-place the stacked viewBox content at its master position by using the master files directly
const master = ["mark.svg", "wordmark.svg", "tagline.svg"].map((f) => readFileSync(`brand/master/${f}`, "utf8"));
const inner = master.map((m) => m.replace(/^<svg[^>]*>/, "").replace("</svg>", "")).join("");
writeFileSync("brand/review/_redraw-master.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${inner}</svg>`);
const out = execFileSync(node, ["brand/scripts/compare.mjs", "brand/review/_redraw-master.svg", "brand/review/overlay.png", "0", "240", "1000", "510"]).toString();
const iou = /IoU ([\d.]+)/.exec(out)?.[1];

const BG = { ink: ["#121212", "#f4f2ee"], paper: ["#f4f2ee", "#121212"], concrete: ["#c9c6bf", "#121212"] };
const lockups = ["stacked", "horizontal", "mark", "monogram"];
const cells = Object.entries(BG).map(([bg, [fill, color]]) => `
  <section class="row" style="background:${fill};color:${color}">
    <h3 style="color:${color}">${bg}</h3>
    ${lockups.map((l) => `<figure class="${l}">${svg(`logo-${l}`)}<figcaption>${l}</figcaption></figure>`).join("")}
    ${lockups.map((l) => `<figure class="${l}">${svg(`logo-${l}-accent`)}<figcaption>${l} + accent</figcaption></figure>`).join("")}
  </section>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Noor Developers logo review</title>
<style>
 :root{--noor:#f2a93b}
 body{margin:0;padding:32px;width:1536px;background:#fff;font:14px/1.4 system-ui,sans-serif;color:#222}
 h1{margin:0 0 4px;font-size:24px} h2{margin:32px 0 8px;font-size:16px;text-transform:uppercase;letter-spacing:.06em}
 .pair{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
 .pair figure{margin:0} .pair img{width:100%;display:block;border:1px solid #ddd}
 figcaption{font-size:12px;opacity:.7;margin-top:4px}
 .row{display:flex;flex-wrap:wrap;gap:24px;align-items:center;padding:24px;margin-bottom:12px;border:1px solid #ddd}
 .row h3{flex-basis:100%;margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
 .row figure{margin:0} .row svg{display:block;height:auto}
 .row .stacked svg{width:360px}.row .horizontal svg{width:420px}.row .mark svg{width:240px}.row .monogram svg{width:64px}
 .icons{display:flex;gap:32px;align-items:flex-end;padding:16px;background:#fff}
 .icons figure{margin:0;text-align:center}
 .icons img{display:block;margin:0 auto 6px;image-rendering:auto}
</style></head><body>
<h1>Noor Developers logo: before / after</h1>
<p>Same structure as the original, polished only. Overlay: grey = same, red = redraw only, blue = original only. Pixel overlap with the original: ${iou}.<br>
Intentional differences: right-hand house mirrored from the left (original was ~25 units off), chimney moved left to stay on the centre roof, monogram centred on the axis, wordmark set in Big Shoulders Display, clean edges.</p>
<div class="pair">
 <figure><img src="original.png" alt=""><figcaption>Original (traced, 1 MB, 1,511 paths)</figcaption></figure>
 <figure><img src="overlay.png" alt=""><figcaption>Overlay</figcaption></figure>
 <figure><div style="border:1px solid #ddd;padding:12px;color:#121212">${svg("logo-stacked")}</div><figcaption>Redraw (stacked, ${(svg("logo-stacked").length / 1024).toFixed(1)} KB)</figcaption></figure>
</div>
<h2>Variants</h2>${cells}
<h2>Icons</h2>
<div class="icons">
 <figure><img src="../dist/favicon.svg" width="16" height="16" alt=""><figcaption>svg 16</figcaption></figure>
 <figure><img src="../dist/favicon.svg" width="32" height="32" alt=""><figcaption>svg 32</figcaption></figure>
 <figure><img src="../dist/favicon.ico" width="16" height="16" alt=""><figcaption>ico 16</figcaption></figure>
 <figure><img src="../dist/apple-touch-icon.png" width="180" height="180" alt=""><figcaption>apple 180</figcaption></figure>
 <figure><img src="../dist/icon-192.png" width="192" height="192" alt=""><figcaption>192</figcaption></figure>
 <figure><img src="../dist/icon-512.png" width="192" height="192" style="border-radius:50%" alt=""><figcaption>512 (circular crop)</figcaption></figure>
</div>
</body></html>`;
writeFileSync("brand/review/sheet.html", html);
execFileSync(node, ["brand/scripts/shot.mjs", "brand/review/sheet.html", "brand/review/sheet.png", "1600", "2900"]);
