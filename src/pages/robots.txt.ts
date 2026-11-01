import type { APIRoute } from "astro";
import { withBase } from "../lib/paths.ts";

// Generated so the sitemap URL follows the address the site is built for (see astro.config.mjs)
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(withBase("/sitemap-index.xml"), site).href}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
