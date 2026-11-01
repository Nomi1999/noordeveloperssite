// Restyles the site's delivered 3D renders into photoreal versions with an OpenRouter image model,
// keeping each design, camera and time of day. The results are still concept images, not photos of built work.
//
//   node scripts/enhance-renders.mjs generate [--only 1-kanal/front-day,hero/landscape] [--model <id>] [--force] [--edit-only] [--attempts 3]
//       sends each source render to the model → render/out/ai/<design>/<shot>.png (gitignored). Designs with a
//       design change (DESIGN_EDITS) get a second, narrow edit pass on that photo. Earlier attempts are kept as
//       <shot>.<n>.png. Skips shots already generated unless --force or --only names them; --edit-only reruns
//       just the edit pass on the existing <shot>.base.png. Each photo pass makes up to --attempts tries and keeps
//       the one that best keeps the source's framing (see framingScore).
//   node scripts/enhance-renders.mjs encode [--only ...]
//       render/out/ai PNGs → src/assets/renders/<design>/<shot>.jpg and public/hero/poster/<orientation>-<tier>.{avif,webp}
//
// Needs OPENROUTER_API_KEY in .env (or the environment). Share crops: npm run render:encode -- share ...
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const [command, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
const flag = (name) => rest.includes(`--${name}`);

const MODEL = opt("model", "bytedance-seed/seedream-5-0-pro");
// Seedream 5.0 Pro's largest 16:9 output ("2K"); stills ship at this size, never upscaled
const STILL_SIZE = { width: 2048, height: 1152 };

// Pass 1: photoreal restyle, faithful to the render
const BASE_PROMPT = [
  "Turn this architectural 3D render into a photorealistic photograph, as if shot by a professional architectural photographer with a full-frame camera.",
  "Keep the building exactly as designed: the same geometry, proportions, number of storeys, window positions and sizes, the number and spacing of the vertical fins, railings, gates, boundary walls, materials and colours.",
  "This is an image-to-image restyle, not a new photo: the output must line up with the input image. Keep the exact same camera position, height, angle, lens and framing; the building, walls, gate and trees stay at the same place and size in the frame, with the same amount of sky and ground. Keep the same time of day and light direction.",
  "Make the materials real: painted render with subtle texture, real concrete and stone, real glass with natural reflections, real trees and plants, a real paved street.",
  "The setting is a residential neighbourhood in Faisalabad, Pakistan: make the neighbouring buildings and street look like real, ordinary houses there, without drawing attention away from the main building.",
  "Do not add or remove anything on the main building: no added plants, planters, furniture or lights on terraces, roofs or walls. No people, no vehicles, no text, no signage, no logos, no watermarks.",
].join(" ");

const NOTES = {
  day: "Bright, clear daytime light with soft natural shadows.",
  dusk: "Dusk: deep blue evening sky, warm interior light glowing from the windows, gentle exterior lighting.",
  aerial:
    "A high drone photograph looking steeply down at the building and its plot, exactly as in the input: the flat roof with its stair room is fully visible from above, the lawn and porch are seen from above, and the neighbouring roofs fill the background. Keep this high viewpoint and steep downward angle; do not lower the camera or turn it into a street-level or front view.",
  elevated: "An elevated photograph from across the street, looking down at the building.",
};

// Pass 2, only for the designs listed: one narrow edit to the pass-1 photo, for a design change the
// source render does not show yet. Asked separately because mixing it into pass 1 makes the model
// loosen the rest of the design.
const EDIT_LOCK =
  "Edit this photograph. Change only what is described here and keep everything else exactly the same: the camera, framing, building, colours, light, sky, trees, walls, gate and neighbouring houses stay as they are.";
const DESIGN_EDITS = {
  "1-kanal": `${EDIT_LOCK} The first-floor terrace over the car porch gets a frameless clear glass railing, the same height and style as the existing glass, along every open edge: the glass runs the full length of the front edge up to the house wall and along both short ends, so all open sides of the terrace are closed by glass. If the terrace is not visible, change nothing.`,
  "2-kanal": `${EDIT_LOCK} The first-floor terrace over the car porch must have a frameless clear glass railing on all three open sides. The front and right-hand glass already exist; keep them. Add the missing glass along the left-hand short end of the terrace, the same height and style as the existing glass, running from the front corner back to the house wall, so the terrace is fully enclosed by glass. If the terrace is not visible, change nothing.`,
};

/** Every image this script replaces: its source, its output and how to describe it to the model */
const JOBS = [
  ...["1-kanal", "2-kanal"].flatMap((d) => [
    { id: `${d}/front-day`, note: NOTES.day },
    { id: `${d}/front-dusk`, note: NOTES.dusk },
    { id: `${d}/street`, note: `${NOTES.day} Seen from the street.` },
    { id: `${d}/aerial`, note: `${NOTES.aerial} ${NOTES.day}` },
  ]),
  { id: "commercial/street-day", note: `${NOTES.day} A commercial plaza on a city street.` },
  { id: "commercial/street-dusk", note: `${NOTES.dusk} A commercial plaza on a city street; office floors and shopfronts lit.` },
  { id: "commercial/corner", note: `${NOTES.elevated} ${NOTES.day} A commercial plaza on a city street.` },
].map((j) => ({
  ...j,
  edit: DESIGN_EDITS[j.id.split("/")[0]],
  kind: "still",
  source: join(root, "src/assets/renders", `${j.id}.jpg`),
  aspect: "16:9",
  resolution: "2K",
}));
for (const orientation of ["landscape", "portrait"]) {
  JOBS.push({
    id: `hero/${orientation}`,
    kind: "poster",
    orientation,
    source: join(root, "public/hero", orientation, "540", "0191.webp"),
    aspect: orientation === "landscape" ? "16:9" : "9:16",
    resolution: "2K",
    note: `${NOTES.dusk} The finished house seen from the street.`,
    edit: DESIGN_EDITS["1-kanal"], // the hero house is the 1 Kanal design
  });
}

const rawPath = (job, suffix = "") => join(root, "render/out/ai", `${job.id}${suffix}.png`);

function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const env = join(root, ".env");
  const line = existsSync(env) && readFileSync(env, "utf8").split(/\r?\n/).find((l) => l.startsWith("OPENROUTER_API_KEY="));
  const key = line && line.slice("OPENROUTER_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("Set OPENROUTER_API_KEY in .env");
  return key;
}

function selected() {
  const only = opt("only")?.split(",");
  if (!only) return JOBS;
  const unknown = only.filter((id) => !JOBS.some((j) => j.id === id));
  if (unknown.length) throw new Error(`Unknown shot(s): ${unknown.join(", ")}. Known: ${JOBS.map((j) => j.id).join(", ")}`);
  return JOBS.filter((j) => only.includes(j.id));
}

async function writeAtomic(path, pipeline) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await pipeline.toFile(tmp);
  renameSync(tmp, path);
  return statSync(path).size;
}

/** Writes a file, first moving any existing one to <name>.<n>.png so earlier attempts are kept */
function writeKeeping(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    let n = 1;
    while (existsSync(path.replace(/\.png$/, `.${n}.png`))) n++;
    renameSync(path, path.replace(/\.png$/, `.${n}.png`));
  }
  writeFileSync(`${path}.tmp`, bytes);
  renameSync(`${path}.tmp`, path);
}

/** One call to the image endpoint: an input image and a prompt in, PNG bytes and cost out */
async function callModel(key, inputPath, prompt, job) {
  // Sent at the output size (2048 on the long side): large renders are downscaled to keep the request
  // small, and the 960px hero frames are upscaled so the model sees the same canvas it draws on
  const input = await sharp(inputPath).resize(2048, 2048, { fit: "inside" }).jpeg({ quality: 92 }).toBuffer();
  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Noor Developers render enhance" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      input_references: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.toString("base64")}` } }],
      aspect_ratio: job.aspect,
      resolution: job.resolution,
      output_format: "png",
      n: 1,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${job.id}: HTTP ${res.status} ${text.slice(0, 800)}`);
  const json = JSON.parse(text);
  const item = json.data?.[0];
  let bytes;
  if (item?.b64_json) bytes = Buffer.from(item.b64_json, "base64");
  else if (item?.url?.startsWith("data:")) bytes = Buffer.from(item.url.split(",")[1], "base64");
  else if (item?.url) bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  else throw new Error(`${job.id}: no image in response: ${text.slice(0, 800)}`);
  return { bytes, cost: Number(json.usage?.cost) || 0 };
}

async function report(job, path, cost, label, score) {
  const { width, height } = await sharp(path).metadata();
  console.log(`${job.id} ${label}: ${width}×${height} → ${path} (cost $${cost.toFixed(4)}, framing ${score.toFixed(3)})`);
}

/**
 * How closely an output keeps the source's framing: correlation of their edge maps at 128×72.
 * Calibrated on the first run: faithful restyles scored 0.46–0.87, reframed or redesigned ones 0.02–0.25.
 */
const FRAMING_OK = 0.45;
async function framingScore(sourcePath, output) {
  const { width, height } = await sharp(output).metadata();
  const [w, h] = width >= height ? [128, 72] : [72, 128];
  const edges = async (input) =>
    Float64Array.from(
      await sharp(input)
        .resize(w, h, { fit: "fill" })
        .greyscale()
        .blur(1.2)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .raw()
        .toBuffer(),
    );
  const a = await edges(sourcePath);
  const b = await edges(output);
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

/**
 * Pass 1 writes <shot>.png, or <shot>.base.png when the design has an edit; pass 2 edits the base into <shot>.png.
 * Pass 1 tries up to --attempts times (default 3) and keeps the attempt that best keeps the framing,
 * stopping at the first one that scores FRAMING_OK.
 */
async function generateOne(job, key) {
  let total = 0;
  const final = rawPath(job);
  const base = job.edit ? rawPath(job, ".base") : final;
  if (!(flag("edit-only") && job.edit && existsSync(base))) {
    const attempts = Number(opt("attempts", "3"));
    let best = null;
    for (let i = 1; i <= attempts; i++) {
      const { bytes, cost } = await callModel(key, job.source, `${BASE_PROMPT} ${job.note}`, job);
      total += cost;
      const score = await framingScore(job.source, bytes);
      console.log(`${job.id} photo attempt ${i}: framing ${score.toFixed(3)} (cost $${cost.toFixed(4)})`);
      if (!best || score > best.score) best = { bytes, score };
      if (score >= FRAMING_OK) break;
    }
    writeKeeping(base, best.bytes);
    await report(job, base, 0, "photo kept", best.score);
    if (best.score < FRAMING_OK) console.warn(`${job.id}: no attempt kept the framing (best ${best.score.toFixed(3)}); check it by eye`);
  }
  if (job.edit) {
    const { bytes, cost } = await callModel(key, base, job.edit, job);
    writeKeeping(final, bytes);
    await report(job, final, cost, "edit", await framingScore(job.source, final));
    total += cost;
  }
  return total;
}

async function generate() {
  const key = apiKey();
  const named = Boolean(opt("only"));
  let total = 0;
  const failed = [];
  for (const job of selected()) {
    if (!named && !flag("force") && existsSync(rawPath(job))) {
      console.log(`${job.id}: already generated, skipped`);
      continue;
    }
    try {
      total += await generateOne(job, key);
    } catch (e) {
      failed.push(job.id);
      console.error(e.message);
    }
  }
  console.log(`Model ${MODEL}; total cost $${total.toFixed(4)}`);
  if (failed.length) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

async function encode() {
  for (const job of selected()) {
    const raw = rawPath(job);
    if (!existsSync(raw)) {
      console.error(`${job.id}: not generated yet`);
      process.exitCode = 1;
      continue;
    }
    if (job.kind === "still") {
      const out = join(root, "src/assets/renders", `${job.id}.jpg`);
      const bytes = await writeAtomic(
        out,
        sharp(raw)
          .resize(STILL_SIZE.width, STILL_SIZE.height, { fit: "cover", withoutEnlargement: true })
          .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true }),
      );
      console.log(`${out} (${(bytes / 1024).toFixed(0)} KB)`);
    } else {
      // Same tiers (full size and two thirds, see tiersFor in scripts/encode-renders.mjs) and quality as the frame sequence
      const [bw, bh] = job.orientation === "landscape" ? [960, 540] : [540, 960];
      const tiers = [1, 2 / 3].map((k) => ({ id: String(Math.round(540 * k)), width: Math.round((bw * k) / 2) * 2, height: Math.round((bh * k) / 2) * 2 }));
      for (const tier of tiers) {
        const img = sharp(raw).resize(tier.width, tier.height, { fit: "cover" });
        const stem = join(root, "public/hero/poster", `${job.orientation}-${tier.id}`);
        const a = await writeAtomic(`${stem}.avif`, img.clone().avif({ quality: 55, effort: 4, chromaSubsampling: "4:4:4" }));
        const w = await writeAtomic(`${stem}.webp`, img.clone().webp({ quality: 80, effort: 5 }));
        console.log(`${stem}.{avif,webp} (${(a / 1024).toFixed(0)} KB, ${(w / 1024).toFixed(0)} KB)`);
      }
    }
  }
}

const commands = { generate, encode };
if (!commands[command]) {
  console.error("usage: node scripts/enhance-renders.mjs <generate|encode> [--only <design>/<shot>,...] [--model <id>] [--force] [--edit-only]");
  process.exit(1);
}
await commands[command]();
