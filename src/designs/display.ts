/**
 * How a design's computed facts are shown on the site. Every value comes from
 * facts.ts, so changing a design's data changes the page after a rebuild.
 */
import type { DesignEntry } from "./index.ts";
import { dims, sqft } from "./units.ts";

export interface Fact {
  label: string;
  value: string;
  /** Secondary line, e.g. the plot dimensions */
  detail?: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "house" → "House", "mixed-use" → "Mixed use" */
export function kindLabel(kind: string): string {
  const text = kind.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The key facts panel on a design page */
export function keyFacts({ facts }: DesignEntry): Fact[] {
  const list: Fact[] = [
    { label: "Plot", value: facts.plot.size, detail: dims(facts.plot.width, facts.plot.depth) },
    { label: "Covered area", value: sqft(facts.coveredArea) },
    { label: "Storeys", value: String(facts.storeys) },
  ];
  if (facts.bedrooms > 0) {
    list.push({ label: "Bedrooms", value: String(facts.bedrooms) }, { label: "Bathrooms", value: String(facts.bathrooms) });
  }
  if (facts.shops > 0) list.push({ label: "Shops", value: String(facts.shops) });
  if (facts.officeArea > 0) list.push({ label: "Office area", value: sqft(facts.officeArea) });
  return list;
}

/** Two or three short facts for a design card, e.g. "5 bedrooms" */
export function cardFacts({ facts }: DesignEntry): string[] {
  if (facts.bedrooms > 0) {
    return [count(facts.bedrooms, "bedroom"), count(facts.bathrooms, "bathroom"), count(facts.storeys, "storey")];
  }
  const list = [count(facts.storeys, "storey")];
  if (facts.shops > 0) list.push(count(facts.shops, "shop"));
  if (facts.officeArea > 0) list.push(`${sqft(facts.officeArea)} of offices`);
  return list;
}
