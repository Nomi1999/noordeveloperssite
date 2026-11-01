// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import placeholderCheck from "./integrations/placeholder-check.mjs";
import designCheck from "./integrations/design-check.mjs";

// The address the site is built for. Locally it is the domain root; the deploy workflow passes the
// live GitHub Pages address: https://<user>.github.io with base "/<repo>" until a custom domain is
// connected, then the custom domain with base "/" (no code change needed when the domain is added).
const SITE = process.env.SITE_URL || "https://noordevelopers.pk";
const BASE = process.env.BASE_PATH || "/";
// Pages kept out of the sitemap (they are also noindex)
const UNLISTED = ["/404/", "/styleguide/", "/plans-preview/", "/plans-review/"].map(
  (path) => new URL(BASE.replace(/\/$/, "") + path, SITE).href,
);

export default defineConfig({
  site: SITE,
  base: BASE,
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
