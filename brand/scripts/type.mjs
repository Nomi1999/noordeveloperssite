// Text-to-outline helpers built on opentype.js (1000-unit grid, y down).
import opentype from "opentype.js";
import { readFileSync } from "node:fs";

export function loadFont(file) {
  const b = readFileSync(file);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

export function capHeight(font) {
  const g = font.charToGlyph("H");
  const bb = g.getBoundingBox();
  return bb.y2 - bb.y1;
}

// Lays out `text` with cap height `cap` (units), tracking `track` (units between glyphs).
// Returns glyph placements and the ink extents relative to the origin.
export function layout(font, text, cap, track, wordGap) {
  const s = cap / capHeight(font);
  const fs = font.unitsPerEm * s;
  let x = 0;
  const glyphs = [];
  let inkL = Infinity, inkR = -Infinity;
  for (const ch of text) {
    if (ch === " ") { x += wordGap; continue; }
    const g = font.charToGlyph(ch);
    const bb = g.getBoundingBox();
    glyphs.push({ ch, g, x });
    inkL = Math.min(inkL, x + bb.x1 * s);
    inkR = Math.max(inkR, x + bb.x2 * s);
    x += g.advanceWidth * s + track;
  }
  return { glyphs, s, fs, inkL, inkR };
}

// Path data for a laid-out line with its ink-left at `left` and baseline at `baseline`.
export function pathFor(font, lay, left, baseline) {
  const ox = left - lay.inkL;
  return lay.glyphs
    .map(({ g, x }) => commandsToPath(g.getPath(ox + x, baseline, lay.fs).commands))
    .join("");
}

// Natural ink width of a word at cap height `cap` and zero tracking.
export function inkWidth(font, word, cap, track = 0) {
  const l = layout(font, word, cap, track, 0);
  return l.inkR - l.inkL;
}

// Own serializer: opentype.js toPathData can emit NaN for values that are almost integers.
const r2 = (n) => +n.toFixed(2);
function commandsToPath(cmds) {
  return cmds.map((c) => {
    if (c.type === "Z") return "Z";
    if (c.type === "Q") return `Q${r2(c.x1)} ${r2(c.y1)} ${r2(c.x)} ${r2(c.y)}`;
    if (c.type === "C") return `C${r2(c.x1)} ${r2(c.y1)} ${r2(c.x2)} ${r2(c.y2)} ${r2(c.x)} ${r2(c.y)}`;
    return `${c.type}${r2(c.x)} ${r2(c.y)}`;
  }).join("");
}
