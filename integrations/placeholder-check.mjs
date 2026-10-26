// @ts-check
import { readFile } from "node:fs/promises";

const MARKER = "PLACEHOLDER(client)";

/**
 * Lists the fields in a config source that still carry the placeholder marker.
 * Field paths are tracked through nested object/array literals, so a marker on
 * `lat: 31.45, // PLACEHOLDER(client)` inside `geo` is reported as `geo.lat`,
 * and a marker on a comment-only line names the enclosing field.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function findPlaceholders(source) {
  /** @type {(string | null)[]} */
  const stack = [];
  /** @type {string[]} */
  const found = [];

  for (const line of source.split(/\r?\n/)) {
    const commentAt = line.indexOf("//");
    const code = (commentAt === -1 ? line : line.slice(0, commentAt)).trim();
    const key = code.match(/^(\w+)\s*:/)?.[1] ?? null;

    if (line.includes(MARKER)) {
      const path = [...stack, key].filter(Boolean).join(".");
      if (path && !found.includes(path)) found.push(path);
    }

    if (/[{[]$/.test(code)) {
      stack.push(key);
    } else if (/^[}\]]/.test(code)) {
      stack.pop();
    }
  }

  return found;
}

/**
 * Warns at the end of `astro build` for every contact field still holding a
 * placeholder. A warning, not an error, so the site can be deployed for review.
 *
 * @param {{ file: URL }} options
 * @returns {import("astro").AstroIntegration}
 */
export default function placeholderCheck({ file }) {
  return {
    name: "placeholder-check",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        const fields = findPlaceholders(await readFile(file, "utf8"));
        if (fields.length === 0) return;
        logger.warn(
          `${fields.length} contact field(s) in src/config/site.ts still hold placeholder values: ${fields.join(", ")}`,
        );
      },
    },
  };
}
