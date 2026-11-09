/**
 * The validated walkthroughs. Importing this module throws if a walkthrough breaks a rule (a room with no view,
 * a door that does not join its rooms, a view that cannot be reached), so no page can be built from a broken tour.
 */
import { designs } from "./index.ts";
import { buildTour, parsedWalkthroughs, walkthroughProblems, type Tour, type Walkthrough } from "./walkthrough.ts";

export interface WalkthroughEntry {
  walkthrough: Walkthrough;
  tour: Tour;
}

const problems: string[] = [];
const entries = new Map<string, WalkthroughEntry>();

for (const [slug, walkthrough] of parsedWalkthroughs) {
  const entry = designs.find((d) => d.design.slug === slug);
  if (!entry) {
    problems.push(`walkthrough for "${slug}", which is not a design`);
    continue;
  }
  const found = walkthroughProblems(entry.design, walkthrough);
  problems.push(...found);
  if (!found.length) entries.set(slug, { walkthrough, tour: buildTour(entry.design, walkthrough) });
}
if (problems.length) throw new Error(`Invalid walkthroughs:\n- ${problems.join("\n- ")}`);

/** A design's walkthrough, or undefined when it has none */
export const getWalkthrough = (slug: string): WalkthroughEntry | undefined => entries.get(slug);
