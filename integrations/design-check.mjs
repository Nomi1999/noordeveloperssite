// @ts-check

/**
 * Validates every building design when Astro starts. Warnings (rooms under the
 * minimum sizes) are printed; errors fail `astro build`, so an invalid design
 * can never deploy. The dev server prints errors and keeps running.
 *
 * @returns {import("astro").AstroIntegration}
 */
export default function designCheck() {
  return {
    name: "design-check",
    hooks: {
      "astro:config:setup": async ({ logger, command }) => {
        const { designSources } = await import("../src/designs/sources.ts");
        const { checkDesign, formatIssue } = await import("../src/designs/validate.ts");
        const results = designSources.map(checkDesign);
        const errors = results.flatMap((r) => r.errors);
        for (const warning of results.flatMap((r) => r.warnings)) logger.warn(formatIssue(warning));
        for (const error of errors) logger.error(formatIssue(error));
        if (errors.length && command === "build") {
          throw new Error(`${errors.length} design error(s); see above. Fix the design files in src/designs/.`);
        }
        logger.info(`${results.length} design(s) checked: ${errors.length} error(s)`);
      },
    },
  };
}
