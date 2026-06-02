/**
 * Cloudflare Worker proxy for brawltime.ninja.
 *
 * Brawltime sits behind Cloudflare bot protection. From a datacenter IP
 * (Render, Vercel, Fly…) the auth endpoint returns 403 even with proper
 * headers. A Worker runs INSIDE Cloudflare's network and is treated as a
 * trusted origin, so it can call brawltime freely.
 *
 * Deploy:
 *   1. https://workers.cloudflare.com → "Create application" → "Create Worker"
 *   2. Name it e.g. "brawlpick-proxy" → Deploy
 *   3. Open the editor, paste this file's contents, Save & Deploy
 *   4. Copy the URL it gives you (e.g. https://brawlpick-proxy.<account>.workers.dev)
 *   5. On Render, add an env var:
 *        BRAWLTIME_PROXY = https://brawlpick-proxy.<account>.workers.dev
 *
 * Routes:
 *   POST {proxy}/trpc/auth.getToken           → brawltime.ninja/api/trpc/auth.getToken
 *   POST {proxy}/cube/cubejs-api/v1/load      → cube.brawltime.ninja/cubejs-api/v1/load
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");

    let target;
    if (path.startsWith("cube/")) {
      target = "https://cube.brawltime.ninja/" + path.slice("cube/".length);
    } else if (path.startsWith("trpc/")) {
      target = "https://brawltime.ninja/api/trpc/" + path.slice("trpc/".length);
    } else if (path === "" || path === "/") {
      return new Response(
        "BrawlPick proxy is live.\nRoutes: /trpc/* and /cube/*",
        { status: 200 }
      );
    } else {
      return new Response("not found", { status: 404 });
    }

    if (url.search) target += url.search;

    // Strip headers the upstream doesn't expect, force browser-shaped ones.
    const fwdHeaders = new Headers();
    for (const [k, v] of request.headers) {
      const lk = k.toLowerCase();
      if (
        lk === "host" ||
        lk === "cf-connecting-ip" ||
        lk === "cf-ipcountry" ||
        lk === "cf-ray" ||
        lk === "cf-visitor" ||
        lk.startsWith("x-forwarded-")
      ) continue;
      fwdHeaders.set(k, v);
    }
    fwdHeaders.set("Origin", "https://brawltime.ninja");
    fwdHeaders.set("Referer", "https://brawltime.ninja/");

    const upstream = await fetch(target, {
      method: request.method,
      headers: fwdHeaders,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    });

    const out = new Response(upstream.body, upstream);
    out.headers.set("Access-Control-Allow-Origin", "*");
    return out;
  },
};
