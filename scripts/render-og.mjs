// Renders brand/og/og-default.html to public/og-default.png (1200×630) with headless Chrome.
// Set CHROME_PATH if Chrome is not in a standard location.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
// The template is rendered from a copy with the stacked accent logo inlined (currentColor needs inline SVG)
const templatePath = fileURLToPath(new URL("brand/og/og-default.html", root));
const renderPath = templatePath.replace("og-default.html", ".og-render.html");
const logo = readFileSync(fileURLToPath(new URL("src/assets/brand/logo-stacked-accent.svg", root)), "utf8");
writeFileSync(renderPath, readFileSync(templatePath, "utf8").replace("<!--LOGO-->", logo));
const template = pathToFileURL(renderPath).href;
const output = fileURLToPath(new URL("public/og-default.png", root));

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chrome = candidates.find((path) => existsSync(path));
if (!chrome) throw new Error("Chrome not found; set CHROME_PATH");

execFileSync(chrome, [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  "--allow-file-access-from-files",
  "--force-device-scale-factor=1",
  "--window-size=1200,630",
  "--virtual-time-budget=3000",
  `--screenshot=${output}`,
  template,
]);
console.log(`Wrote ${output}`);
