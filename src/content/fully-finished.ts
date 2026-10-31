/**
 * The fully finished checklist: everything a Noor build is handed over with.
 * One list for every page that shows it (home, What We Build, design pages).
 *
 * Items are generic on purpose: no brands, no grades. Approved by the
 * maintainer and confirmed by the client (see APPROVALS.md); record a new
 * confirmation if the list changes, because it is a promise to every buyer.
 */

export interface ChecklistItem {
  text: string;
  /** Shown in the compact checklist on the home page (keep it to eight) */
  highlight?: boolean;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface FullyFinished {
  heading: string;
  promise: string;
  groups: ChecklistGroup[];
  notIncluded: string[];
  notIncludedNote: string;
}

export const fullyFinished: FullyFinished = {
  heading: "Fully finished",
  /** Short promise, used as the section intro */
  promise: "Every Noor build is handed over fully finished. You bring the furniture and move in.",
  groups: [
    {
      id: "structure",
      title: "Structure and services",
      items: [
        { text: "RCC frame and brick masonry" },
        { text: "Concealed electrical wiring with switches, sockets and lights fitted", highlight: true },
        { text: "Hot and cold water plumbing", highlight: true },
        { text: "Gas lines" },
        { text: "Roof waterproofing and heat insulation" },
        { text: "Overhead and underground water tanks" },
      ],
    },
    {
      id: "interiors",
      title: "Interiors",
      items: [
        { text: "Tiled or marble floors throughout", highlight: true },
        { text: "False ceilings with lighting" },
        { text: "Interior and exterior paint", highlight: true },
        { text: "Solid wood doors" },
        { text: "Aluminium or uPVC windows with glazing" },
        { text: "Built-in bedroom wardrobes", highlight: true },
        { text: "Staircase with railing" },
      ],
    },
    {
      id: "kitchen-bath",
      title: "Kitchen and bathrooms",
      items: [
        { text: "Fitted kitchen cabinets and countertops", highlight: true },
        { text: "Tiled bathrooms with sanitary ware, vanities and mirrors", highlight: true },
        { text: "Water heating connection" },
      ],
    },
    {
      id: "outside",
      title: "Outside",
      items: [
        { text: "Boundary wall and main gate" },
        { text: "Car porch" },
        { text: "Landscaped lawn", highlight: true },
      ],
    },
  ],
  /** The only things not included */
  notIncluded: ["Furniture"],
  notIncludedNote: "Furniture is the only thing not included. That part is yours to choose.",
};

/** The highlighted items, in list order, for the compact checklist */
export const checklistHighlights: (ChecklistItem & { group: string })[] = fullyFinished.groups.flatMap((group) =>
  group.items.filter((item) => item.highlight).map((item) => ({ ...item, group: group.title })),
);
