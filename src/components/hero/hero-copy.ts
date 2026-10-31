/**
 * Every word the scroll-build hero shows. ScrollBuildHero.astro reads its copy
 * only from here. Approved by the maintainer (see src/content/APPROVALS.md).
 */

export interface HeroPhase {
  /** Two-digit phase number, shown as "02 — STRUCTURE" */
  number: string;
  name: string;
  line: string;
}

/** Closing message of the Move in phase, shown with the Call and WhatsApp actions. */
const closing = "Fully finished. Bring your furniture and move in.";

export const heroCopy = {
  headline: "We design, build and finish homes.",
  scrollCue: "Scroll to build",
  skip: "Skip the animation",
  /** One alt text for every poster source (blueprint frame, or the finished dusk frame in static mode) */
  imageAlt: "A 1 Kanal house by Noor Developers, from blueprint lines on an empty plot to the finished home lit at dusk.",
  phasesLabel: "How a Noor home is built",
  phases: [
    { number: "00", name: "Design", line: "Every home starts as a drawing, shaped around your plot and your family." },
    { number: "01", name: "Foundation", line: "Solid ground first." },
    { number: "02", name: "Structure", line: "A concrete frame rises, floor by floor." },
    { number: "03", name: "Walls", line: "Brick by brick, the rooms take shape." },
    { number: "04", name: "Finishing", line: "Floors, kitchens, baths, wardrobes, lights. Every detail done." },
    { number: "05", name: "Move in", line: closing },
  ] satisfies HeroPhase[],
  closing,
  /** Prefilled WhatsApp message for the hero's actions */
  whatsappMessage: "Hello Noor Developers, I saw your home page and would like to talk about building a home.",
} as const;
