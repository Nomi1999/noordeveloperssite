/**
 * Which rendered stills belong to which design, with their alt text and
 * captions. Stills live in src/assets/renders/<slug>/<shot>.jpg (written by
 * `npm run render:encode -- stills`); share images in public/og/<slug>.jpg.
 *
 * Validated when a page imports this module: a design without an entry, a
 * missing still or a missing share image fails the build.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ImageMetadata } from "astro";
import { designs } from "./index.ts";

export interface ShotCopy {
  /** Describes what the image shows, for people who can't see it */
  alt: string;
  /** Short mono caption, e.g. "Front, dusk" */
  caption: string;
}

export interface DesignRenderEntry {
  /** Shot id of the large lead image (also used on index cards) */
  lead: string;
  /** The other shots, in gallery order */
  gallery: string[];
  /** Root-relative share image */
  share: string;
  shots: Record<string, ShotCopy>;
}

export const renderRegistry: Record<string, DesignRenderEntry> = {
  "1-kanal": {
    lead: "front-day",
    gallery: ["front-dusk", "street", "side", "aerial"],
    share: "/og/1-kanal.jpg",
    shots: {
      "front-day": {
        alt: "The 1 Kanal house concept by day: a tall grey stone pier with white LED lines beside a timber and beige entrance, warm timber slats above a glass-railed terrace over the car porch, and a wide charcoal roof overhang with a timber soffit.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 1 Kanal house concept at dusk, with warm wall lights, downlights in the timber soffits, thin LED lines on the stone pier and lit, curtained windows on both floors.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 1 Kanal house concept from the street: a grey stone boundary wall with a timber door and a black metal lattice, black granite gate piers, and the two-storey front behind.",
        caption: "Street, day",
      },
      side: {
        alt: "The 1 Kanal house concept from the side street at dusk: a long stone boundary wall with lit timber slats, in front of the corner terrace, the recessed side terrace under its steel pergola and the sand-coloured rear block.",
        caption: "Side street, dusk",
      },
      aerial: {
        alt: "The 1 Kanal house concept from above on its corner plot, showing the flat roof behind low parapets, the planted corner garden, the covered car porch and the two roads that meet at the corner.",
        caption: "Aerial",
      },
    },
  },
  "2-kanal": {
    lead: "front-day",
    gallery: ["front-dusk", "street", "street-open", "aerial"],
    share: "/og/2-kanal.jpg",
    shots: {
      "front-day": {
        alt: "The 2 Kanal house concept by day: a wide two-storey house in charcoal, grey stone and travertine with black fins, a long glass-railed terrace with potted palms over a charcoal-beamed porch, a large lawn to one side and a guard room by the gate.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 2 Kanal house concept at dusk, with lit windows, wall lights and glowing timber soffits behind a grey stone boundary wall with black granite piers and black gates.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 2 Kanal house concept from the street, behind a grey stone boundary wall with a black metal lattice, black granite piers, a black pedestrian gate and a wide black car gate.",
        caption: "Street, day",
      },
      "street-open": {
        alt: "The 2 Kanal house concept from the street with the boundary wall left out, showing the travertine ground floor with its two wide windows and timber front door, the porch under the charcoal beam, the lawn and the guard room.",
        caption: "Front, without the boundary wall",
      },
      aerial: {
        alt: "The 2 Kanal house concept from above, showing the roof, the long lawn along one side and the porch at the front.",
        caption: "Aerial",
      },
    },
  },
  "5-marla": {
    lead: "front-day",
    gallery: ["front-dusk", "street", "aerial"],
    share: "/og/5-marla.jpg",
    shots: {
      "front-day": {
        alt: "The 5 Marla house concept by day: a narrow two-storey front with a beige tile bay beside a sand plaster frame, a black metal jaali across the first-floor balcony, and a black gate with timber doors and a wicket below.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 5 Marla house concept at dusk under a deep blue sky, with warm light through the black jaali and the windows of the beige tile bay, wall lights on the boundary wall, and a soft glow under the porch ceiling.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 5 Marla house concept from the street: the beige tile bay with its tall window and wide ground-floor window, the jaali beside timber slats above the porch, and the gate between grey stone piers in a solid tiled boundary wall.",
        caption: "Street, day",
      },
      aerial: {
        alt: "The 5 Marla house concept from above, showing the flat roof with its stair room and two water tanks, the beige tile and sand plaster front, and the small paved porch behind the gate.",
        caption: "Aerial",
      },
    },
  },
  "10-marla": {
    lead: "front-day",
    gallery: ["front-dusk", "street", "aerial"],
    share: "/og/10-marla.jpg",
    shots: {
      "front-day": {
        alt: "The 10 Marla house concept by day: a charcoal first-floor box with a large corner window in a concrete frame, a terrace with a steel pergola beside it, and black gates in the boundary wall.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 10 Marla house concept at dusk, with warm light in the corner window and the wide ground-floor window, a lit porch ceiling, and the steel pergola and timber-slatted stair tower against a blue sky.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 10 Marla house concept from the street: the exposed concrete ground floor, the charcoal box over the car porch on a slim pier, the pergola and timber slats beyond, and the black gates.",
        caption: "Street, day",
      },
      aerial: {
        alt: "The 10 Marla house concept from above, showing the flat roof with its two water tanks, the timber-slatted stair tower, the pergola over the terrace and the paved porch behind the black gates.",
        caption: "Aerial",
      },
    },
  },
};

const stills = import.meta.glob<{ default: ImageMetadata }>("../assets/renders/*/*.jpg", { eager: true });
const stillPath = (slug: string, shot: string) => `../assets/renders/${slug}/${shot}.jpg`;
// Builds and tests run from the project root; import.meta.url is not stable once Astro bundles this module
const publicFile = (path: string) => join(process.cwd(), "public", path);

export interface Render extends ShotCopy {
  design: string;
  shot: string;
  image: ImageMetadata;
}

export interface DesignRenders {
  lead: Render;
  gallery: Render[];
  share: string;
}

/** Lists every problem with the registry; empty when every design has its images */
export function checkRenders(
  registry: Record<string, DesignRenderEntry> = renderRegistry,
  slugs: string[] = designs.map((d) => d.design.slug),
  hasStill: (slug: string, shot: string) => boolean = (slug, shot) => stillPath(slug, shot) in stills,
  hasPublic: (path: string) => boolean = (path) => existsSync(publicFile(path)),
): string[] {
  const problems: string[] = [];
  for (const slug of slugs) {
    const entry = registry[slug];
    if (!entry) {
      problems.push(`design "${slug}" has no entry in the render registry (src/designs/renders.ts)`);
      continue;
    }
    for (const shot of [entry.lead, ...entry.gallery]) {
      if (!entry.shots[shot]) problems.push(`design "${slug}": shot "${shot}" has no alt text and caption`);
      if (!hasStill(slug, shot)) problems.push(`design "${slug}": missing still src/assets/renders/${slug}/${shot}.jpg`);
    }
    if (!hasPublic(entry.share)) problems.push(`design "${slug}": missing share image public${entry.share}`);
  }
  return problems;
}

const problems = checkRenders();
if (problems.length) throw new Error(`Render registry:\n  ${problems.join("\n  ")}`);

/** Never upscale: drop widths larger than the image, and offer the image's own width as the largest instead */
export function capWidths(widths: number[], max: number): number[] {
  return widths.some((w) => w > max) ? [...widths.filter((w) => w < max), max] : widths;
}

/** One still of a design, with its alt text and caption */
export function getRender(slug: string, shot: string): Render {
  const copy = renderRegistry[slug]?.shots[shot];
  const image = stills[stillPath(slug, shot)]?.default;
  if (!copy || !image) throw new Error(`No render "${shot}" for design "${slug}" in src/designs/renders.ts`);
  return { design: slug, shot, image, ...copy };
}

export function getRenders(slug: string): DesignRenders {
  const entry = renderRegistry[slug];
  if (!entry) throw new Error(`Design "${slug}" has no entry in the render registry`);
  return {
    lead: getRender(slug, entry.lead),
    gallery: entry.gallery.map((shot) => getRender(slug, shot)),
    share: entry.share,
  };
}
