// Renders walkthrough panoramas on a Google Colab GPU through the Colab CLI, one blocking exec per viewpoint.
//
//   node scripts/colab/panoramas.mjs --design 1-kanal [--views hall-entry,drawing | all] [--quality mid]
//        [--gpus G4,L4] [--backend CUDA] [--ref HEAD] [--out render/out/<design>/panoramas] [--session noor]
//        [--suffix -cuda] [--keep] [--engine eevee] [--extra "--perspective 0 --width 1280"]
//
// Quick tests run here too, never on the laptop (it has no GPU): --engine eevee for EEVEE faces, --extra for more
// run.py panorama arguments (a flat --perspective view, a small --width), with --quality preview and a --suffix.
//
// What it does, in order, and why:
// - Packs the code: the working tree's render/ (without assets/ and out/) and the walkthrough files, or with --ref a
//   git revision of them (the regression baseline is rendered from HEAD before the builder changes).
// - Opens a session on the first GPU in --gpus that Colab grants (G4 often answers 503, then the L4 is used), uploads
//   the bundle and runs scripts/colab/remote_setup.py (Blender 5.0.1 and the CC0 assets, once per VM).
// - Per viewpoint, skipping any image already in --out: runs scripts/colab/remote_render.py, which logs every
//   line to a file on the VM, then downloads the image at once. A dropped connection gets one retry; the remote
//   script picks up a render still running or already finished instead of starting it again.
// - Always stops the session at the end, also on an error or Ctrl+C, so no compute units run on. With --keep it is
//   left running after a clean finish only, for a second run straight after (which reuses it, skipping the setup).
//
// On Windows the CLI runs inside WSL (COLAB_WSL_DISTRO, default Ubuntu-24.04, with `colab` on the login PATH);
// elsewhere `colab` is called directly. Progress is logged to render/out/<design>/colab.log.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};

const design = opt("design");
if (!design) {
  console.error("usage: node scripts/colab/panoramas.mjs --design <slug> [--views a,b|all] [--quality mid] [--gpus G4,L4] [--backend CUDA] [--ref HEAD] [--out dir] [--suffix s]");
  process.exit(1);
}
const quality = opt("quality", "mid");
const gpus = opt("gpus", "G4,L4").split(",");
const backend = opt("backend", ""); // empty: OptiX, then CUDA (render/noor_render/output.py)
const ref = opt("ref", "");
const suffix = opt("suffix", "");
const engine = opt("engine", "cycles");
const extra = opt("extra", "");
const imageName = (name) => (extra.includes("--perspective") ? `${name}-persp.png` : `${name}-${engine}-${quality}.png`);
const session = opt("session", "noor");
const outDir = resolve(root, opt("out", join("render", "out", design, "panoramas")));
const tour = JSON.parse(readFileSync(join(root, "src", "designs", "walkthroughs", `${design}.json`), "utf8"));
const wanted = opt("views", "all");
const views = wanted === "all" ? tour.viewpoints.map((v) => v.id) : wanted.split(",");
for (const v of views) if (!tour.viewpoints.some((p) => p.id === v)) throw new Error(`no viewpoint "${v}" in ${design}`);
mkdirSync(outDir, { recursive: true });
const logFile = join(root, "render", "out", design, "colab.log");

const log = (m) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${m}`;
  console.log(line);
  appendFileSync(logFile, line + "\n");
};

// ---- the CLI, in WSL on Windows
const windows = process.platform === "win32";
const distro = process.env.COLAB_WSL_DISTRO || "Ubuntu-24.04";
const vmPath = (p) => (windows ? `/mnt/${p[0].toLowerCase()}${p.slice(2).replaceAll("\\", "/")}` : p);
// Asynchronous on purpose: spawnSync's timeout kills wsl.exe, but the colab process inside WSL can keep the output
// pipes open, and spawnSync then waits for ever (a 0.2 MB upload once hung for 34 minutes with the GPU billing idle).
// Here a timeout kills the process and lets go of its pipes, and the call reports a failure.
function colab(args, timeoutS = 120) {
  const [cmd, full] = windows ? ["wsl", ["-d", distro, "--exec", "bash", "-lc", 'exec colab "$@"', "colab", ...args]] : ["colab", args];
  return new Promise((done) => {
    const child = spawn(cmd, full, { stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    child.stdout.on("data", (d) => (text += d));
    child.stderr.on("data", (d) => (text += d));
    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      done({ ok, text: text.trim() });
    };
    const timer = setTimeout(() => {
      text += `\n(timed out after ${timeoutS + 60}s: colab ${args[0]})`;
      child.kill();
      child.stdout.destroy();
      child.stderr.destroy();
      finish(false);
    }, (timeoutS + 60) * 1000);
    child.on("error", (e) => {
      text += `\n${e.message}`;
      finish(false);
    });
    child.on("close", (code) => finish(code === 0));
  });
}

// ---- the code bundle
function bundle() {
  // a path relative to the repository: Windows' bsdtar and Git Bash's GNU tar both read it (GNU tar takes "C:" for a host)
  const rel = `render/out/${design}/${session}-bundle.tgz`; // one per session: two runs can go side by side
  const file = join(root, rel);
  const paths = ["render", "src/designs/walkthroughs"];
  const r = ref
    ? spawnSync("git", ["archive", "--format=tar.gz", "-o", rel, ref, ...paths], { cwd: root, encoding: "utf8" })
    : spawnSync("tar", ["-czf", rel, "--exclude=render/assets", "--exclude=render/out", "--exclude=__pycache__", ...paths],
        { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`could not pack the code: ${r.stderr}`);
  log(`packed ${ref ? `git ${ref}` : "the working tree"} (${(statSync(file).size / 1e6).toFixed(1)} MB)`);
  return file;
}

async function openSession(tgz) {
  if (await alive()) {
    // a session kept from an earlier run (--keep): Blender and the assets are there, only the code is replaced
    log(`reusing session ${session}`);
    await setup(tgz);
    return "the kept session";
  }
  for (const gpu of gpus) {
    log(`asking for a ${gpu}`);
    const r = await colab(["new", "-s", session, "--gpu", gpu], 600);
    if (r.ok && !/error|unavailable|503/i.test(r.text)) {
      log(`session ${session} on ${gpu}`);
      await setup(tgz);
      return gpu;
    }
    log(`${gpu} not granted: ${r.text.split("\n").slice(-1)[0]}`);
    await colab(["stop", "-s", session]);
  }
  throw new Error(`no GPU granted from ${gpus.join(", ")}`);
}

async function setup(tgz) {
  let up = await colab(["upload", "-s", session, vmPath(tgz), "/content/noor-bundle.tgz"], 120);
  if (!up.ok) {
    log(`upload failed, retrying: ${up.text.split("\n").slice(-1)[0]}`);
    up = await colab(["upload", "-s", session, vmPath(tgz), "/content/noor-bundle.tgz"], 120);
  }
  if (!up.ok) throw new Error(`upload failed: ${up.text}`);
  // about a minute when it works; a dropped connection once hung here for 51 minutes, so cap it and try once more
  const run = () => colab(["exec", "-s", session, "-f", vmPath(join(root, "scripts", "colab", "remote_setup.py")), "--timeout", "900"], 900);
  let r = await run();
  if (!/SETUP OK/.test(r.text)) {
    log(`setup gave no SETUP OK, running it again: ${r.text.split("\n").slice(-1)[0]}`);
    r = await run();
  }
  log(r.text.split("\n").filter((l) => /^\$|SETUP|exit [1-9]|NVIDIA|L4|G4|T4|Blender/.test(l)).slice(-6).join(" | "));
  if (!/SETUP OK/.test(r.text)) throw new Error("setup on the VM failed; see the lines above");
}

async function alive() {
  const r = await colab(["sessions"]);
  return r.ok && new RegExp(`(^|[^\w-])${session}([^\w-]|$)`, "m").test(r.text); // "noor" must not match "noor-b"
}

// A dropped connection can leave `colab exec` waiting with nothing running (once 46 minutes for a 3.5-minute render),
// so after the first good render a view gets four times the longest so far (at least 10 minutes), not the 45-minute cap.
let longest = 0;
const viewTimeout = () => (longest ? Math.max(600, Math.round(longest * 4)) : 2700);

async function renderOne(view) {
  const name = `${view}${suffix}`;
  const local = join(outDir, imageName(name));
  const remote = `/content/noor/render/out/${design}/panoramas/${imageName(name)}`;
  // every variable, every time: values set by an earlier exec stay in the kernel
  const env = [`DESIGN=${design}`, `VIEW=${view}`, `QUALITY=${quality}`, `NAME=${name}`, `NOOR_GPU_BACKEND=${backend}`,
    `ENGINE=${engine}`, `EXTRA=${extra}`].flatMap((e) => ["--env", e]);
  const limit = viewTimeout();
  const r = await colab(["exec", "-s", session, "-f", vmPath(join(root, "scripts", "colab", "remote_render.py")), "--timeout", String(limit), ...env], limit);
  const took = /RESULT [^:]+: exit 0, (\d+)s/.exec(r.text);
  if (took) longest = Math.max(longest, Number(took[1]));
  log(r.text.split("\n").filter((l) => /cycles device|RESULT|ERROR|Traceback|lost|rror/.test(l)).join(" | ") || r.text.slice(-300));
  // download to a temporary name, then rename: a broken transfer never looks like a finished image
  const part = `${local}.part`;
  await colab(["download", "-s", session, remote, vmPath(part)], 600);
  if (existsSync(part) && statSync(part).size > 20_000) {
    renameSync(part, local);
    log(`${name}: saved (${(statSync(local).size / 1e6).toFixed(1)} MB)`);
    return true;
  }
  if (existsSync(part)) unlinkSync(part);
  return false;
}

const keep = argv.includes("--keep"); // leave the session running for another run straight after this one
let tgz;
let open = false;
const stop = async (always = false) => {
  if (tgz && existsSync(tgz)) unlinkSync(tgz);
  if (!open) return;
  open = false;
  if (keep && !always) {
    log(`keeping session ${session} running (--keep): stop it with the next run or \`colab stop -s ${session}\``);
    return;
  }
  log(`stopping ${session}: ${(await colab(["stop", "-s", session])).text.split("\n").slice(-1)[0]}`);
};
process.on("SIGINT", () => {
  log("interrupted");
  stop(true).then(() => process.exit(130));
});

const started = Date.now();
try {
  const todo = views.filter((v) => !existsSync(join(outDir, imageName(`${v}${suffix}`))));
  log(`${design}: ${views.length - todo.length} of ${views.length} already rendered; ${todo.length} to go at ${quality}${backend ? ` (${backend})` : ""}`);
  if (todo.length) {
    tgz = bundle();
    open = true;
    let gpu = await openSession(tgz);
    for (const view of todo) {
      if (await renderOne(view)) continue;
      if (!await alive()) {
        log(`session lost; opening a new one`);
        gpu = await openSession(tgz);
      }
      log(`${view}: retrying once`);
      if (!await renderOne(view)) log(`${view}: FAILED after a retry`);
    }
    log(`done on ${gpu} in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  }
  await stop();
} catch (e) {
  log(`ERROR: ${e.message}`);
  await stop(true);
  process.exitCode = 1;
} finally {
  const usage = await colab(["usage"]);
  if (usage.ok) log(usage.text.replace(/\s+/g, " "));
}
