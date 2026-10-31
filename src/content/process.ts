/**
 * How a build with Noor works, in four steps. No approvals, permits or other
 * regulatory steps are ever mentioned here.
 */

export interface ProcessStep {
  number: string;
  title: string;
  /** One sentence */
  text: string;
}

export const processIntro = "Four steps, one team, from the first conversation to the day you move in.";

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Talk to us",
    text: "Call or message us about your plot, your family and the home or building you have in mind.",
  },
  {
    number: "02",
    title: "Design",
    text: "We draw the plans and show you the design in 3D, shaped around your plot and the way you live.",
  },
  {
    number: "03",
    title: "Build",
    text: "We build it from the foundation to the roof and keep you updated as it rises.",
  },
  {
    number: "04",
    title: "Hand over the keys",
    text: "We finish every room, hand you the keys, and you move in with your furniture.",
  },
];
