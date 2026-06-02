// If BRAWLTIME_PROXY is set (Cloudflare Worker URL), route all brawltime
// traffic through it. This is necessary on datacenter hosts (Render, Vercel)
// where Cloudflare blocks direct calls. See worker/worker.js for the proxy.
const PROXY = process.env.BRAWLTIME_PROXY?.replace(/\/+$/, "");
const CUBE_URL = PROXY
  ? `${PROXY}/cube/cubejs-api/v1/load`
  : "https://cube.brawltime.ninja/cubejs-api/v1/load";
const TOKEN_URL = PROXY
  ? `${PROXY}/trpc/auth.getToken`
  : "https://brawltime.ninja/api/trpc/auth.getToken";

// Brawltime sits behind Cloudflare bot protection. From a datacenter IP
// (Render, Vercel, etc.) we need the request to look identical to what
// brawltime's own frontend sends from a real browser — same User-Agent,
// same Origin/Referer, same Accept-* headers.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://brawltime.ninja",
  Referer: "https://brawltime.ninja/",
};

type TokenCache = { token: string; expiresAt: number };
let cached: TokenCache | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) return cached.token;

  let lastErr: unknown;
  let res: Response | null = null;
  for (let i = 0; i < 3; i++) {
    try {
      res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (res.ok) break;
      if (res.status < 500) throw new Error(`token fetch ${res.status}`);
      lastErr = new Error(`token fetch ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  if (!res || !res.ok) throw lastErr ?? new Error("token fetch failed");

  // brawltime returns either:
  //   - new shape: { result: { data: { json: { token, expiresAt } } } }
  //   - legacy shape: { result: { data: { json: "eyJ..." } } }   (JWT string directly)
  const data = (await res.json()) as {
    result: {
      data: {
        json: string | { token: string; expiresAt?: number };
      };
    };
  };
  const payload = data.result.data.json;

  let token: string;
  let expiresAt: number;

  if (typeof payload === "string") {
    token = payload;
    const [, b64] = token.split(".");
    const claims = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8")
    ) as { exp: number };
    expiresAt = claims.exp * 1000;
  } else {
    token = payload.token;
    if (typeof token !== "string") {
      throw new Error(
        `unexpected token payload: ${JSON.stringify(payload).slice(0, 200)}`
      );
    }
    if (typeof payload.expiresAt === "number") {
      expiresAt = payload.expiresAt;
    } else {
      const [, b64] = token.split(".");
      const claims = JSON.parse(
        Buffer.from(b64, "base64url").toString("utf8")
      ) as { exp: number };
      expiresAt = claims.exp * 1000;
    }
  }

  cached = { token, expiresAt };
  return token;
}

export type CubeFilter = {
  member: string;
  operator:
    | "equals"
    | "notEquals"
    | "contains"
    | "gte"
    | "lte"
    | "gt"
    | "lt"
    | "set"
    | "notSet";
  values?: string[];
};

export type CubeQuery = {
  measures: string[];
  dimensions?: string[];
  filters?: CubeFilter[];
  order?: Record<string, "asc" | "desc">;
  limit?: number;
};

export type CubeRow = Record<string, string | number | null>;

const MAX_ATTEMPTS = 20;
const POLL_DELAY_MS = 1200;
const CACHE_TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = { result: T[]; expiresAt: number };
const responseCache = new Map<string, CacheEntry<CubeRow>>();
const inflight = new Map<string, Promise<CubeRow[]>>();

export async function cubeQuery<T extends CubeRow = CubeRow>(
  query: CubeQuery
): Promise<T[]> {
  const key = JSON.stringify(query);
  const now = Date.now();

  const hit = responseCache.get(key);
  if (hit && hit.expiresAt > now) return hit.result as T[];

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T[]>;

  const p = (async () => {
    const body = JSON.stringify({ query });
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const token = await getToken();
      const res = await fetch(CUBE_URL, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          Authorization: token,
          "Content-Type": "application/json",
        },
        body,
      });

      if (res.status === 403 || res.status === 401) {
        cached = null;
        continue;
      }

      const json = (await res.json()) as
        | { data: CubeRow[] }
        | { error: string };

      if ("data" in json) {
        responseCache.set(key, {
          result: json.data,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return json.data;
      }

      if (json.error === "Continue wait") {
        await new Promise((r) => setTimeout(r, POLL_DELAY_MS));
        continue;
      }
      throw new Error(`cube error: ${json.error}`);
    }
    throw new Error("cube query timed out");
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p as Promise<T[]>;
}
