/**
 * Every word the scroll-build hero shows. ScrollBuildHero.astro reads its copy
 * only from here. See src/content/APPROVALS.md for the approval record.
 */

export interface HeroPhase {
  /** Two-digit phase number, counted from 01, shown as "03 — STRUCTURE" */
  number: string;
  name: string;
  line: string;
}

/** Closing message of the Move in phase, shown with the Call and WhatsApp actions. */
const closing = "Fully finished. Bring your furniture and move in.";

export const heroCopy = {
  headline: "We design, build and finish homes.",
  /** Under the headline on the opening (dusk) screen */
  intro: "In Faisalabad, from the first drawing to the keys.",
  scrollCue: "Scroll to see how it’s built",
  /** First focusable element in the hero; visible by the scroll cue while scrubbing */
  skip: "Skip past the build",
  /** One alt text for the poster: the finished dusk frame the page opens on */
  imageAlt: "A finished 1 Kanal house by Noor Developers, lit at dusk. Scrolling shows how it was built, from blueprint lines on an empty plot.",
  /** Accessible name of the ruler, whose ticks jump to each stage */
  jumpLabel: "Jump to a stage of the build",
  phasesLabel: "How a Noor home is built",
  phases: [
    { number: "01", name: "Design", line: "Every home starts as a drawing, shaped around your plot and your family." },
    { number: "02", name: "Foundation", line: "Solid ground first." },
    { number: "03", name: "Structure", line: "A concrete frame rises, floor by floor." },
    { number: "04", name: "Walls", line: "Brick by brick, the rooms take shape." },
    { number: "05", name: "Finishing", line: "Floors, kitchens, baths, wardrobes, lights. Every detail done." },
    { number: "06", name: "Move in", line: closing },
  ] satisfies HeroPhase[],
  closing,
  /** Prefilled WhatsApp message for the hero's actions */
  whatsappMessage: "Hello Noor Developers, I saw your home page and would like to talk about building a home.",
} as const;
