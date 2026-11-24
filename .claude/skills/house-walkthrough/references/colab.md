# Rendering on Colab

All rendering runs on Google Colab GPUs through `scripts/colab/panoramas.mjs`. The Colab CLI (`colab`) is installed and signed in **inside WSL** (distro `Ubuntu-24.04`), and the driver calls it through `wsl` for you. To run a `colab` command yourself:

```
wsl -d Ubuntu-24.04 --exec bash -lc "colab sessions"
wsl -d Ubuntu-24.04 --exec bash -lc "colab usage"            # compute-unit balance
wsl -d Ubuntu-24.04 --exec bash -lc "colab stop -s kanA"
```

If `colab` says the user is not signed in, stop and ask the maintainer to sign in. Do not try to do it yourself.

## What the driver does

Per run it packs `render/` and `src/designs/walkthroughs/` from the working tree, opens a session on the first GPU Colab grants from `--gpus` (default `G4,L4,T4`), installs Blender 5.0.1 and the CC0 assets on the VM, then renders the views **one at a time**, downloading each image as soon as it is done. It **skips any view whose image is already on disk**, retries a failed view once in a fresh session, retires a session after 25 minutes, and always stops the session at the end (unless `--keep`). It logs to `render/out/<design>/colab.log`.

Options (pass them in `-DriverArgs` with `start-render.ps1`, or straight to `node scripts/colab/panoramas.mjs --design <slug> ...`):

| Option | Meaning |
|---|---|
| `--views a,b,c` or `--views all` | which spots (ids from the walkthrough JSON) |
| `--quality preview\|mid\|high` | `mid` (128 samples) is the standard for the site; `high` for a view that stays noisy |
| `--gpus G4,L4,T4` | GPUs to try, in order. **Never add H100 or A100** (the maintainer ruled them out) |
| `--session kanA` | session name. Use a different one per parallel run (`kanA`, `kanB`, `kanC`) |
| `--depth` | render depth images into `render/out/<design>/depth/<id>-depth.png` instead of colour |
| `--engine eevee` | quick EEVEE probes (not representative of Cycles lighting) |
| `--extra "--perspective 90 --width 1280"` | more `render/run.py panorama` arguments: a flat 16:9 test view looking along world angle 90, or a smaller panorama (`--width 1280`), `--clay` for a grey geometry check |
| `--suffix -x` | add `-x` to the output name (so a test does not overwrite or block a real image) |
| `--out <dir>` | output folder (default `render/out/<design>/panoramas`) |
| `--backend CUDA` | force CUDA (regression gate only) |
| `--ref HEAD` | render a git revision instead of the working tree (regression baseline) |
| `--keep` | leave the session running after a clean finish, so the next run skips setup. **Read "Stale images" first** |

Output names: `<id>-cycles-<quality>.png` for panoramas, `<id>-persp.png` for a `--perspective` test, `<id>-depth.png` for depth (all with the suffix added to the id).

## Running detached (always, for anything over a couple of minutes)

```
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/start-render.ps1 -Session kanA -Design 2-kanal -DriverArgs "--views all --quality mid"
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/status-render.ps1 -Design 2-kanal            # colour, mid
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/status-render.ps1 -Design 2-kanal -Depth     # depth
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/stop-render.ps1 -Session kanA
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/stop-render.ps1 -All
```

Babysitting loop: check status every 10 to 15 minutes. If it prints `STALLED` (no log line for 8 minutes while a driver runs), stop that session and start the same command again. If a driver has exited but views are missing, start it again: finished views are skipped. A short test (one or two views) can run in the foreground with a 15-minute timeout on your shell call.

## GPUs, speed and cost (measured on this project)

| GPU | `mid` panorama 4096×2048 | Notes |
|---|---|---|
| G4 (RTX PRO 6000) | about 45–60 s | often refused with a 503; the driver then falls back |
| L4 | about 3–3.5 min | about 1.9 compute units per hour |
| T4 | about 11–14 min | last resort |

- Setup is about 1 to 5 minutes per session. Depth images are fast (about 10–20 s each on a G4).
- Preview check renders at `--width 1280` take about 40 s on an L4.
- Budget about 1.5 times your estimate, for drops and retries.
- Check the balance before and after a big run (`colab usage`, also printed at the end of each driver run). Tell the maintainer the cost.

## Parallel sessions

Run 2 (at most 3) drivers side by side, each with its own `--session` and **its own view list**, for example by splitting the spot ids into halves:

```
... start-render.ps1 -Session kanA -Design 2-kanal -DriverArgs "--views gate,porch,foyer,... --quality mid"
... start-render.ps1 -Session kanB -Design 2-kanal -DriverArgs "--views bed3,bath3,... --quality mid"
```

To get the id list: `node -e "console.log(require('./src/designs/walkthroughs/2-kanal.json').viewpoints.map(v=>v.id).join(','))"`. Colab refuses a third or fourth active session ("too many active sessions"), and the driver may then fall to a slow T4. If that happens, stop that chain and start it again later. They all log into the same `colab.log`, and the lines carry view names.

## Recipes

**EEVEE perspective probe** (to pick a spot's position and facing, or to see a new element fast):
```
node scripts/colab/panoramas.mjs --design 2-kanal --views lounge,master --engine eevee --quality preview --extra "--perspective 90 --width 1280" --session kanP
```
The result is `render/out/2-kanal/panoramas/lounge-persp.png`. Delete it before probing the same spot again, or the driver skips it.

**Check renders** (Cycles, small, every hero spot):
```
powershell -NoProfile -File .claude/skills/house-walkthrough/scripts/start-render.ps1 -Session kanA -Design 2-kanal -DriverArgs "--views gate,porch,foyer,drawing,... --quality preview" -Extra "--width 1280"
```
`-DriverArgs` is split on spaces, so anything that needs a value with spaces goes in `-Extra`, which becomes the driver's `--extra`. Then build the overview: `npm run render:overview -- --design 2-kanal --quality preview`.

**Style gate:** `node scripts/colab/panoramas.mjs --design 2-kanal --views lounge,master-bath,kitchen --quality mid --session kanA`.

**Full set:** two detached chains as in "Parallel sessions", `--quality mid`. Then the same chains again with `--depth` added.

**Regression gate** (before and after a builder change, same GPU type both times):
```
node scripts/colab/panoramas.mjs --design 5-marla  --views drawing --quality mid --gpus L4 --backend CUDA --ref HEAD --out render/out/5-marla/baseline-2k --session kanR
node scripts/colab/panoramas.mjs --design 1-kanal  --views drawing,master-bath --quality mid --gpus L4 --backend CUDA --ref HEAD --out render/out/1-kanal/baseline-2k --session kanR
node scripts/colab/panoramas.mjs --design 10-marla --views drawing --quality mid --gpus L4 --backend CUDA --ref HEAD --out render/out/10-marla/baseline-2k --session kanR
# after the change: the same without --ref, with --out render/out/<d>/after-2k
python scripts/diff-renders.py render/out/5-marla/baseline-2k/drawing-cycles-mid.png render/out/5-marla/after-2k/drawing-cycles-mid.png --tolerance 1
```
Run the four baseline views detached, since they take about 15 minutes on an L4. Commit nothing from `render/out/`: it is gitignored.

## Pitfalls (each of these happened)

- **Stale images.** A kept session (`--keep`) still has its old `render/out` on the VM, so re-rendering a view under the same name downloads the **old** image ("already rendered"). Before re-rendering a changed view: run `stop-render.ps1 -All` so no kept session is reused, **delete the local PNG** (otherwise the driver skips it), then render.
- **Silent hangs.** `colab exec` can wait 20 to 60 minutes after a dropped connection with no output, including during setup. The status script's `STALLED` flag is how you notice. Stop and restart.
- **Dropped connections** about every 25 to 45 minutes are normal. The driver retries, and restarting is safe.
- **A download can fail** after a good render (exit 0, no file). Rerun those views.
- **503 on the G4** is normal. Let it fall back to the L4.
- **Do not pipe code into `colab exec` from PowerShell.** The byte-order mark breaks it. The driver uses `-f file.py`, so keep it that way.
- **Do not kill all `wsl` or all `node` processes.** Kill only the driver by its command line, which is what `stop-render.ps1` does.
- **Every render is a remote job.** Never "just quickly" run Blender locally. The laptop has no GPU, and it has run out of memory doing this before.
