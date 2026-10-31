/**
 * The two ways to work with Noor Developers. Shown on the home page (title and
 * summary) and on What We Build (with the steps). Copy follows the rules in
 * content-rules.json: no prices, payment terms, availability or approvals.
 */

export interface Offering {
  id: string;
  /** Mono label, e.g. "Option A" */
  label: string;
  title: string;
  /** One line, shown on the home page */
  summary: string;
  /** What Noor does from start to finish, in order */
  steps: string[];
  /** Closing line under the steps on What We Build */
  outcome: string;
}

export const offerings: Offering[] = [
  {
    id: "buy",
    label: "Option A",
    title: "Buy a Noor home",
    summary: "Houses we build on our own plots and sell fully finished, ready for your furniture.",
    steps: [
      "We buy the plot.",
      "We design the house around it.",
      "We build it from the foundation to the roof.",
      "We finish every room, inside and out.",
    ],
    outcome: "Then you walk through a finished home, make it yours, bring your furniture and move in.",
  },
  {
    id: "build",
    label: "Option B",
    title: "Build on your plot",
    summary: "You bring the land. We design, architect and build on it, and hand it over fully finished.",
    steps: [
      "We listen to what you need and study your plot.",
      "We design and draw the building around your plot and the way you live or work.",
      "We build it from the foundation to the roof.",
      "We finish every room, inside and out.",
    ],
    outcome: "You get one team from the first sketch to the keys, and a building ready to use on the day we hand it over.",
  },
];
