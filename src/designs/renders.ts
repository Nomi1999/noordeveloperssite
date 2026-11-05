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
    gallery: ["front-dusk", "street", "aerial"],
    share: "/og/1-kanal.jpg",
    shots: {
      "front-day": {
        alt: "The 1 Kanal house concept by day: a two-storey white house with dark vertical fins, a glass-railed terrace over the car porch, and a boundary wall with a black gate.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 1 Kanal house concept at dusk, its windows lit warm on both floors behind the boundary wall and gate.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 1 Kanal house concept from the street: the boundary wall and black gates, with the two-storey front and its terrace behind.",
        caption: "Street, day",
      },
      aerial: {
        alt: "The 1 Kanal house concept from above, showing the roof with its stair room, the front lawn and the covered car porch.",
        caption: "Aerial",
      },
    },
  },
  "2-kanal": {
    lead: "front-day",
    gallery: ["front-dusk", "street", "aerial"],
    share: "/og/2-kanal.jpg",
    shots: {
      "front-day": {
        alt: "The 2 Kanal house concept by day: a wide two-storey white house with dark fins and a long glass-railed terrace, a large lawn to one side and a guard room by the gate.",
        caption: "Front, day",
      },
      "front-dusk": {
        alt: "The 2 Kanal house concept at dusk, with lit windows on both floors behind the boundary wall.",
        caption: "Front, dusk",
      },
      street: {
        alt: "The 2 Kanal house concept from the street, behind its boundary wall and wide black gates.",
        caption: "Street, day",
      },
      aerial: {
        alt: "The 2 Kanal house concept from above, showing the roof, the long lawn along one side and the porch at the front.",
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
