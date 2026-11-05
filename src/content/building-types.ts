/**
 * What Noor Developers build. Each entry is one card on the home page and one
 * block on What We Build, in the same layout, so a new building type (an
 * apartment block, say) is a new entry here and nothing else.
 */

export interface BuildingType {
  id: string;
  name: string;
  /** One or two sentences, shown on the home page card */
  summary: string;
  /** Longer description for What We Build */
  detail: string;
  /** Mono tags under the name, e.g. plot sizes */
  tags: string[];
  /** A still from the render registry (src/designs/renders.ts) */
  render: { design: string; shot: string };
  link: { href: string; label: string };
}

export const buildingTypes: BuildingType[] = [
  {
    id: "1-kanal",
    name: "1 Kanal House",
    summary: "A two-storey family home on a 50′×90′ plot, with five bedrooms each having its own bathroom.",
    detail:
      "Our 1 Kanal concept fits a 50′×90′ plot: a front lawn and a covered two-car porch under the terrace, a drawing room and dining for guests, a TV lounge for every day, a kitchen with a back kitchen behind it, an elders' bedroom downstairs, and five bedrooms in all, each with its own bathroom.",
    tags: ["1 Kanal", "50′ × 90′", "5 bedrooms"],
    render: { design: "1-kanal", shot: "front-day" },
    link: { href: "/designs/1-kanal/", label: "See the 1 Kanal design" },
  },
  {
    id: "2-kanal",
    name: "2 Kanal House",
    summary: "A large two-storey family home on a 75′×120′ plot, built around a double-height lounge.",
    detail:
      "Our 2 Kanal concept spreads a 75′×120′ plot around a double-height lounge with a full-height window wall to the lawn: a drawing room and dining at the front, seven bedrooms in all, each with its own bathroom, a gallery and family lounge upstairs, and a covered three-car porch by the guard room.",
    tags: ["2 Kanal", "75′ × 120′", "7 bedrooms"],
    render: { design: "2-kanal", shot: "front-day" },
    link: { href: "/designs/2-kanal/", label: "See the 2 Kanal design" },
  },
];
