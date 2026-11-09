// @ts-check
/**
 * Content audit: fails the build if any built page contains banned content
 * (prices, sale status, regulatory terms, real project names, trust signals,
 * unprovable superlatives). The banned list lives in src/content/content-rules.json.
 *
 * Usage: node scripts/audit-content.mjs [distDir] [--rules <file>]
 * Runs after `astro build` as part of `npm run build`.
 *
 * Checked text per page: visible text (not script or style), the alt, title,
 * aria-label and placeholder attributes, the description and share tags, and
 * the prefilled message of every WhatsApp link.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_RULES = fileURLToPath(new URL("../src/content/content-rules.json", import.meta.url));

/**
 * @typedef {{ description?: string, phrases?: string[], caseSensitive?: string[], patterns?: string[] }} Category
 * @typedef {{ categories: Record<string, Category>, allow?: { phrase: string, reason?: string }[] }} Rules
 * @typedef {{ category: string, rule: string, regex: RegExp }} Matcher
 * @typedef {{ source: string, text: string }} Segment
 * @typedef {{ page: string, category: string, match: string, source: string, context: string }} Violation
 */

/** @param {string} file @returns {Rules} */
export function loadRules(file = DEFAULT_RULES) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const escape = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole-word match: no letter or digit directly before or after
const BEFORE = "(?<![\\p{L}\\p{N}])";
const AFTER = "(?![\\p{L}\\p{N}])";
const phraseSource = (/** @type {string} */ phrase) => BEFORE + escape(phrase.trim()).replace(/\s+/g, "\\s+") + AFTER;

/** @param {Rules} rules @returns {{ matchers: Matcher[], allow: RegExp[] }} */
export function compileRules(rules) {
  /** @type {Matcher[]} */
  const matchers = [];
  for (const [category, { phrases = [], caseSensitive = [], patterns = [] }] of Object.entries(rules.categories)) {
    for (const p of phrases) matchers.push({ category, rule: p, regex: new RegExp(phraseSource(p), "giu") });
    for (const p of caseSensitive) matchers.push({ category, rule: p, regex: new RegExp(phraseSource(p), "gu") });
    for (const p of patterns) matchers.push({ category, rule: p, regex: new RegExp(p, "giu") });
  }
  const allow = (rules.allow ?? []).map(({ phrase }) => new RegExp(phraseSource(phrase), "giu"));
  return { matchers, allow };
}

/** @type {Record<string, string>} */
const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  times: "×",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
  copy: "©",
};

/** @param {string} s */
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
    if (ref[0] === "#") {
      const code = ref[1].toLowerCase() === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

const collapse = (/** @type {string} */ s) => s.replace(/\s+/g, " ").trim();

/** @param {string} tag @returns {Record<string, string>} */
function attributes(tag) {
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const m of tag.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

// A tag, with quoted attribute values that may contain ">"
const TAG = /<([a-z][a-z0-9-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const ANY_TAG = /<\/?[a-z!][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;

const TEXT_ATTRIBUTES = ["alt", "title", "aria-label", "placeholder"];
const META_NAMES = /^(description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)$/i;

/**
 * Splits a page into the text a visitor can read or hear.
 * @param {string} html
 * @returns {Segment[]}
 */
export function extractText(html) {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ");

  /** @type {Segment[]} */
  const segments = [];
  for (const [tag, name] of cleaned.matchAll(TAG)) {
    const attrs = attributes(tag);
    for (const a of TEXT_ATTRIBUTES) if (attrs[a]?.trim()) segments.push({ source: `${a} attribute`, text: collapse(attrs[a]) });
    if (name.toLowerCase() === "meta") {
      const key = attrs.name ?? attrs.property ?? "";
      if (META_NAMES.test(key) && attrs.content) segments.push({ source: `meta ${key}`, text: collapse(attrs.content) });
    }
    if (name.toLowerCase() === "a" && attrs.href?.startsWith("https://wa.me/")) {
      const message = new URL(attrs.href).searchParams.get("text");
      if (message) segments.push({ source: "WhatsApp message", text: collapse(message) });
    }
  }

  const body = collapse(decodeEntities(cleaned.replace(ANY_TAG, " ")));
  if (body) segments.unshift({ source: "page text", text: body });
  return segments;
}

/**
 * @param {Segment[]} segments
 * @param {ReturnType<typeof compileRules>} compiled
 * @param {string} page
 * @returns {Violation[]}
 */
export function findViolations(segments, { matchers, allow }, page) {
  /** @type {Violation[]} */
  const found = [];
  for (const { source, text: raw } of segments) {
    // Blank out allowed phrases (same length, so reported positions still line up)
    const text = allow.reduce((t, re) => t.replace(re, (m) => " ".repeat(m.length)), raw);
    for (const { category, regex } of matchers) {
      for (const m of text.matchAll(regex)) {
        const start = Math.max(0, m.index - 40);
        const end = Math.min(raw.length, m.index + m[0].length + 40);
        const context = `${start > 0 ? "…" : ""}${raw.slice(start, end)}${end < raw.length ? "…" : ""}`;
        found.push({ page, category, match: m[0], source, context });
      }
    }
  }
  return found;
}

/** "about/index.html" → "/about/" */
function routeOf(/** @type {string} */ file) {
  const path = "/" + file.split(sep).join("/");
  return path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
}

/**
 * @param {string} dir
 * @param {Rules} rules
 * @returns {{ pages: number, violations: Violation[] }}
 */
export function auditDir(dir, rules = loadRules()) {
  const compiled = compileRules(rules);
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .sort();
  const violations = files.flatMap((file) =>
    findViolations(extractText(readFileSync(join(dir, file), "utf8")), compiled, routeOf(relative(dir, join(dir, file)))),
  );
  return { pages: files.length, violations };
}

/**
 * Scripts and stylesheets a page loads from another host (a CDN, an analytics tag). The site is self-contained, so
 * there are none; the walkthrough viewer is vendored under /vendor/.
 * @param {string} html
 * @returns {string[]}
 */
export function externalResources(html) {
  /** @type {string[]} */
  const found = [];
  for (const [tag, name] of html.replace(/<!--[\s\S]*?-->/g, " ").matchAll(TAG)) {
    const attrs = attributes(tag);
    const n = name.toLowerCase();
    if (n === "script" && /^(https?:)?\/\//i.test(attrs.src ?? "")) found.push(attrs.src);
    if (n === "link" && /stylesheet|preload|modulepreload/i.test(attrs.rel ?? "") && /^(https?:)?\/\//i.test(attrs.href ?? "")) found.push(attrs.href);
  }
  return found;
}

/** @param {Violation[]} violations */
export function formatViolations(violations) {
  return violations
    .map((v) => `  ${v.page}  [${v.category}] "${v.match}" (${v.source})\n      ${v.context}`)
    .join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const rulesAt = args.indexOf("--rules");
  const rulesFile = rulesAt >= 0 ? resolve(args[rulesAt + 1]) : DEFAULT_RULES;
  const dir = resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--rules") ?? "dist");

  const { pages, violations } = auditDir(dir, loadRules(rulesFile));
  if (pages === 0) {
    console.error(`Content audit: no HTML pages found in ${dir}. Run astro build first.`);
    process.exit(1);
  }
  const external = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .flatMap((f) => externalResources(readFileSync(join(dir, f), "utf8")).map((url) => `${routeOf(f)} loads ${url}`));
  if (external.length) {
    console.error(`Content audit failed: pages load scripts or styles from other hosts\n\n  ${external.join("\n  ")}`);
    process.exit(1);
  }
  if (violations.length) {
    console.error(`Content audit failed: ${violations.length} banned phrase(s) in ${new Set(violations.map((v) => v.page)).size} page(s)\n`);
    console.error(formatViolations(violations));
    console.error(`\nRemove the phrase, or if it is genuinely fine, add it to "allow" in ${relative(process.cwd(), rulesFile)} with a reason.`);
    process.exit(1);
  }
  console.log(`Content audit passed: ${pages} page(s) checked`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
