// Renders every panorama of a design's walkthrough, one Blender run per viewpoint, skipping those already finished.
//
//   node scripts/panoramas.mjs --design 5-marla [--engine cycles] [--quality preview] [--width 4096] [--method auto]
//                              [--viewpoints drawing,kitchen] [--max-minutes 480] [--force]
//
// Meant to be left running overnight. Each panorama image is written atomically by render/run.py, so stopping this
// script (or hitting --max-minutes, which kills the running Blender) never leaves a half-written image where a
// finished one is expected, and running it again carries on with the viewpoints still missing. Faces of a stitched
// panorama that were already rendered are kept, too.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const design = opt("design");
if (!design) {
  console.error("usage: node scripts/panoramas.mjs --design <slug> [--engine cycles] [--quality preview] [--width 4096] [--viewpoints a,b] [--max-minutes N] [--force]");
  process.exit(1);
}
const engine = opt("engine", "cycles");
const quality = opt("quality", "preview");
const width = opt("width", "4096");
const method = opt("method", "auto");
const maxMinutes = Number(opt("max-minutes", "0"));
const force = flag("force");
// EEVEE previews only: brighten the lighting so the geometry can be judged
const extra = ["fill", "exposure"].flatMap((n) => (opt(n, "") ? [`--${n}`, opt(n, "")] : []));

const blender = process.env.BLENDER_PATH || "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe";
if (!existsSync(blender)) throw new Error(`Blender not found at ${blender}; set BLENDER_PATH`);

const file = join(root, "src", "designs", "walkthroughs", `${design}.json`);
if (!existsSync(file)) {
  console.error(`No walkthrough for design "${design}": ${file}`);
  process.exit(1);
}
const walkthrough = JSON.parse(readFileSync(file, "utf8"));
const all = walkthrough.viewpoints.map((v) => v.id);
const wanted = opt("viewpoints", "").split(",").filter(Boolean);
const unknown = wanted.filter((id) => !all.includes(id));
if (unknown.length) {
  console.error(`No viewpoint ${unknown.join(", ")}. Viewpoints: ${all.join(", ")}`);
  process.exit(1);
}
const todo = wanted.length ? wanted : all;

const BLANK_EXIT = 3; // EEVEE ran out of GPU memory and rendered black; a fresh process renders the frame fine
const RESTARTS = 5;
const started = Date.now();
const deadline = maxMinutes > 0 ? started + maxMinutes * 60_000 : Infinity;
const final = (id) => join(root, "render", "out", design, "panoramas", `${id}-${engine}-${quality}.png`);

let rendered = 0;
let skipped = 0;
for (const id of todo) {
  if (existsSync(final(id)) && !force) {
    skipped++;
    console.log(`${id}: already rendered`);
    continue;
  }
  if (Date.now() >= deadline) {
    console.log(`Time limit reached before ${id}; run the command again to carry on.`);
    break;
  }
  let status;
  let timedOut = false;
  for (let attempt = 0; attempt <= RESTARTS; attempt++) {
    const left = deadline - Date.now();
    const args = ["-b", "--factory-startup", "--python-exit-code", "1", "--python", "render/run.py", "--", "panorama",
      "--design", design, "--viewpoint", id, "--engine", engine, "--quality", quality, "--width", width, "--method", method, ...extra];
    console.log(`${id}: rendering (${new Date().toLocaleTimeString()})`);
    const r = spawnSync(blender, args, { cwd: root, stdio: "inherit", timeout: Number.isFinite(left) ? left : undefined, killSignal: "SIGKILL" });
    status = r.status;
    timedOut = r.error?.code === "ETIMEDOUT";
    if (timedOut || status !== BLANK_EXIT) break;
    console.log(`Restarting Blender with fresh GPU memory (${attempt + 1}/${RESTARTS})`);
  }
  if (timedOut) {
    console.log(`Time limit reached while rendering ${id}; its finished faces are kept. Run the command again to carry on.`);
    break;
  }
  if (status !== 0) {
    console.error(`${id}: Blender exited with ${status}`);
    process.exit(status ?? 1);
  }
  if (!existsSync(final(id))) {
    console.error(`${id}: no image was written`);
    process.exit(1);
  }
  rendered++;
}
console.log(`${rendered} rendered, ${skipped} already done, ${todo.length - rendered - skipped} left, in ${Math.round((Date.now() - started) / 60000)} min`);
