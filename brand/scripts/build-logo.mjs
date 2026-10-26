// Builds every logo variant and icon from brand/master/. Run with `npm run brand:build`.
//   brand/dist/logo-{stacked,horizontal,mark,monogram}[-accent].svg   (currentColor; accent = amber monogram)
//   src/assets/brand/*.svg                                            (inlined by Logo.astro)
//   public/favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import sharp from "sharp";
import { optimize } from "svgo";

const read = (f) => readFileSync(`brand/master/${f}`, "utf8");
const pathD = (file, id) => {
  const m = new RegExp(`<path id="${id}"[^>]*? d="([^"]+)"`).exec(read(file));
  if (!m) throw new Error(`path #${id} not found in ${file}`);
  return m[1];
};
// Bounds of an absolute-coordinate polyline path (the monogram only uses M, L and Z)
const bounds = (d) => {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

const houses = pathD("mark.svg", "houses");
const mono = pathD("mark.svg", "monogram");
const monoBold = pathD("monogram-bold.svg", "monogram-bold");
const monoXs = pathD("monogram-xs.svg", "monogram-xs");
const word = pathD("wordmark.svg", "wordmark");
const tag = pathD("tagline.svg", "tagline");
const word2 = pathD("wordmark-2line.svg", "wordmark-2line");

const ACCENT = "var(--noor, #F2A93B)";
const INK = "#121212", PAPER = "#f4f2ee", NOOR = "#f2a93b";

const markBox = { x: 18, y: 253, w: 964, h: 289.5 };
const mb = bounds(mono);

const svgDoc = (vb, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map((n) => +n.toFixed(2)).join(" ")}" fill="currentColor">${body}</svg>`;
const monoPathEl = (accent, d = mono) =>
  `<path fill-rule="evenodd"${accent ? ` fill="${ACCENT}"` : ""} d="${d}"/>`;
const markEls = (accent) => `<path fill-rule="evenodd" d="${houses}"/>${monoPathEl(accent)}`;

// Horizontal: mark, then the two-line wordmark, vertically centered on the mark
const HZ = { scale: 1.2, gap: 80 };
const hzX = markBox.x + markBox.w + HZ.gap;
const hzH = 216 * HZ.scale;
const hzY = markBox.y + markBox.h / 2 - hzH / 2;
const hzW = 518.5 * HZ.scale;

const variants = {
  stacked: (a) => svgDoc([18, 252, 964, 478], `${markEls(a)}<path d="${word}"/><path d="${tag}"/>`),
  horizontal: (a) =>
    svgDoc([markBox.x, markBox.y, hzX + hzW - markBox.x, markBox.h],
      `${markEls(a)}<path transform="translate(${f2(hzX)} ${f2(hzY)}) scale(${HZ.scale})" d="${word2}"/>`),
  mark: (a) => svgDoc([markBox.x, markBox.y, markBox.w, markBox.h], markEls(a)),
  monogram: (a) => svgDoc([mb.x, mb.y, mb.w, mb.h], monoPathEl(a)),
};
function f2(n) { return +n.toFixed(2); }

const svgoConfig = {
  floatPrecision: 1,
  plugins: ["preset-default"], // svgo 4 keeps the viewBox by default
};

mkdirSync("brand/dist", { recursive: true });
mkdirSync("src/assets/brand", { recursive: true });
mkdirSync("public", { recursive: true });

for (const [name, build] of Object.entries(variants)) {
  for (const accent of [false, true]) {
    const out = optimize(build(accent), svgoConfig).data;
    const file = `logo-${name}${accent ? "-accent" : ""}.svg`;
    writeFileSync(`brand/dist/${file}`, out);
    writeFileSync(`src/assets/brand/${file}`, out);
    console.log(`${file.padEnd(32)} ${(out.length / 1024).toFixed(1)} KB`);
  }
}

// ---- icons: monogram on a solid ink square ----
// `bold` uses the heavier-stroke monogram so 16/32 px renders stay crisp.
function iconSvg(size, pad, bold) {
  const d = bold === "xs" ? monoXs : bold ? monoBold : mono;
  const b = bounds(d);
  const box = size * (1 - 2 * pad);
  const k = box / Math.max(b.w, b.h);
  const tx = (size - b.w * k) / 2 - b.x * k, ty = (size - b.h * k) / 2 - b.y * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${INK}"/><path fill="${NOOR}" fill-rule="evenodd" transform="translate(${f2(tx)} ${f2(ty)}) scale(${k.toFixed(5)})" d="${d}"/></svg>`;
}
const png = (size, pad, bold) => sharp(Buffer.from(iconSvg(size, pad, bold)), { density: 72 }).png().toBuffer();

// favicon.svg: vector, bold monogram (it is mostly seen at 16-32 px)
const fav = optimize(iconSvg(32, 0.12, true), { ...svgoConfig, floatPrecision: 2 }).data;
writeFileSync("public/favicon.svg", fav);
copyFileSync("public/favicon.svg", "brand/dist/favicon.svg");

// favicon.ico with 16 and 32 px PNG entries
function ico(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0); e.writeUInt8(size, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...entries.map((e) => e.data)]);
}
const ico16 = await png(16, 0.06, "xs");
const ico32 = await png(32, 0.1, true);
writeFileSync("public/favicon.ico", ico([{ size: 16, data: ico16 }, { size: 32, data: ico32 }]));
writeFileSync("public/apple-touch-icon.png", await png(180, 0.16, false));
writeFileSync("public/icon-192.png", await png(192, 0.24, false));
// 512 keeps the monogram inside the central 50% so a circular maskable crop never touches it
writeFileSync("public/icon-512.png", await png(512, 0.24, false));
for (const f of ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) copyFileSync(`public/${f}`, `brand/dist/${f}`);

const manifest = {
  name: "Noor Developers",
  short_name: "Noor",
  description: "Building the Future",
  start_url: "/",
  display: "browser",
  background_color: INK,
  theme_color: INK,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
writeFileSync("public/site.webmanifest", JSON.stringify(manifest, null, 2) + "\n");
console.log("icons + site.webmanifest written");
