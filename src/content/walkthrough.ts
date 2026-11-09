/**
 * Copy for the walkthrough section on a design page, in one place with the rest of the shared copy.
 * Room names and descriptions live with the walkthrough itself (src/designs/walkthroughs/<slug>.json).
 *
 * The finishes shown in the views are choices made for the renders, not a specification: the copy says
 * the house is shown finished and unfurnished, and that it is a concept design.
 */
export const walkthroughCopy = {
  label: "Walkthrough",
  heading: "Walk through the house",
  intro: "Step inside. Look around each room, then move through the house the way you would on a visit.",
  note: "Shown finished and unfurnished, the way we hand a house over. You bring your own furniture. This is a concept design, so finishes can change to suit you.",
  start: "Start the walkthrough",
  startHint: "Drag to look around. Select a white circle on the floor to move there.",
  stillsHeading: "Rooms in this walkthrough",
  stillsIntro: "The interactive walkthrough needs JavaScript. These are the rooms it shows, in order.",
  loading: "Loading the view…",
  failed: "This view did not load.",
  retry: "Try again",
  close: "Close walkthrough",
  mapShow: "Map",
  mapHide: "Hide map",
  mapLabel: "Floor plan map",
  levelLabel: "Floor",
  fullscreen: "Full screen",
  helpKeys: "Arrow keys turn the view. Plus and minus zoom.",
  moveHere: "Move here",
  goTo: (room: string) => `Go to ${room}`,
  goUpTo: (room: string) => `Go up to ${room}`,
  goDownTo: (room: string) => `Go down to ${room}`,
  roomOf: (room: string, level: string) => `${room}, ${level.toLowerCase()}`,
  conceptTag: "Concept design",
} as const;
