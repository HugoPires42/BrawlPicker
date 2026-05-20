const CUBE_URL = "https://cube.brawltime.ninja/cubejs-api/v1/load";
const TOKEN_URL = "https://brawltime.ninja/api/trpc/auth.getToken";

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
        headers: { "Content-Type": "application/json" },
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

  const data = (await res.json()) as { result: { data: { json: string } } };
  const token = data.result.data.json;

  const [, payloadB64] = token.split(".");
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8")
  ) as { exp: number };

  cached = { token, expiresAt: payload.exp * 1000 };
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
        headers: { Authorization: token, "Content-Type": "application/json" },
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
