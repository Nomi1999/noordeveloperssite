// Restyles the site's 3D renders into photoreal versions with an OpenRouter image model,
// keeping each design, camera and time of day. The results are still concept images, not photos of built work.
//
//   node scripts/enhance-renders.mjs sources --design <slug>[,<slug>] [--engine eevee] [--quality preview] [--width 2048] [--only ...]
//       renders each shot in render/shots/<slug>.json for the model to work from, skipping any already there.
//       Defaults to EEVEE preview at 2048px, which needs no dedicated GPU.
//   node scripts/enhance-renders.mjs generate (--only <design>/<shot>,... | --design <slug>,...) [--model <id>] [--engine ...] [--quality ...] [--force] [--edit-only] [--attempts 3]
//       sends each source render to the model → render/out/ai/<design>/<shot>.png (gitignored). Designs with a
//       design change (DESIGN_EDITS) get a second, narrow edit pass on that photo. Earlier attempts are kept as
//       <shot>.<n>.png. With --design, skips shots already generated unless --force; --only always generates;
//       --edit-only reruns just the edit pass on the existing <shot>.base.png. Each photo pass makes up to
//       --attempts tries and keeps the one that best keeps the source's framing (see framingScore).
//   node scripts/enhance-renders.mjs encode (--only ... | --design ...)
//       render/out/ai PNGs → src/assets/renders/<design>/<shot>.jpg and public/hero/poster/<orientation>-<tier>.{avif,webp}
//
// generate and encode act only on the shots or designs they are told to, so a bare run cannot replace delivered
// images. Sources always come from render/out/, never from the delivered images that encode overwrites.
//
// Needs OPENROUTER_API_KEY in .env (or the environment), and the model in --model or IMAGE_MODEL.
// Share crops: npm run render:encode -- share ...
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
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

/** A setting from the environment, else from .env. An empty value in the environment counts as not set. */
function setting(name) {
  if (name in process.env) return process.env[name];
  const env = join(root, ".env");
  const line = existsSync(env) && readFileSync(env, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
}

// The largest 16:9 output of the Seedream 5.0 models ("2K"); stills ship at this size, never upscaled
const STILL_SIZE = { width: 2048, height: 1152 };

// Pass 1: photoreal restyle, faithful to the render
const BASE_PROMPT = [
  "Turn this architectural 3D render into a photorealistic photograph, as if shot by a professional architectural photographer with a full-frame camera.",
  "Keep the building exactly as designed: the same geometry, proportions, number of storeys, window positions and sizes, the number and spacing of any fins, slats, screen bars and pergola rafters, railings, gates, boundary walls, materials and colours.",
  "This is an image-to-image restyle, not a new photo: the output must line up with the input image. Keep the exact same camera position, height, angle, lens and framing; the building, walls, gate and trees stay at the same place and size in the frame, with the same amount of sky and ground. Keep the same time of day and light direction.",
  "Make the materials real: painted render with subtle texture, real concrete and stone, real glass with natural reflections, real trees and plants, a real paved street.",
  "The setting is a residential neighbourhood in Faisalabad, Pakistan: make the neighbouring buildings and street look like real, ordinary, well-kept houses there, plain and unremarkable, without drawing attention away from the main building.",
  "Do not add or remove anything on the main building: no added plants, planters, furniture or lights on terraces, roofs or walls. No people, no vehicles, no text, no signage, no logos, no watermarks.",
].join(" ");

const NOTES = {
  day: "Bright, clear daytime light with soft natural shadows.",
  dusk: "Dusk: deep blue evening sky, warm interior light glowing from the windows, soft light under the porch ceiling. No other exterior lights: do not add wall lights, spotlights or strip lights to the facade.",
  aerial:
    "A high drone photograph looking steeply down at the building and its plot, exactly as in the input: the flat roof with its stair room is fully visible from above, the porch and the rest of the plot are seen from above, and the neighbouring roofs fill the background. The neighbouring houses are as plain as in the input: clean flat roofs with no tanks or clutter, simple rectangular windows, no arches or ornament, tidy paved yards with no bare dirt. Keep this high viewpoint and steep downward angle; do not lower the camera or turn it into a street-level or front view.",
};

// What each new design's materials are, and how it stands on its plot. The older designs' prompts have no such note.
const DESIGN_NOTES = {
  "5-marla":
    "The street-facing bay is real terracotta brick tile with fine mortar joints; the frame beside it, and the other walls, are smooth off-white plaster. The black metal jaali across the first-floor balcony is a grid of square openings: keep every bar straight, evenly spaced and in place. The porch ceiling and the gate are timber. The house is attached on both sides: the neighbouring houses stand against it with no gap between them.",
  "10-marla":
    "The upper box is smooth charcoal-grey plaster, framed around its corner window in exposed concrete; the ground floor front is exposed concrete and the other walls are light warm-grey plaster. The stair tower is faced in straight, evenly spaced vertical timber slats, and the terrace has a slim black steel pergola: keep every slat and rafter in place. The house is attached to its neighbour on the left and has an open side passage on the right.",
};

// The 1 Kanal's notes are per shot and name only what that shot's render shows: a part named in a shot
// that cannot see it gets drawn anyway, such as the side terrace's pergola sticking out past the house.
const KANAL = {
  pier: "The tall pier, with its thin straight white LED lines, is plain mid-grey natural stone in large tiles with thin dark joints: never travertine or beige.",
  block: "The ground-floor block to the right of the pier is a soft taupe travertine with fine horizontal grain.",
  entrance: "The entrance is a pale beige tile panel with tall warm timber stiles, slits of dark glass and long black pull handles.",
  porch: "Under the white porch beam the columns are polished black granite, plain and without white veins, and the wide back wall of the porch is only large bronze-brown tiles.",
  marble: "The side panel of the porch, and only that panel, is a book-matched bronze marble with fine thin golden veins: matt natural stone whose veins do not glow.",
  upper: "The upper wall on the left is a black panel with thin LED lines, warm timber vertical slats and a dark glass panel under a slim black hood.",
  roof: "The wide roof overhang has a dark charcoal fascia and a warm timber soffit, and the lower canopy matches it, with a flat top.",
  glass: "The terrace railings are frameless smoked grey glass, and the terrace over the porch has this glass on all three open sides.",
  emptyTerrace: "The terrace over the porch is completely empty: no pots, plants or furniture on it.",
  onePot: "The only potted plant is the one pot on the right-hand terrace, as a fan palm in a dark pot, where the input has it.",
  noPergola: "Nothing projects beyond the right-hand side of the house: no pergola, frame, grille or louvres past that wall, only what the input shows there.",
  bed: "The bed behind the low white kerb, to the right of the entrance steps, is full of rounded clipped shrubs and lavender, with one broad-leafed palm where the input has its small tree at the right-hand end. These plants stay inside that bed.",
  clearDrive: "The driveway and porch floor are clear paving, with no plants, pots or beds on them or beside them.",
  noWall: "The front boundary wall is not in this view. To the left of the porch there is only the plain grey wall of the input: no lattice, no timber, no slats, no gate and no wall lights there, and the neighbouring buildings have none either.",
  frontWall: "The front boundary wall, from left to right, is exactly as in the input: a flat ochre panel that is not a door, then one plain timber door, then a low rectangular screen of black geometric metal lattice, then the angled corner in warm timber slats under a dark hood. It is grey stone in large tiles on a white base, and the two gate piers are black granite.",
  noPavementPlants: "Nothing grows outside the boundary wall: the pavement is clear to the foot of the wall.",
  kerb: "The kerb and pavement run straight, exactly as in the input, with no curved corner.",
  neighbours: "The neighbouring houses are plain, boxy and in good repair: no ruined walls, rubble, overhead wires or clutter.",
  noPorchLights: "The porch ceiling has no lights.",
  details: "Keep every slat, joint, wall light and LED line in place.",
};
const SHOT_NOTES = {
  "1-kanal": {
    "front-day": [KANAL.pier, KANAL.block, KANAL.entrance, KANAL.porch, "No marble shows in this view.", KANAL.upper, KANAL.roof, KANAL.glass, KANAL.emptyTerrace, KANAL.onePot, KANAL.noPergola, KANAL.bed, KANAL.clearDrive, KANAL.noWall, KANAL.neighbours, KANAL.details],
    "front-dusk": [KANAL.pier, KANAL.block, KANAL.entrance, KANAL.porch, KANAL.marble, KANAL.upper, KANAL.roof, KANAL.glass, KANAL.emptyTerrace, KANAL.onePot, KANAL.noPergola, KANAL.bed, KANAL.clearDrive, KANAL.noWall, KANAL.neighbours, KANAL.noPorchLights, KANAL.details],
    street: [KANAL.pier, "The ground-floor block to the right of the pier is taupe travertine with fine horizontal grain.", KANAL.entrance, KANAL.porch, KANAL.marble, KANAL.upper, KANAL.roof, KANAL.glass, KANAL.emptyTerrace, KANAL.onePot, KANAL.noPergola, KANAL.frontWall, "Above the corner of the wall, only the top of the planting in the input shows.", KANAL.clearDrive, KANAL.noPavementPlants, KANAL.kerb, KANAL.neighbours, KANAL.details],
    side: [
      "This is the long right-hand side of the house, seen from along the side street, exactly as in the input: do not swing the camera round towards the front of the house. From left to right the frame shows the small porch, the pier, the corner terrace with its large windows, the recessed side terrace with its windows on both floors, the tall stone mass and the sand-coloured rear block, and the boundary wall runs across the full width of the frame in front of them.",
      "Every wall, window and terrace stays where the input has it, and no window is added behind the terrace over the porch.",
      "The pier and the tall side masses are plain mid-grey natural stone in large tiles with thin dark joints, with straight thin white LED lines. The rear block is plain sand-coloured plaster. The drawing room block is soft taupe travertine with fine horizontal grain, with its tall panel of warm timber slats.",
      KANAL.marble,
      "The slim black steel pergola stays inside the recess over the side terrace, between its walls, and does not stick out.",
      KANAL.roof,
      KANAL.glass,
      "The only potted plants are the two in the input, as fan palms in dark pots: one on the corner terrace and one on the side terrace. The terrace over the porch has no plants.",
      "The boundary wall is grey stone in large tiles on a white base, with warm timber slats under dark hoods and plain timber doors, exactly where the input has them. On the short front part at the far left, a flat ochre panel stays a panel and is not a door, and there is one timber door only.",
      "The only planting is what shows over the wall at the corner. There are no plants in front of the porch, in the driveway, or outside the boundary wall.",
      KANAL.neighbours,
      KANAL.noPorchLights,
      KANAL.details,
    ],
    aerial: [
      "Seen from this height the timber soffits under the overhangs cannot be seen: the roofs show only their flat charcoal tops and fascias, and the pier has no cap of its own, only the flat canopy over it.",
      "The main roof is flat grey with its low sand-coloured parapets and two small tank covers, and it stays fully visible.",
      KANAL.pier,
      "The walls of the corner block are soft taupe travertine with fine horizontal grain, with a tall panel of warm timber slats.",
      KANAL.entrance,
      KANAL.porch,
      KANAL.marble,
      KANAL.upper,
      "The slim black steel pergola stays inside the recess over the side terrace, between its walls.",
      KANAL.glass,
      KANAL.emptyTerrace,
      "The only potted plants are the two in the input, as fan palms in dark pots: one on the corner terrace and one on the side terrace.",
      KANAL.frontWall,
      "The side boundary wall is the same stone with warm timber slats under dark hoods.",
      "The lawn bed behind the wall at the corner has rounded clipped shrubs, lavender and one broad-leafed palm. These plants stay inside that bed.",
      KANAL.clearDrive,
      KANAL.noPavementPlants,
      "The roads are plain dark asphalt.",
      KANAL.details,
    ],
  },
};

// Where a design differs from the general notes
const NOTE_OVERRIDES = {
  "1-kanal": {
    dusk: "Dusk: a soft blue-grey evening sky with the light still in it, and warm interior light behind sheer curtains in the windows. Keep every exterior light exactly where the input has it and do not add any: the warm wall lights with their soft up and down glow, the small round downlights in the timber soffits with their glow on the walls below, the soft scallops of light under the overhangs and the hood, and the thin white LED lines. The facade stays clearly readable, not dark.",
    aerial:
      "A high drone photograph looking down at the building and its corner plot, exactly as in the input: the flat roof and its charcoal overhang are fully visible from above, with no stair room, and the porch and the rest of the plot are seen from above. The two roads meet at the corner of the plot, and the neighbouring roofs are on the far side only. The neighbouring houses are as plain as in the input: clean flat roofs with no tanks or clutter, simple rectangular windows, no arches or ornament, tidy paved yards with no bare dirt. Keep this high viewpoint and downward angle; do not lower the camera or turn it into a street-level or front view.",
  },
};

// Pass 2, only for the designs listed: one narrow edit to the pass-1 photo, for a design change the
// source render does not show yet. Asked separately because mixing it into pass 1 makes the model
// loosen the rest of the design.
const EDIT_LOCK =
  "Edit this photograph. Change only what is described here and keep everything else exactly the same: the camera, framing, building, colours, light, sky, trees, walls, gate and neighbouring houses stay as they are.";
// The hero house is still the earlier 1 Kanal design, so its posters keep this edit
const HERO_EDIT = `${EDIT_LOCK} The first-floor terrace over the car porch gets a frameless clear glass railing, the same height and style as the existing glass, along every open edge: the glass runs the full length of the front edge up to the house wall and along both short ends, so all open sides of the terrace are closed by glass. If the terrace is not visible, change nothing.`;
const DESIGN_EDITS = {
  "2-kanal": `${EDIT_LOCK} The first-floor terrace over the car porch must have a frameless clear glass railing on all three open sides. The front and right-hand glass already exist; keep them. Add the missing glass along the left-hand short end of the terrace, the same height and style as the existing glass, running from the front corner back to the house wall, so the terrace is fully enclosed by glass. If the terrace is not visible, change nothing.`,
};

/** Designs whose stills were made from Cycles finals; every other design starts from a fast render */
const CYCLES_FINAL = new Set(["2-kanal"]);

/** The render a still is made from, and the command that writes it */
function stillSource(design, shot) {
  const fromFlags = opt("engine") || opt("quality") || !CYCLES_FINAL.has(design);
  const engine = fromFlags ? opt("engine", "eevee") : "cycles";
  const quality = fromFlags ? opt("quality", "preview") : "final";
  return {
    engine,
    quality,
    source: join(root, "render/out", design, "stills", `${shot}-${engine}-${quality}.png`),
    render: fromFlags
      ? `node scripts/enhance-renders.mjs sources --only ${design}/${shot} --engine ${engine} --quality ${quality}`
      : `npm run render:still -- --design ${design} --shot ${shot} --engine ${engine} --quality ${quality}`,
  };
}

function stillNote(design, shot, config) {
  const notes = { ...NOTES, ...NOTE_OVERRIDES[design] };
  const parts = [];
  if (shot === "aerial") parts.push(notes.aerial);
  parts.push((config.timeOfDay ?? 0) >= 0.5 ? notes.dusk : notes.day);
  if (shot === "street") parts.push("Seen from the street.");
  if (DESIGN_NOTES[design]) parts.push(DESIGN_NOTES[design]);
  if (SHOT_NOTES[design]?.[shot]) parts.push(SHOT_NOTES[design][shot].join(" "));
  return parts.join(" ");
}

/** The stills in render/shots/*.json; sequence configs there have no shots */
const shotFiles = readdirSync(join(root, "render/shots"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ design: f.replace(/\.json$/, ""), config: JSON.parse(readFileSync(join(root, "render/shots", f), "utf8")) }))
  .filter(({ config }) => config.shots);
const DESIGNS = shotFiles.map(({ design }) => design);

/** Every image this script can replace: its source, its output and how to describe it to the model */
const JOBS = shotFiles.flatMap(({ design, config }) =>
  Object.entries(config.shots).map(([shot, shotConfig]) => ({
    id: `${design}/${shot}`,
    design,
    shot,
    kind: "still",
    ...stillSource(design, shot),
    note: stillNote(design, shot, shotConfig),
    edit: DESIGN_EDITS[design],
    aspect: "16:9",
    resolution: "2K",
  })),
);
for (const orientation of ["landscape", "portrait"]) {
  const config = `1-kanal-hero-${orientation}`;
  JOBS.push({
    id: `hero/${orientation}`,
    kind: "poster",
    orientation,
    source: join(root, "render/out/1-kanal", `${config}-eevee-preview`, "0191.png"),
    render: `npm run render:sequence -- --config ${config} --frames 191-191`,
    aspect: orientation === "landscape" ? "16:9" : "9:16",
    resolution: "2K",
    note: `${NOTES.dusk} The finished house seen from the street.`,
    edit: HERO_EDIT,
  });
}

const rawPath = (job, suffix = "") => join(root, "render/out/ai", `${job.id}${suffix}.png`);

function apiKey() {
  const key = setting("OPENROUTER_API_KEY");
  if (!key) throw new Error("Set OPENROUTER_API_KEY in .env");
  return key;
}

/** The model from --model or IMAGE_MODEL. There is no default: a model is a choice of cost and look. */
function imageModel() {
  const model = opt("model") || setting("IMAGE_MODEL");
  if (!model) throw new Error("No image model: pass --model <id> or set IMAGE_MODEL in .env. Nothing was generated.");
  return model;
}

/** The shots named by --only and --design. Naming none is an error, so a bare run changes nothing. */
function selected() {
  const only = opt("only")?.split(",") ?? [];
  const designs = opt("design")?.split(",") ?? [];
  if (!only.length && !designs.length) {
    throw new Error(`${command} needs --only <design>/<shot>,... or --design <slug>,... Nothing was changed.`);
  }
  const unknown = only.filter((id) => !JOBS.some((j) => j.id === id));
  if (unknown.length) throw new Error(`Unknown shot(s): ${unknown.join(", ")}. Known: ${JOBS.map((j) => j.id).join(", ")}`);
  const missing = designs.filter((d) => !DESIGNS.includes(d));
  if (missing.length) throw new Error(`Unknown design(s): ${missing.join(", ")}. Known: ${DESIGNS.join(", ")}`);
  return JOBS.filter((j) => only.includes(j.id) || designs.includes(j.design));
}

/** Renders each selected still's source for the model, skipping those already written */
function sources() {
  const stills = selected().filter((j) => j.kind === "still");
  if (!stills.length) throw new Error("sources renders stills; the hero posters' sources come from render:sequence");
  let rendered = 0;
  for (const job of stills) {
    if (existsSync(job.source)) {
      console.log(`${job.id}: already rendered, skipped`);
      continue;
    }
    // Cycles' presets already suit the model; EEVEE's are 1280 and 3200, so it gets the model's own width
    const width = opt("width", job.engine === "eevee" ? "2048" : undefined);
    const args = ["still", "--design", job.design, "--shot", job.shot, "--engine", job.engine, "--quality", job.quality, ...(width ? ["--width", width] : [])];
    const { status } = spawnSync(process.execPath, [join(root, "scripts/blender.mjs"), ...args], { cwd: root, stdio: "inherit" });
    if (status !== 0) throw new Error(`${job.id}: render failed (exit ${status})`);
    rendered++;
  }
  console.log(`${rendered} rendered, ${stills.length - rendered} already present`);
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
async function callModel(key, model, inputPath, prompt, job) {
  // Sent at the output size (2048 on the long side): large renders are downscaled to keep the request
  // small, and the 960px hero frames are upscaled so the model sees the same canvas it draws on
  const input = await sharp(inputPath).resize(2048, 2048, { fit: "inside" }).jpeg({ quality: 92 }).toBuffer();
  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Noor Developers render enhance" },
    body: JSON.stringify({
      model,
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
async function generateOne(job, key, model) {
  // Never falls back to a delivered image: that would restyle a restyle
  if (!existsSync(job.source)) throw new Error(`${job.id}: no source render at ${job.source}. Render it with: ${job.render}`);
  let total = 0;
  const final = rawPath(job);
  const base = job.edit ? rawPath(job, ".base") : final;
  if (!(flag("edit-only") && job.edit && existsSync(base))) {
    const attempts = Number(opt("attempts", "3"));
    let best = null;
    for (let i = 1; i <= attempts; i++) {
      const { bytes, cost } = await callModel(key, model, job.source, `${BASE_PROMPT} ${job.note}`, job);
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
    const { bytes, cost } = await callModel(key, model, base, job.edit, job);
    writeKeeping(final, bytes);
    await report(job, final, cost, "edit", await framingScore(job.source, final));
    total += cost;
  }
  return total;
}

async function generate() {
  const jobs = selected();
  const model = imageModel();
  const key = apiKey();
  const named = Boolean(opt("only"));
  let total = 0;
  const failed = [];
  for (const job of jobs) {
    if (!named && !flag("force") && existsSync(rawPath(job))) {
      console.log(`${job.id}: already generated, skipped`);
      continue;
    }
    try {
      total += await generateOne(job, key, model);
    } catch (e) {
      failed.push(job.id);
      console.error(e.message);
    }
  }
  console.log(`Model ${model}; total cost $${total.toFixed(4)}`);
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

const commands = { sources, generate, encode };
if (!commands[command]) {
  console.error("usage: node scripts/enhance-renders.mjs <sources|generate|encode> (--only <design>/<shot>,... | --design <slug>,...) [--model <id>] [--engine eevee|cycles] [--quality preview|high|final] [--width <px>] [--force] [--edit-only] [--attempts <n>]");
  process.exit(1);
}
try {
  await commands[command]();
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
