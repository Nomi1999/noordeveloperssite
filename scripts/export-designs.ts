// Writes the render export: run with `npm run designs:export`.
// render/data/<slug>.json for each design, plus render/data/schema.json.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { designs } from "../src/designs/index.ts";
import { buildExport, exportJsonSchema, serializeExport } from "../src/designs/export.ts";

const dir = new URL("../render/data/", import.meta.url);
mkdirSync(dir, { recursive: true });

const files = new Map<string, string>([["schema.json", exportJsonSchema()]]);
for (const { design, facts } of designs) files.set(`${design.slug}.json`, serializeExport(buildExport(design, facts)));

// Remove exports of designs that no longer exist
for (const name of readdirSync(dir)) {
  if (name.endsWith(".json") && !files.has(name)) rmSync(new URL(name, dir));
}
for (const [name, text] of files) {
  writeFileSync(new URL(name, dir), text);
  console.log(`render/data/${name}  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
}
