/**
 * Cloudflare Worker proxy for brawltime.ninja AND Brawl Stars official API.
 *
 * Why a Worker?
 *   - Brawltime sits behind Cloudflare bot protection. From a datacenter IP
 *     (Render, Vercel, Fly…) the auth endpoint returns 403 even with proper
 *     headers. A Worker runs INSIDE Cloudflare's network and is treated as
 *     a trusted origin.
 *   - Brawl Stars developer tokens are IP-locked. Render free tier has no
 *     static egress IP. Cloudflare publishes its IP ranges, so a Supercell
 *     token configured with CF IPs in its CIDR allow-list works from the
 *     Worker.
 *
 * Routes:
 *   POST {proxy}/trpc/auth.getToken           → brawltime.ninja/api/trpc/auth.getToken
 *   POST {proxy}/cube/cubejs-api/v1/load      → cube.brawltime.ninja/cubejs-api/v1/load
 *   GET  {proxy}/supercell/v1/players/%23TAG  → api.brawlstars.com/v1/players/%23TAG
 *   GET  {proxy}/whoami                       → JSON with the IP the Worker uses
 *
 * Deploy:
 *   1. https://workers.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste this file's contents, Save & Deploy
 *   3. Domains tab → enable the workers.dev URL
 *   4. On Render, set env var BRAWLTIME_PROXY = https://<name>.<account>.workers.dev
 */

const SUPERCELL_BASE = "https://api.brawlstars.com";
const CUBE_BASE = "https://cube.brawltime.ninja";
const TRPC_BASE = "https://brawltime.ninja/api/trpc";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");

    // Debug — returns the egress IP the Worker is currently using so the
    // user can add it (or its CIDR range) to the Supercell token allow-list.
    if (path === "whoami") {
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const j = await r.json();
        return new Response(
          JSON.stringify({
            yourIp: j.ip,
            note:
              "Add this IP (or its /24 range) to your Supercell developer token if 403 errors persist.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (e) {
        return new Response(`whoami failed: ${e.message}`, { status: 500 });
      }
    }

    let target;
    let isBrawltime = false;
    if (path.startsWith("cube/")) {
      target = `${CUBE_BASE}/${path.slice("cube/".length)}`;
      isBrawltime = true;
    } else if (path.startsWith("trpc/")) {
      target = `${TRPC_BASE}/${path.slice("trpc/".length)}`;
      isBrawltime = true;
    } else if (path.startsWith("supercell/")) {
      target = `${SUPERCELL_BASE}/${path.slice("supercell/".length)}`;
    } else if (path === "" || path === "/") {
      return new Response(
        "BrawlPick proxy is live.\nRoutes: /trpc/* /cube/* /supercell/* /whoami",
        { status: 200 }
      );
    } else {
      return new Response("not found", { status: 404 });
    }

    if (url.search) target += url.search;

    // Strip Cloudflare-internal headers that confuse upstreams.
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
      )
        continue;
      fwdHeaders.set(k, v);
    }

    if (isBrawltime) {
      // Brawltime expects a browser-shaped Origin / Referer.
      fwdHeaders.set("Origin", "https://brawltime.ninja");
      fwdHeaders.set("Referer", "https://brawltime.ninja/");
    }
    // For Supercell: pass through Authorization as-is, no extra headers.

    const upstream = await fetch(target, {
      method: request.method,
      headers: fwdHeaders,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
    });

    const out = new Response(upstream.body, upstream);
    out.headers.set("Access-Control-Allow-Origin", "*");
    return out;
  },
};
