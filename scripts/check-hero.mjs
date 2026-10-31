// Headless Chrome checks for the scroll-build hero, against the built site (npm run build first).
//
//   node scripts/check-hero.mjs [phases] [memory] [offscreen] [loading] [static] [skip] [--out render/out/hero-check]
//
//   phases     scroll to each phase's middle frame (landscape desktop and portrait phone), screenshot,
//              and check the drawn frame, data-phase and the visible phase label
//   memory     five full scrubs down and up (desktop and phone): decoded frames never exceed the window
//   offscreen  no requestAnimationFrame ticks while the hero is scrolled out of view
//   loading    throttled to Slow 4G: the first frame requests run sparse to dense, and the stage
//              always shows the poster or a drawn frame
//   static     reduced motion, Save-Data and JavaScript off: one screen tall, phase list and actions
//              visible, no sequence frame requests (reduced motion shows the dusk frame)
//   rotate     phone rotated portrait → landscape switches sequence at the same frame; an address-bar
//              height change (orientation unchanged) reloads nothing
//   skip       "Skip the animation" is the hero's first focusable element and moves focus to #after-hero
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
const ALL = ["phases", "memory", "offscreen", "loading", "static", "rotate", "skip"];
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
};
const server = createServer((req, res) => {
  let path = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
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
const HERO = `(() => {
  const root = document.querySelector('[data-hero]'), stage = root.querySelector('[data-hero-stage]');
  const top = root.getBoundingClientRect().top + scrollY, span = root.offsetHeight - stage.clientHeight;
  return { top, span, height: root.offsetHeight, stage: stage.clientHeight, inner: innerHeight };
})()`;
const scrollToFrame = (frame, count) =>
  `(() => { const h = ${HERO}; scrollTo(0, Math.round(h.top + h.span * ${frame} / ${count - 1})); return scrollY; })()`;
const STATE = `(() => { const s = document.querySelector('[data-hero-stage]'); return {
  frame: +s.dataset.frame, decoded: +s.dataset.decoded, phase: +s.dataset.phase, ready: s.hasAttribute('data-ready'),
  debug: document.querySelector('pre')?.textContent ?? '',
  label: [...s.querySelectorAll('.hero__phase')].filter((li) => +getComputedStyle(li).opacity > 0.5)
    .map((li) => li.querySelector('.hero__phase-label').textContent.replace(/\\s+/g, ' ').trim()),
  cta: getComputedStyle(s.querySelector('.hero__cta')).visibility === 'visible' && getComputedStyle(s.querySelector('.hero__cta')).display !== 'none',
}; })()`;
const manifest = JSON.parse(readFileSync(join(dist, "hero/manifest.json"), "utf8"));
const N = manifest.frameCount;

const results = [];
function record(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${check}${detail ? `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
}

async function loadAll(page, timeout = 60000) {
  return page.waitFor(`/loaded (\\d+)\\/\\1/.test(document.querySelector('pre')?.textContent ?? '')`, timeout);
}

// ---------- checks ----------
async function phases() {
  for (const name of ["desktop", "phone"]) {
    const page = await openPage();
    await device(page, name);
    await page.goto("/?hero-debug");
    await page.eval("scrollTo(0, 1)"); // wakes the debug overlay
    await loadAll(page);
    for (const [i, p] of manifest.phases.entries()) {
      const mid = Math.round((p.start + p.end) / 2);
      await page.eval(scrollToFrame(mid, N));
      await page.waitFor(`+document.querySelector('[data-hero-stage]').dataset.frame === ${mid}`, 5000);
      // overlay transition (300 ms) finished: exactly one phase fully shown
      await page.waitFor(`[...document.querySelectorAll('.hero__phase')].filter((li) => getComputedStyle(li).opacity === '1').length === 1`, 3000);
      const s = await page.eval(STATE);
      const drawn = +/drawn (\d+)/.exec(s.debug)?.[1];
      await page.shot(`phase-${name}-${i}.png`);
      const ok = s.frame === mid && drawn === mid && s.phase === i && s.label.length === 1 && s.label[0].startsWith(`0${i}`);
      record(`phases ${name} ${p.id}`, ok, { frame: s.frame, drawn, phase: s.phase, label: s.label, cta: s.cta });
      if (i === manifest.phases.length - 1 && name === "desktop") record(`phases ${name} CTA on move in`, s.cta);
    }
    // halfway down the hero's scroll span: progress 0.5, so frame (N-1)/2 (95.5 → 95 or 96 for 192)
    const half = (N - 1) / 2;
    await page.eval(`(() => { const h = ${HERO}; scrollTo(0, Math.round(h.top + h.span / 2)); })()`);
    await page.waitFor(`Math.abs(+document.querySelector('[data-hero-stage]').dataset.frame - ${half}) <= 1`, 5000).catch(() => {});
    await sleep(300);
    const m = await page.eval(STATE);
    record(`phases ${name} mid-section frame`, Math.abs(m.frame - half) <= 1, { frame: m.frame, expected: half });
    await page.eval(scrollToFrame(N - 1, N));
    await page.waitFor(`+document.querySelector('[data-hero-stage]').dataset.frame === ${N - 1}`, 5000);
    await sleep(450);
    await page.shot(`phase-${name}-final.png`);
    await page.close();
  }
}

async function memory() {
  for (const name of ["desktop", "phone"]) {
    const page = await openPage();
    await device(page, name);
    await page.goto("/?hero-debug");
    await page.eval("scrollTo(0, 1)");
    await loadAll(page);
    let max = 0;
    for (let k = 0; k < 5; k++) {
      for (const dir of [1, -1]) {
        for (let s = 0; s <= 48; s++) {
          const f = dir > 0 ? (s / 48) * (N - 1) : (1 - s / 48) * (N - 1);
          await page.eval(scrollToFrame(f, N));
          await sleep(30);
          max = Math.max(max, (await page.eval(STATE)).decoded || 0);
        }
      }
    }
    const debug = (await page.eval(STATE)).debug;
    const limit = +/limit (\d+)/.exec(debug)[1];
    const tracked = +/max (\d+)/.exec(debug)[1];
    record(`memory ${name} five scrubs`, Math.max(max, tracked) <= limit, { sampledMax: max, trackedMax: tracked, limit });
    await page.close();
  }
}

async function offscreen() {
  const page = await openPage();
  await device(page, "desktop");
  await page.goto("/?hero-debug");
  await page.eval("scrollTo(0, 1)");
  await loadAll(page);
  await page.eval(`(() => { const h = ${HERO}; scrollTo(0, h.top + h.height + 50); })()`);
  await sleep(800);
  const ticks = () => page.eval(`+/rAF ticks (\\d+)/.exec(document.querySelector('pre').textContent)[1]`);
  const a = await ticks();
  await page.eval("scrollBy(0, 40)");
  await sleep(300);
  await page.eval("scrollBy(0, 40)");
  await sleep(1000);
  const b = await ticks();
  const offState = await page.eval(`document.querySelector('pre').textContent.includes('off-screen')`);
  record("offscreen no rAF", a === b && offState, { before: a, after: b });
  await page.close();
}

async function loading() {
  const page = await openPage();
  await device(page, "desktop");
  const frames = [];
  page.on((m) => {
    if (m.method === "Network.requestWillBeSent") {
      const r = /\/hero\/(landscape|portrait)\/\d+\/(\d{4})\.(avif|webp)/.exec(m.params.request.url);
      if (r) frames.push(+r[2]);
    }
  });
  // DevTools "Slow 4G": 400 ms RTT (×~3.75 internal), ~0.4 Mbit/s
  await page.send("Network.emulateNetworkConditions", {
    offline: false, latency: 562.5, downloadThroughput: (400 * 1024) / 8 * 0.9, uploadThroughput: (400 * 1024) / 8 * 0.9,
  });
  await page.goto("/?hero-debug");
  let blank = 0;
  for (let t = 0; t < 40; t++) {
    const shown = await page.eval(`(() => { const s = document.querySelector('[data-hero-stage]'), img = s.querySelector('img');
      return s.hasAttribute('data-ready') || (img.complete && img.naturalWidth > 0); })()`);
    if (!shown) blank++;
    if (t === 10) await page.eval(scrollToFrame(Math.round(N / 2), N));
    await sleep(250);
  }
  await page.shot("loading-slow4g.png");
  // Each request's pass: the largest stride (32 … 1) dividing its frame; the last frame is in the first pass.
  // Requests must never go back to a sparser pass (retries of failed frames aside, which this run has none of).
  const STRIDES = [32, 16, 8, 4, 2, 1];
  const level = (f) => (f === N - 1 ? 0 : STRIDES.findIndex((s) => f % s === 0));
  const posterReq = frames[0];
  const seq = frames.slice(1);
  const levels = seq.map(level);
  const firstPass = levels.every((l, i) => i === 0 || l >= levels[i - 1]);
  record("loading never blank (after poster)", blank <= 1, { blankSamples: blank, note: "the first sample may precede the poster" });
  record("loading sparse first", firstPass, { poster: posterReq, firstRequests: seq.slice(0, 12), passes: [...new Set(levels)].map((l) => STRIDES[l]), total: frames.length });
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
    { name: "no-js", setup: (p) => p.send("Emulation.setScriptExecutionDisabled", { value: true }) },
  ];
  for (const c of cases) {
    for (const name of ["desktop", "phone"]) {
      const page = await openPage();
      await device(page, name);
      await c.setup(page);
      const frames = [];
      page.on((m) => {
        if (m.method === "Network.requestWillBeSent" && /\/hero\/.*\.(avif|webp)/.test(m.params.request.url)) frames.push(m.params.request.url);
      });
      await page.goto("/");
      await sleep(1500);
      const s = await page.eval(`(() => { const root = document.querySelector('[data-hero]'), img = root.querySelector('img');
        // the fixed mobile Call/WhatsApp bar covers the bottom of the screen: content counts as visible above it
        const bar = document.querySelector('.action-bar');
        const limit = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight;
        const shown = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0; };
        const vis = (el) => shown(el) && el.getBoundingClientRect().bottom <= limit + 0.5;
        const onScreen = (el) => shown(el) && el.getBoundingClientRect().bottom <= innerHeight + 0.5;
        return { scrub: document.documentElement.classList.contains('hero-scrub'), height: root.offsetHeight, inner: innerHeight,
          bottom: Math.round(root.getBoundingClientRect().bottom), limit: Math.round(limit),
          img: img.currentSrc, phases: [...root.querySelectorAll('.hero__phase')].filter(vis).length,
          actions: [...document.querySelectorAll('[data-action]')].filter(onScreen).map((a) => a.dataset.action) }; })()`);
      await page.shot(`static-${c.name}-${name}.png`);
      const posterOnly = frames.length === 1;
      const dusk = c.name !== "reduced-motion" || s.img.includes(`/${String(N - 1).padStart(4, "0")}.`);
      const oneScreen = s.bottom <= s.limit + 1; // the hero ends within the first screen, above the action bar
      const actions = s.actions.includes("call") && s.actions.includes("whatsapp");
      record(`static ${c.name} ${name}`, !s.scrub && posterOnly && dusk && oneScreen && s.phases === 6 && actions, {
        heroBottom: s.bottom, visibleTo: s.limit, image: s.img.replace(origin, ""), heroImageRequests: frames.length,
        phasesVisible: s.phases, actions: [...new Set(s.actions)],
      });
      await page.close();
    }
  }
}

async function rotate() {
  const page = await openPage();
  await device(page, "phone");
  const urls = [];
  page.on((m) => {
    if (m.method === "Network.requestWillBeSent" && /\/hero\/(landscape|portrait)\/\d+\/\d{4}\./.test(m.params.request.url)) urls.push(m.params.request.url);
  });
  await page.goto("/?hero-debug");
  await page.eval("scrollTo(0, 1)");
  await loadAll(page);
  const mid = Math.round(N * 0.6);
  await page.eval(scrollToFrame(mid, N));
  await page.waitFor(`+document.querySelector('[data-hero-stage]').dataset.frame === ${mid}`, 5000);
  const info = () => page.eval(`(() => { const t = document.querySelector('pre').textContent;
    return { o: /\\n(landscape|portrait) /.exec(t)[1], loaded: +/loaded (\\d+)/.exec(t)[1], frame: +/frame (\\d+)/.exec(t)[1] }; })()`);
  const before = await info();

  // Address bar hides: the viewport grows taller, orientation unchanged
  const n0 = urls.length;
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone, height: 760 });
  await sleep(300);
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone });
  await sleep(800);
  const bar = await info();
  record("rotate address-bar resize reloads nothing", bar.o === before.o && bar.loaded === before.loaded && urls.length === n0, {
    before, after: bar, newRequests: urls.length - n0,
  });

  // Rotate to landscape
  const progress = await page.eval(`(() => { const h = ${HERO}; return (scrollY - h.top) / h.span; })()`);
  await page.send("Emulation.setDeviceMetricsOverride", { ...DEVICES.phone, width: 844, height: 390, screenOrientation: { type: "landscapePrimary", angle: 90 } });
  // keep the same progress through the (now differently sized) section, as the browser's scroll anchoring roughly does
  await sleep(300);
  await page.eval(`(() => { const h = ${HERO}; scrollTo(0, Math.round(h.top + h.span * ${progress})); })()`);
  await page.waitFor(`/drawn ${mid}/.test(document.querySelector('pre').textContent) && /\\nlandscape /.test(document.querySelector('pre').textContent)`, 20000);
  const after = await info();
  await page.shot("rotate-landscape.png");
  const sawLandscape = urls.slice(n0).some((u) => u.includes("/landscape/"));
  record("rotate switches sequence at the same frame", after.o === "landscape" && Math.abs(after.frame - mid) <= 1 && (before.o === "landscape" || sawLandscape), {
    before, after, landscapeRequests: urls.slice(n0).filter((u) => u.includes("/landscape/")).length,
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
  await page.shot("skip-focused.png");
  await key("keyDown", { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await key("keyUp", { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(300);
  const after = await page.eval(`({ id: document.activeElement.id, top: Math.round(document.getElementById('after-hero').getBoundingClientRect().top) })`);
  record("skip is first focusable", first === "Skip the animation", first);
  record("skip reached by Tab", /hero__skip/.test(focused), focused);
  record("skip moves focus to #after-hero", after.id === "after-hero" && Math.abs(after.top) < 40, after);
  await page.close();
}

const run = { phases, memory, offscreen, loading, static: staticMode, rotate, skip };
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
