// Prints the plan review sheet to review/plans-review.pdf: run `npm run designs:review`
// (builds the site first). Serves dist/ locally so the page's /_astro/ assets resolve.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const root = resolve("dist");
const out = resolve("review/plans-review.pdf");
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));
if (!chrome) throw new Error("Chrome not found; set CHROME_PATH");
if (!existsSync(join(root, "plans-review/index.html"))) throw new Error("dist/plans-review/ is missing; run npm run build");

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let file = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/plans-review/`;

mkdirSync(resolve("review"), { recursive: true });
rmSync(out, { force: true });
try {
  // Chrome runs asynchronously so this process can keep serving its requests
  await new Promise((ok, fail) =>
    execFile(
      chrome,
      ["--headless", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=5000", `--print-to-pdf=${out}`, url],
      (err) => (err ? fail(err) : ok()),
    ),
  );
} finally {
  server.close();
}
if (!existsSync(out)) throw new Error("Chrome did not write the PDF");
console.log(`Wrote review/plans-review.pdf (${(statSync(out).size / 1024).toFixed(0)} KB)`);
