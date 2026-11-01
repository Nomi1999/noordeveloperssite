/**
 * What happens after someone gets in touch, in four steps. The build itself is
 * shown by the hero, so it is not a step here. No approvals, permits or other
 * regulatory steps are ever mentioned here.
 */

export interface ProcessStep {
  number: string;
  title: string;
  /** One sentence */
  text: string;
}

export const processIntro = "What happens once you get in touch, from the first conversation to the day you move in.";

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Talk to us",
    text: "Call or message us about your plot, your family and what you want to build. The first conversation is free.",
  },
  {
    number: "02",
    title: "Meet at our office",
    text: "Bring your plot details to our office in Faisalabad and go through what you need with us.",
  },
  {
    number: "03",
    title: "Review the design",
    text: "We draw the plans and show you the home in 3D, and you go through it with us before building starts.",
  },
  {
    number: "04",
    title: "Follow it to the keys",
    text: "We keep you updated while we build, then hand you the keys to a finished home.",
  },
];
