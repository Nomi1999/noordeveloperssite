// Usage: node brand/scripts/shot.mjs <html> <png> <width> <height>
// Screenshots a local HTML file with headless Chrome.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [html, png, w = "1000", h = "1000"] = process.argv.slice(2);
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean).find((p) => existsSync(p));
if (!chrome) throw new Error("Chrome not found; set CHROME_PATH");
execFileSync(chrome, [
  "--headless", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", `--window-size=${w},${h}`, "--virtual-time-budget=3000",
  `--screenshot=${resolve(png)}`, pathToFileURL(resolve(html)).href,
], { stdio: "ignore" });
console.log(`Wrote ${png}`);
