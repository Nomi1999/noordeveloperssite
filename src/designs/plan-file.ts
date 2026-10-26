/**
 * A floor plan as a self-contained SVG file, for "View full size" and the
 * review sheet: the design tokens and plan styles are embedded, and fonts are
 * loaded from the given URLs.
 */
import type { DesignFacts } from "./facts.ts";
import type { Design, Level } from "./model.ts";
import { renderPlan, type PlanTheme } from "./plan.ts";

/** Pixels per foot for the full-size file */
export const FULL_SIZE_PX_PER_FOOT = 14;

export interface PlanFileAssets {
  /** Contents of src/styles/tokens.css */
  tokensCss: string;
  /** Contents of src/styles/floor-plan.css */
  planCss: string;
  /** Font files: [family, weight, url] */
  fonts: [string, number, string][];
}

export const planFileName = (design: Design, level: Level, theme: PlanTheme) => `${design.slug}-${level.id}-${theme}.svg`;

export function planFile(design: Design, level: Level, facts: DesignFacts, theme: PlanTheme, assets: PlanFileAssets): string {
  const fontFaces = assets.fonts
    .map(([family, weight, url]) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;src:url("${url}") format("woff2");}`)
    .join("");
  const css = `${fontFaces}${assets.tokensCss}${assets.planCss}`.replace(/\]\]>/g, "]]]]><![CDATA[>");
  const { svg } = renderPlan(design, level, facts, {
    theme,
    id: `${design.slug}-${level.id}`,
    pxPerFoot: FULL_SIZE_PX_PER_FOOT,
    head: `<style><![CDATA[${css}]]></style>`,
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`;
}
