// Headless Chrome checks for the build-video hero, against the built site (npm run build first).
//
//   node scripts/check-hero.mjs [opening] [phases] [jump] [end] [control] [offscreen] [fallback] [static] [rotate] [skip] [--out render/out/hero-check]
//
//   opening    at load: the video's first frame (the blueprint) and the Design phase shown, the dusk poster hidden; the video
//              plays at once; the hero is one screen tall
//   phases     pause and seek to each phase's middle frame (landscape desktop and portrait phone), screenshot,
//              and check data-phase, the visible phase label, the compact headline and the ruler fill
//   jump       each ruler tick seeks the video to the start of its phase
//   end        at the end: the video fades back to the poster, the Move in phase and the actions show, the
//              toggle offers Replay, and Replay starts the build again
//   control    the toggle pauses (and the pause survives scrolling away and back) and resumes
//   offscreen  the video pauses while the hero is scrolled out of view and resumes when it is back
//   fallback   a browser that can't play AV1 gets the H.264 file
//   static     reduced motion, Save-Data, a 3G connection and JavaScript off: one screen tall, phase list
//              and actions visible, the dusk poster, no video requests
//   rotate     phone rotated portrait → landscape switches source at the same time position; an address-bar
//              height change (orientation unchanged) keeps the source
//   skip       "Skip past the build" is the hero's first focusable element, shows on focus, and moves focus
//              to #after-hero
//
// With no check named, all run. Drives Chrome over the DevTools protocol (Node's built-in WebSocket).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const ALL = ["opening", "phases", "jump", "end", "control", "offscreen", "fallback", "static", "rotate", "skip"];
const chosen = args.filter((a, i) => ALL.includes(a) && !args[i - 1]?.startsWith("--"));
const checks = chosen.length ? chosen : ALL;
const out = resolve(root, opt("out", "render/out/hero-check"));
mkdirSync(out, { recursive: true });

const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) throw new Error("No dist/index.html: run npm run build first");
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
]
  .filter(Boolean)
  .find((p) => existsSync(p));
if (!chrome) throw new Error("Chrome not found; set CHROME_PATH");

// ---------- static server for dist/ ----------
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain",
  ".mp4": "video/mp4",
};
const server = createServer((req, res) => {
  let path = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) return res.writeHead(404).end();
  const body = readFileSync(path);
  const headers = { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "accept-ranges": "bytes" };
  // Byte ranges, as GitHub Pages serves them: Chrome needs them to seek in a video
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? +range[1] : Math.max(0, body.length - +range[2]);
    const stop = range[1] && range[2] ? Math.min(+range[2], body.length - 1) : body.length - 1;
    if (start >= body.length || start > stop) return res.writeHead(416, { "content-range": `bytes */${body.length}` }).end();
    res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${stop}/${body.length}`, "content-length": stop - start + 1 });
    return res.end(body.subarray(start, stop + 1));
  }
  res.writeHead(200, { ...headers, "content-length": body.length });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---------- Chrome + CDP ----------
const profile = mkdtempSync(join(tmpdir(), "hero-check-"));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run",
  "--hide-scrollbars", "--mute-audio", "about:blank",
]);
let version;
for (let i = 0; i < 100 && !version; i++) {
  await sleep(100);
  version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
}
if (!version) throw new Error("Chrome did not start");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function openPage() {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(`${msg.error.message}`)) : ok(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) =>
    new Promise((ok, reject) => {
      pending.set(++id, { resolve: ok, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const page = {
    send,
    on: (fn) => listeners.push(fn),
    eval: async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expression, timeout = 20000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        if (await page.eval(expression).catch(() => false)) return true;
        await sleep(100);
      }
      return false;
    },
    async goto(path) {
      const loaded = new Promise((r) => listeners.push((m) => m.method === "Page.loadEventFired" && r()));
      await send("Page.navigate", { url: origin + path });
      await loaded;
    },
    async shot(file) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(out, file), Buffer.from(data, "base64"));
    },
    close: () => fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {}),
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  return page;
}

const DEVICES = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  phone: {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
};

async function device(page, name) {
  const d = DEVICES[name];
  await page.send("Emulation.setDeviceMetricsOverride", d);
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: d.mobile });
  if (d.ua) await page.send("Emulation.setUserAgentOverride", { userAgent: d.ua });
}

// Page-side helpers
const STATE = `(() => { const s = document.querySelector('[data-hero-stage]'), v = s.querySelector('[data-hero-video]'),
  root = document.querySelector('[data-hero]'), t = s.querySelector('[data-hero-toggle]');
  return {
  phase: s.dataset.phase, ready: s.hasAttribute('data-ready'), ended: s.hasAttribute('data-ended'),
  time: v.currentTime, paused: v.paused, src: v.currentSrc || v.src, readyState: v.readyState,
  video: +getComputedStyle(v).opacity,
  toggle: t.hidden ? 'hidden' : t.dataset.state, toggleText: t.hidden ? '' : t.innerText.trim(),
  label: [...s.querySelectorAll('.hero__phase')].filter((li) => +getComputedStyle(li).opacity > 0.5)
    .map((li) => li.querySelector('.hero__phase-label').textContent.replace(/\\s+/g, ' ').trim()),
  cta: getComputedStyle(s.querySelector('.hero__cta')).visibility === 'visible' && getComputedStyle(s.querySelector('.hero__cta')).display !== 'none',
  title: getComputedStyle(s.querySelector('.hero__title')).transform,
  height: root.offsetHeight, inner: innerHeight, now: performance.now(),
}; })()`;
const manifest = JSON.parse(readFileSync(join(dist, "hero/manifest.json"), "utf8"));
const N = manifest.frameCount;
const FPS = manifest.fps;
// The opening and static image: the photoreal dusk poster (scripts/enhance-renders.mjs), not a video frame
const POSTER_PATH = "/hero/poster/";
const playing = `(() => { const v = document.querySelector('[data-hero-video]'); return !v.paused && v.currentTime > 0; })()`;
const click = (sel, i = 0) => `document.querySelectorAll('${sel}')[${i}].click()`;

const results = [];
function record(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${check}${detail ? `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
}

/** Open the home page on a device and wait until the build video is playing */
async function playingPage(name, path = "/") {
  const page = await openPage();
  await device(page, name);
  await page.goto(path);
  const ok = await page.waitFor(playing, 20000);
  if (!ok) throw new Error(`${name}: the hero video never started`);
  return page;
}

/** Pause with the toggle (the visitor's pause) and seek; resolves once the overlays have updated */
async function pauseAt(page, frame) {
  if (!(await page.eval(`document.querySelector('[data-hero-video]').paused`))) await page.eval(click("[data-hero-toggle]"));
  await page.eval(`new Promise((r) => { const v = document.querySelector('[data-hero-video]');
    v.addEventListener('seeked', () => requestAnimationFrame(() => r()), { once: true }); v.currentTime = ${(frame + 0.25) / FPS}; })`);
}

// ---------- checks ----------
async function opening() {
  for (const name of ["desktop", "phone"]) {
    const page = await openPage();
    await device(page, name);
    await page.goto("/");
    // first view: the video's first frame (the blueprint) with the headline and the Design phase; the dusk poster hidden
    const s = await page.eval(STATE);
    const look = await page.eval(`(() => { const s = document.querySelector('[data-hero-stage]');
      return { bg: getComputedStyle(s.querySelector('[data-hero-video]')).backgroundImage, poster: +getComputedStyle(s.querySelector('.hero__poster')).opacity }; })()`);
    await page.shot(`opening-${name}.png`);
    const o = name === "phone" ? "portrait" : "landscape";
    record(`opening ${name} opens on the video's first frame`, s.video === 1 && look.bg.includes(`/hero/first/${o}.webp`) && look.poster === 0 && s.label.length === 1 && s.label[0].startsWith("01"), {
      phase: s.phase, videoOpacity: s.video, background: look.bg.replace(origin, ""), posterOpacity: look.poster, label: s.label,
    });
    // the build starts straight away (no hold)
    await page.waitFor(`document.querySelector('[data-hero-stage]').dataset.phase !== 'intro'`, 10000);
    const startedAt = (await page.eval(STATE)).now;
    await sleep(800);
    const b = await page.eval(STATE);
    await page.shot(`opening-${name}-playing.png`);
    record(`opening ${name} plays at once`, startedAt < 3000 && b.video === 1 && !b.paused && b.toggle === "pause", {
      startedAtMs: Math.round(startedAt), phase: b.phase, videoOpacity: b.video, paused: b.paused, toggle: b.toggle, src: b.src.replace(origin, ""),
    });
    const header = await page.eval(`parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 0`);
    record(`opening ${name} hero is one screen`, b.height <= b.inner && b.height >= b.inner - header - 120, { height: b.height, screen: b.inner });
    await page.close();
  }
}

async function phases() {
  for (const name of ["desktop", "phone"]) {
    const page = await playingPage(name);
    for (const [i, p] of manifest.phases.entries()) {
      const mid = Math.round((p.start + p.end) / 2);
      await pauseAt(page, mid);
      // overlay transition (300 ms) finished: exactly one phase fully shown
      await page.waitFor(`[...document.querySelectorAll('.hero__phase')].filter((li) => getComputedStyle(li).opacity === '1').length === 1`, 3000);
      await sleep(450); // title transition (400 ms)
      const s = await page.eval(STATE);
      await page.shot(`phase-${name}-${i}.png`);
      // the headline stays on screen, scaled to half (0.8 on short landscape screens)
      const scale = parseFloat(/^matrix\(([\d.]+)/.exec(s.title)?.[1] ?? "1");
      const fill = await page.eval(`+(/scaleY\\(([\\d.]+)/.exec(document.querySelector('[data-hero-fill]').style.transform)?.[1] ?? -1)`);
      const ok = s.phase === String(i) && s.label.length === 1 && s.label[0].startsWith(String(i + 1).padStart(2, "0")) && scale < 0.85 && Math.abs(fill - mid / (N - 1)) < 0.01;
      record(`phases ${name} ${p.id}`, ok, { frame: Math.round(s.time * FPS), phase: s.phase, label: s.label, scale, fill });
    }
    await page.close();
  }
}

async function jump() {
  for (const name of ["desktop", "phone"]) {
    const page = await playingPage(name);
    for (const [i, p] of manifest.phases.entries()) {
      await page.eval(click("[data-hero-jump]", i));
      const landed = await page.waitFor(`document.querySelector('[data-hero-stage]').dataset.phase === '${i}'`, 3000);
      const s = await page.eval(STATE);
      const frame = Math.round(s.time * FPS);
      const current = await page.eval(`document.querySelectorAll('[data-hero-jump]')[${i}].getAttribute('aria-current')`);
      // it plays on from the start of the phase, so allow for the frames since the click
      record(`jump ${name} ${p.id}`, landed && current === "step" && frame >= p.start - 1 && frame <= p.start + 12, { phase: s.phase, frame, expected: p.start, current });
    }
    await page.close();
  }
}

async function end() {
  for (const name of ["desktop", "phone"]) {
    const page = await playingPage(name);
    const ended = await page.waitFor(`document.querySelector('[data-hero-stage]').hasAttribute('data-ended')`, 15000);
    await sleep(800); // the video fades back out to the poster (600 ms)
    const s = await page.eval(STATE);
    await page.shot(`end-${name}.png`);
    const ctaOk = name === "phone" || s.cta;
    record(`end ${name} closes on the poster with the actions`, ended && s.phase === "5" && s.video === 0 && s.label[0]?.startsWith("06") && ctaOk && s.toggle === "replay", {
      phase: s.phase, videoOpacity: s.video, label: s.label, cta: s.cta, toggle: s.toggle, toggleText: s.toggleText,
    });
    await page.eval(click("[data-hero-toggle]"));
    await page.waitFor(playing, 3000);
    await sleep(700);
    const r = await page.eval(STATE);
    record(`end ${name} replay restarts the build`, !r.ended && !r.paused && r.time < 1.5 && r.video === 1 && r.toggle === "pause", {
      time: r.time, phase: r.phase, videoOpacity: r.video, toggle: r.toggle,
    });
    await page.close();
  }
}

async function control() {
  const page = await playingPage("desktop");
  await page.eval(click("[data-hero-toggle]"));
  await sleep(100);
  const a = await page.eval(STATE);
  await sleep(700);
  const b = await page.eval(STATE);
  record("control pause stops the build", a.paused && b.paused && a.time === b.time && b.toggle === "play" && b.toggleText.toLowerCase() === "play", {
    before: a.time, after: b.time, toggle: b.toggle, text: b.toggleText,
  });
  // stays paused across an off-screen round trip (the visitor's pause wins)
  await page.eval(`scrollTo(0, document.querySelector('[data-hero]').offsetHeight + 400)`);
  await sleep(300);
  await page.eval("scrollTo(0, 0)");
  await sleep(500);
  const c = await page.eval(STATE);
  record("control visitor pause survives scrolling away and back", c.paused && c.time === b.time, { time: c.time, paused: c.paused });
  await page.eval(click("[data-hero-toggle]"));
  await page.waitFor(playing, 3000);
  await sleep(300);
  const d = await page.eval(STATE);
  record("control play resumes", !d.paused && d.time > b.time && d.toggle === "pause", { time: d.time, toggle: d.toggle });
  await page.close();
}

async function offscreen() {
  const page = await playingPage("desktop");
  await page.eval(`scrollTo(0, document.querySelector('[data-hero]').offsetHeight + 400)`);
  await sleep(400);
  const a = await page.eval(STATE);
  await sleep(600);
  const b = await page.eval(STATE);
  record("offscreen pauses the video", a.paused && b.paused && a.time === b.time, { before: a.time, after: b.time });
  await page.eval("scrollTo(0, 0)");
  const resumed = await page.waitFor(playing + " && document.querySelector('[data-hero-video]').currentTime > " + b.time, 3000);
  record("offscreen resumes when back", resumed);
  await page.close();
}

async function staticMode() {
  const cases = [
    { name: "reduced-motion", setup: (p) => p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }) },
    {
      name: "save-data",
      setup: (p) => p.send("Page.addScriptToEvaluateOnNewDocument", {
        source: "Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, addEventListener() {} }) });",
      }),
    },
    {
      name: "3g",
      setup: (p) => p.send("Page.addScriptToEvaluateOnNewDocument", {
        source: "Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: false, effectiveType: '3g', addEventListener() {} }) });",
      }),
    },
    { name: "no-js", setup: (p) => p.send("Emulation.setScriptExecutionDisabled", { value: true }) },
  ];
  for (const c of cases) {
    for (const name of ["desktop", "phone"]) {
      const page = await openPage();
      await device(page, name);
      await c.setup(page);
      const images = [];
      const videos = [];
      page.on((m) => {
        if (m.method !== "Network.requestWillBeSent") return;
        const url = m.params.request.url;
        if (/\/hero\/.*\.(avif|webp)/.test(url)) images.push(url);
        if (/\/hero\/.*\.mp4/.test(url)) videos.push(url);
      });
      await page.goto("/");
      await sleep(3000);
      const s = await page.eval(`(() => { const root = document.querySelector('[data-hero]'), img = root.querySelector('img');
        // the fixed mobile Call/WhatsApp bar covers the bottom of the screen: content counts as visible above it
        const bar = document.querySelector('.action-bar');
        const limit = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight;
        const shown = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0; };
        const vis = (el) => shown(el) && el.getBoundingClientRect().bottom <= limit + 0.5;
        const onScreen = (el) => shown(el) && el.getBoundingClientRect().bottom <= innerHeight + 0.5;
        return { motion: document.documentElement.classList.contains('hero-motion'), height: root.offsetHeight, inner: innerHeight,
          bottom: Math.round(root.getBoundingClientRect().bottom), limit: Math.round(limit),
          img: img.currentSrc, phases: [...root.querySelectorAll('.hero__phase')].filter(vis).length,
          toggle: shown(root.querySelector('[data-hero-toggle]')),
          actions: [...document.querySelectorAll('[data-action]')].filter(onScreen).map((a) => a.dataset.action) }; })()`);
      await page.shot(`static-${c.name}-${name}.png`);
      const dusk = s.img.includes(POSTER_PATH);
      const oneScreen = s.bottom <= s.limit + 1; // the hero ends within the first screen, above the action bar
      const actions = s.actions.includes("call") && s.actions.includes("whatsapp");
      record(`static ${c.name} ${name}`, !s.motion && images.length === 1 && videos.length === 0 && dusk && oneScreen && s.phases === 6 && actions && !s.toggle, {
        heroBottom: s.bottom, visibleTo: s.limit, image: s.img.replace(origin, ""), posterRequests: images.length, videoRequests: videos.length,
        phasesVisible: s.phases, toggle: s.toggle, actions: [...new Set(s.actions)],
      });
      await page.close();
    }
  }
}

async function rotate() {
  const page = await playingPage("phone");
  await pauseAt(page, Math.round(N * 0.6));
  const before = await page.eval(STATE);

  // Address bar hides: the viewport grows taller, orientation unchanged
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone, height: 760 });
  await sleep(300);
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone });
  await sleep(500);
  const bar = await page.eval(STATE);
  record("rotate address-bar resize keeps the source", bar.src === before.src && bar.time === before.time, {
    before: before.src.replace(origin, ""), after: bar.src.replace(origin, ""),
  });

  // Rotate to landscape
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone, width: 844, height: 390, screenOrientation: { type: "landscapePrimary", angle: 90 } });
  await page.waitFor(`(() => { const v = document.querySelector('[data-hero-video]'); return /landscape/.test(v.currentSrc) && v.readyState >= 2 && Math.abs(v.currentTime - ${before.time}) < 0.05; })()`, 10000);
  await sleep(300);
  const after = await page.eval(STATE);
  await page.shot("rotate-landscape.png");
  record("rotate switches source at the same time", /portrait/.test(before.src) && /landscape/.test(after.src) && Math.abs(after.time - before.time) < 0.05 && after.phase === before.phase, {
    before: { src: before.src.replace(origin, ""), time: before.time, phase: before.phase },
    after: { src: after.src.replace(origin, ""), time: after.time, phase: after.phase },
  });
  await page.close();
}

async function skip() {
  const page = await openPage();
  await device(page, "desktop");
  await page.goto("/");
  const first = await page.eval(`(() => { const f = document.querySelector('[data-hero]').querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    return f && f.classList.contains('hero__skip') && f.textContent.trim(); })()`);
  // Tab from the last element before the hero lands on the skip link
  await page.eval(`(() => { const all = [...document.querySelectorAll('a[href],button')];
    const skip = document.querySelector('.hero__skip'); all[all.indexOf(skip) - 1].focus(); })()`);
  const key = (type, extra) => page.send("Input.dispatchKeyEvent", { type, ...extra });
  await key("keyDown", { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await key("keyUp", { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const focused = await page.eval("document.activeElement.className");
  const shown = await page.eval(`(() => { const r = document.querySelector('.hero__skip').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`);
  await page.shot("skip-focused.png");
  await key("keyDown", { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await key("keyUp", { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(300);
  const after = await page.eval(`({ id: document.activeElement.id, top: Math.round(document.getElementById('after-hero').getBoundingClientRect().top), pad: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) })`);
  record("skip is first focusable", first === "Skip past the build", first);
  record("skip reached by Tab and shown on focus", /hero__skip/.test(focused) && shown, { focused, shown });
  record("skip moves focus to #after-hero", after.id === "after-hero" && Math.abs(after.top - after.pad) < 24, after); // lands just below the sticky header
  await page.close();
}

async function fallback() {
  // A browser without AV1 takes the H.264 file
  const page = await openPage();
  await device(page, "desktop");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: "const cpt = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /av01/.test(t) ? '' : cpt.call(this, t); };",
  });
  await page.goto("/");
  const ok = await page.waitFor(playing, 20000);
  const s = await page.eval(STATE);
  record("fallback plays H.264 without AV1", ok && /landscape\.h264\.mp4$/.test(s.src), { src: s.src.replace(origin, ""), playing: ok });
  await page.close();
}

const run = { opening, phases, jump, end, control, offscreen, fallback, static: staticMode, rotate, skip };
try {
  for (const c of checks) await run[c]();
} finally {
  proc.kill();
  server.close();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}
writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed; screenshots and results.json in ${out}`);
process.exit(failed.length ? 1 : 0);
