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
    summary: "A two-storey family home on a five-sided corner plot, with five bedrooms each having its own bathroom.",
    detail:
      "Our 1 Kanal concept fills a five-sided corner plot, 90′ deep and up to 59′ wide: a planted corner garden and a covered two-car porch under the terrace, a double-height stair lobby, a drawing room and dining for guests, a TV lounge, a kitchen with a raw kitchen behind it and two bedrooms downstairs, and upstairs a second TV lounge, a kitchenette, a study and three more bedrooms. All five bedrooms have their own bathroom.",
    tags: ["1 Kanal", "Corner plot", "5 bedrooms"],
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
  {
    id: "5-marla",
    name: "5 Marla House",
    summary: "A compact two-storey family home on a 25′×45′ plot, with three bedrooms each having its own bathroom.",
    detail:
      "Our 5 Marla concept fits a 25′×45′ plot, attached on both sides: a covered one-car porch, a drawing room at the front, a TV lounge and a kitchen with a small rear yard, and a bedroom downstairs. Upstairs are a family lounge lit by an open sky court, a laundry, and a balcony behind a metal jaali. There are three bedrooms in all, each with its own bathroom.",
    tags: ["5 Marla", "25′ × 45′", "3 bedrooms"],
    render: { design: "5-marla", shot: "front-day" },
    link: { href: "/designs/5-marla/", label: "See the 5 Marla design" },
  },
  {
    id: "10-marla",
    name: "10 Marla House",
    summary: "A two-storey family home on a 35′×65′ plot, with four bedrooms each having its own bathroom.",
    detail:
      "Our 10 Marla concept fits a 35′×65′ plot: a covered two-car porch under the master bedroom, a drawing room and dining for guests, a TV lounge for every day, a kitchen with a store, and a bedroom downstairs. Upstairs are a family lounge, a laundry and a terrace with a steel pergola. There are four bedrooms in all, each with its own bathroom.",
    tags: ["10 Marla", "35′ × 65′", "4 bedrooms"],
    render: { design: "10-marla", shot: "front-day" },
    link: { href: "/designs/10-marla/", label: "See the 10 Marla design" },
  },
];
