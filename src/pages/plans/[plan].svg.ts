// Standalone full-size floor plan files for "View full size": /plans/<slug>-<level>-<theme>.svg
import type { APIRoute, GetStaticPaths } from "astro";
import tokensCss from "../../styles/tokens.css?raw";
import planCss from "../../styles/floor-plan.css?raw";
import mono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";
import mono500 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url";
import display800 from "@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2?url";
import { designs } from "../../designs/index.ts";
import { planLevels, type PlanTheme } from "../../designs/plan.ts";
import { planFile, planFileName } from "../../designs/plan-file.ts";

const THEMES: PlanTheme[] = ["dark", "light"];

export const getStaticPaths = (() =>
  designs.flatMap(({ design, facts }) =>
    planLevels(design).flatMap((level) =>
      THEMES.map((theme) => ({
        params: { plan: planFileName(design, level, theme).replace(/\.svg$/, "") },
        props: { design, level, facts, theme },
      })),
    ),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { design, level, facts, theme } = props as ReturnType<typeof getStaticPaths>[number]["props"];
  const svg = planFile(design, level, facts, theme, {
    tokensCss,
    planCss,
    fonts: [
      ["IBM Plex Mono", 400, mono400],
      ["IBM Plex Mono", 500, mono500],
      ["Big Shoulders Display", 800, display800],
    ],
  });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
};
