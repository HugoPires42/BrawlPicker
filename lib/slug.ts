/**
 * Client-safe slug helpers — no server-side imports, so this file can be
 * pulled into any "use client" component without dragging Node modules.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brawlerHref(cubeName: string): string {
  return `/wiki/brawlers/${slugify(cubeName)}`;
}
