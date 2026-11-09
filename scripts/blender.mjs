// Runs the render pipeline in headless Blender: node scripts/blender.mjs <fetch|still|frames|scene> [options]
// Set BLENDER_PATH if Blender 5.0 is not at the default install path.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const blender = process.env.BLENDER_PATH || "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe";
if (!existsSync(blender)) throw new Error(`Blender not found at ${blender}; set BLENDER_PATH`);

const [command, ...args] = process.argv.slice(2);
const script = command === "fetch" ? "render/fetch_assets.py" : "render/run.py";
const scriptArgs = command === "fetch" ? args : [command, ...args];
const root = fileURLToPath(new URL("../", import.meta.url));

// Exit code 3 from run.py: a frame kept rendering black because EEVEE's GPU memory filled up
// over a long run. Frame ranges skip finished frames, so a fresh Blender process carries on.
const BLANK_EXIT = 3;
const RESTARTS = 5;
let status;
for (let attempt = 0; attempt <= RESTARTS; attempt++) {
  if (attempt) console.log(`
Restarting Blender with fresh GPU memory (${attempt}/${RESTARTS})
`);
  status = spawnSync(blender, ["-b", "--factory-startup", "--python-exit-code", "1", "--python", script, "--", ...scriptArgs], {
    cwd: root,
    stdio: "inherit",
  }).status;
  if (status !== BLANK_EXIT || !["frames", "sequence", "panorama"].includes(command)) break;
}
process.exit(status ?? 1);
