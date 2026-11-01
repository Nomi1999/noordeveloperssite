/**
 * The site can be served from a sub-path (GitHub Pages without a custom domain serves it at
 * https://<user>.github.io/<repo>/). Astro's `base` covers its own assets; every root-relative
 * link or file path written in our code goes through withBase() so it works in both places.
 */

/** The base path without a trailing slash: "" at the domain root, "/noordeveloperssite" on a sub-path */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, "");

/** "/designs/" → "/noordeveloperssite/designs/" when served from a sub-path; other URLs unchanged */
export function withBase(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${BASE_PATH}${path}`;
}

/** The inverse, for comparing the current page's path with root-relative links */
export function withoutBase(pathname: string): string {
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}
