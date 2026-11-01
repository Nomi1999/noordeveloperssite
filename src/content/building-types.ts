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
    id: "houses",
    name: "Houses",
    summary: "Family homes of all sizes, mainly 1 Kanal and 2 Kanal.",
    detail:
      "We build houses of every size, most often on 1 Kanal and 2 Kanal plots. Each one is planned around the plot and the family: drawing and dining rooms for guests, a lounge for every day, bedrooms with their own bathrooms, a kitchen that works, and a lawn and porch outside.",
    tags: ["1 Kanal", "2 Kanal", "Other sizes"],
    render: { design: "2-kanal", shot: "front-day" },
    link: { href: "/designs/", label: "See house designs" },
  },
  {
    id: "commercial",
    name: "Commercial buildings",
    summary: "Plazas with shops at street level and open office floors above.",
    detail:
      "We design and build commercial buildings: shops at street level and office floors above, served by stairs, a lift and washrooms. Built and finished the same way as our homes, ready for tenants or for your own business.",
    tags: ["Shops", "Offices", "Plazas"],
    render: { design: "commercial", shot: "street-day" },
    link: { href: "/designs/commercial/", label: "See the commercial plaza" },
  },
];
