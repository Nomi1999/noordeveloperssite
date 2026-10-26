/**
 * The validated designs. Importing this module throws if any design breaks a
 * rule, so no page can be built from an invalid design.
 */
import { computeFacts, type DesignFacts } from "./facts.ts";
import type { Design } from "./model.ts";
import { designSources } from "./sources.ts";
import { assertValid } from "./validate.ts";

export interface DesignEntry {
  design: Design;
  facts: DesignFacts;
}

export const designs: DesignEntry[] = designSources.map((source) => {
  const { design } = assertValid(source);
  return { design, facts: computeFacts(design) };
});

export function getDesign(slug: string): DesignEntry {
  const entry = designs.find((d) => d.design.slug === slug);
  if (!entry) throw new Error(`No design "${slug}"; designs are ${designs.map((d) => d.design.slug).join(", ")}`);
  return entry;
}
