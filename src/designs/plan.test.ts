import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designs } from "./index.ts";
import { MIN_PX_PER_FOOT, planLevels, renderPlan, type PlanTheme } from "./plan.ts";

const css = (name: string) => readFileSync(new URL(`../styles/${name}`, import.meta.url), "utf8");
const tokensCss = css("tokens.css");
const planCss = css("floor-plan.css");

/** Custom property declarations inside the first block whose selector is exactly `selector` */
function declarations(source: string, selector: string): Record<string, string> {
  const at = source.search(new RegExp(`(^|\\n)${selector.replace(/[.]/g, "\\.")}\\s*\\{`));
  if (at < 0) throw new Error(`No "${selector}" block`);
  const body = source.slice(source.indexOf("{", at) + 1, source.indexOf("}", at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const tokens = declarations(tokensCss, ":root");
const themes: Record<PlanTheme, Record<string, string>> = {
  dark: declarations(planCss, ".fp"),
  light: { ...declarations(planCss, ".fp"), ...declarations(planCss, ".fp--light") },
};

/** The hex value of a theme role, following var() references back to tokens.css */
function resolve(theme: PlanTheme, role: string): string {
  let value = themes[theme][role] ?? tokens[role];
  for (let i = 0; i < 5 && value?.startsWith("var("); i++) {
    const ref = value.slice(4, -1).trim();
    value = themes[theme][ref] ?? tokens[ref];
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${theme} ${role} does not resolve to a token colour`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const rendered = designs.flatMap(({ design, facts }) =>
  planLevels(design).flatMap((level) =>
    (["dark", "light"] as const).map((theme) => ({
      key: `${design.slug} ${level.id} ${theme}`,
      plan: renderPlan(design, level, facts, { theme, id: "t" }),
    })),
  ),
);

describe("floor plan styles", () => {
  it("define every theme role from tokens", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const [role, value] of Object.entries(themes[theme])) {
        expect(value, `${theme} ${role}`).toMatch(/^var\(--[\w-]+\)$/);
        resolve(theme, role);
      }
    }
  });

  it("use no colour literals in the stylesheet or the drawings", () => {
    const literal = /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|color-mix)\(/i;
    const stylesheet = planCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(stylesheet).not.toMatch(literal);
    for (const { key, plan } of rendered) {
      // fill="url(#pattern)" is the only allowed paint reference
      const paints = [...plan.svg.matchAll(/\b(fill|stroke|color|style)="([^"]*)"/g)].map((m) => m[2]);
      expect(paints.filter((p) => !/^url\(#[\w-]+\)$/.test(p)), key).toEqual([]);
    }
  });

  it("meet WCAG AA for every text role on every drawing background", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const text of ["--fp-text", "--fp-dim"]) {
        for (const ground of ["--fp-bg", "--fp-fill"]) {
          const ratio = contrast(resolve(theme, text), resolve(theme, ground));
          expect(ratio, `${theme} ${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("colour text only with the text roles", () => {
    const textClasses = new Set(["fp-label", "fp-label-sub", "fp-dim", "fp-note", "fp-title"]);
    const dimRoles = /\.fp \.fp-label-sub,\s*\.fp \.fp-dim,\s*\.fp \.fp-note \{\s*fill: var\(--fp-dim\);/;
    expect(planCss).toMatch(/\.fp text \{[^}]*fill: var\(--fp-text\);/);
    expect(planCss).toMatch(dimRoles);
    for (const { key, plan } of rendered) {
      for (const [, cls] of plan.svg.matchAll(/<text class="([^"]*)"/g)) expect(textClasses.has(cls), `${key} ${cls}`).toBe(true);
    }
  });

  it("keep text at 11px or more at the minimum drawing width", () => {
    for (const { key, plan } of rendered) {
      const sizes = [...plan.svg.matchAll(/<text[^>]* font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(sizes.length, key).toBeGreaterThan(0);
      expect(Math.min(...sizes) * MIN_PX_PER_FOOT, key).toBeGreaterThanOrEqual(11);
    }
  });
});

describe("floor plan text alternative", () => {
  it("names each drawing by its title and counts the schedule in the description", () => {
    for (const { key, plan } of rendered) {
      expect(plan.svg, key).toContain('role="img" aria-labelledby="t-title" aria-describedby="t-desc"');
      expect(plan.svg, key).toContain(`<title id="t-title">${plan.title}</title>`);
      const n = plan.schedule.length;
      expect(plan.svg, key).toContain(`lists ${n} ${n === 1 ? "space" : "spaces"} with their sizes`);
    }
  });

  it("lists every room of the level in the schedule", () => {
    for (const { design } of designs) {
      for (const level of planLevels(design)) {
        const plan = renderPlan(design, level, designs.find((d) => d.design === design)!.facts, { theme: "dark", id: "t" });
        const names = plan.schedule.map((r) => r.name);
        for (const room of level.rooms) expect(names, `${design.slug} ${level.id}`).toContain(room.name);
      }
    }
  });
});
