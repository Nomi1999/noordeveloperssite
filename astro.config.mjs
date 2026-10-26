// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import placeholderCheck from "./integrations/placeholder-check.mjs";
import designCheck from "./integrations/design-check.mjs";

const SITE = "https://noordevelopers.pk";
// Pages kept out of the sitemap (they are also noindex)
const UNLISTED = ["/404/", "/styleguide/", "/plans-preview/", "/plans-review/"].map((path) => new URL(path, SITE).href);

export default defineConfig({
  site: SITE,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  integrations: [
    designCheck(),
    sitemap({
      filter: (page) => !UNLISTED.includes(page),
    }),
    placeholderCheck({ file: new URL("./src/config/site.ts", import.meta.url) }),
  ],
});
