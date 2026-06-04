import { cubeQuery, type CubeFilter } from "./cube";
import { canonical, expandAliases } from "./aliases";
import { getBaselineWRs } from "./baseline";
import { isRemoved } from "./removed";
import { getRankedMaps } from "./ranked";
import { getBrawlers, getMaps } from "./brawlify";
import type { Brawler, GameMap } from "./types";

/* ─────────────────────────── slugs ──────────────────────────────── */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findBrawlerBySlug(
  brawlers: Brawler[],
  slug: string
): Brawler | undefined {
  const norm = slug.toLowerCase();
  return brawlers.find((b) => slugify(b.cubeName) === norm);
}

export function findMapBySlug(
  maps: GameMap[],
  mode: string,
  slug: string
): GameMap | undefined {
  const norm = slug.toLowerCase();
  return maps.find((m) => m.modeCube === mode && slugify(m.cubeName) === norm);
}

/* ───────────────────── Brawlify detail fetch ────────────────────── */

const BRAWLIFY = "https://api.brawlify.com/v1";
const BRAWLIFY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export type BrawlifyDetail = {
  id: number;
  name: string;
  description: string;
  rarity: { name: string; color?: string };
  class: { name: string };
  gadgets: { id: number; name: string; description: string; imageUrl: string }[];
  starPowers: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
  }[];
};

const brawlerDetailCache = new Map<
  number,
  { value: BrawlifyDetail; at: number }
>();
const TTL_MS = 6 * 60 * 60 * 1000;

export async function getBrawlerDetail(id: number): Promise<BrawlifyDetail> {
  const hit = brawlerDetailCache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const r = await fetch(`${BRAWLIFY}/brawlers/${id}`, {
    headers: BRAWLIFY_HEADERS,
  });
  const d = (await r.json()) as BrawlifyDetail;
  brawlerDetailCache.set(id, { value: d, at: Date.now() });
  return d;
}

/**
 * Brawl Stars gear catalog (id → display name).
 * Brawlify doesn't expose a /v1/gears endpoint anymore (404), so we
 * maintain this short list manually. New gear → add a line.
 */
const GEAR_NAMES: Record<number, string> = {
  62000000: "Speed Gear",
  62000001: "Damage Gear",
  62000002: "Shield Gear",
  62000003: "Vision Gear",
  62000004: "Health Gear",
  62000005: "Reload Gear",
  62000006: "Super Charge Gear",
  62000007: "Vampire Gear",
  62000008: "Resistance Gear",
  62000009: "Pet Power Gear",
  62000010: "Magnum Gear",
  62000011: "Reaper Gear",
  62000012: "Vine Gear",
  62000013: "Pet Speed Gear",
  62000014: "Cluster Gear",
  62000015: "Bandages Gear",
  62000016: "Magic Gear",
  62000017: "Tap Dance Gear",
};

export async function getGearNames(): Promise<Map<number, string>> {
  const m = new Map<number, string>();
  for (const [id, name] of Object.entries(GEAR_NAMES)) m.set(Number(id), name);
  return m;
}

/* ───────────────────── cube helpers (filters) ───────────────────── */

function withTrophy(
  baseFilters: CubeFilter[],
  trophyMin: number | null,
  dim: string
): CubeFilter[] {
  if (trophyMin == null) return baseFilters;
  return [
    ...baseFilters,
    { member: dim, operator: "gte", values: [String(trophyMin)] },
  ];
}

/* ─────────────────── brawler stats (cube queries) ────────────────── */

export type IdWR = { id: string; winRate: number; picks: number };
export type NamedWR = { name: string; winRate: number; picks: number };
export type MapHit = {
  mode: string;
  map: string;
  winRate: number;
  picks: number;
};

const MIN_PICKS_OPT = 5_000;
const MIN_PICKS_MATCHUP = 5_000;
const MIN_PICKS_MAP = 5_000;

/** Top gadgets for a brawler, by WR (excludes the "no gadget" baseline id=0). */
export async function bestGadgets(
  brawler: string,
  trophyMin: number | null,
  limit = 2
): Promise<IdWR[]> {
  const rows = await cubeQuery<{
    "gadget.gadget_dimension": string;
    "gadget.winRate_measure": string | number;
    "gadget.picks_measure": string | number;
  }>({
    measures: ["gadget.winRate_measure", "gadget.picks_measure"],
    dimensions: ["gadget.gadget_dimension"],
    filters: withTrophy(
      [
        {
          member: "gadget.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "gadget.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_OPT)],
        },
      ],
      trophyMin,
      "gadget.trophyRange_dimension"
    ),
    order: { "gadget.winRate_measure": "desc" },
    limit: limit + 2,
  });
  return rows
    .filter((r) => String(r["gadget.gadget_dimension"]) !== "0")
    .slice(0, limit)
    .map((r) => ({
      id: String(r["gadget.gadget_dimension"]),
      winRate: Number(r["gadget.winRate_measure"]),
      picks: Number(r["gadget.picks_measure"]),
    }));
}

export async function bestStarPowers(
  brawler: string,
  trophyMin: number | null,
  limit = 2
): Promise<IdWR[]> {
  const rows = await cubeQuery<{
    "starpower.starpower_dimension": string;
    "starpower.winRate_measure": string | number;
    "starpower.picks_measure": string | number;
  }>({
    measures: ["starpower.winRate_measure", "starpower.picks_measure"],
    dimensions: ["starpower.starpower_dimension"],
    filters: withTrophy(
      [
        {
          member: "starpower.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "starpower.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_OPT)],
        },
      ],
      trophyMin,
      "starpower.trophyRange_dimension"
    ),
    order: { "starpower.winRate_measure": "desc" },
    limit: limit + 2,
  });
  return rows
    .filter((r) => String(r["starpower.starpower_dimension"]) !== "0")
    .slice(0, limit)
    .map((r) => ({
      id: String(r["starpower.starpower_dimension"]),
      winRate: Number(r["starpower.winRate_measure"]),
      picks: Number(r["starpower.picks_measure"]),
    }));
}

export async function bestGears(
  brawler: string,
  trophyMin: number | null,
  limit = 3
): Promise<IdWR[]> {
  const rows = await cubeQuery<{
    "gear.gear_dimension": string;
    "gear.winRate_measure": string | number;
    "gear.picks_measure": string | number;
  }>({
    measures: ["gear.winRate_measure", "gear.picks_measure"],
    dimensions: ["gear.gear_dimension"],
    filters: withTrophy(
      [
        {
          member: "gear.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "gear.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_OPT)],
        },
      ],
      trophyMin,
      "gear.trophyRange_dimension"
    ),
    order: { "gear.winRate_measure": "desc" },
    limit: limit + 2,
  });
  return rows
    .filter((r) => String(r["gear.gear_dimension"]) !== "0")
    .slice(0, limit)
    .map((r) => ({
      id: String(r["gear.gear_dimension"]),
      winRate: Number(r["gear.winRate_measure"]),
      picks: Number(r["gear.picks_measure"]),
    }));
}

/** Best ranked maps for a brawler (filtered to current ranked rotation). */
export async function bestMapsForBrawler(
  brawler: string,
  trophyMin: number | null,
  limit = 5
): Promise<MapHit[]> {
  const [rows, ranked] = await Promise.all([
    cubeQuery<{
      "map.mode_dimension": string;
      "map.map_dimension": string;
      "map.winRate_measure": string | number;
      "map.picks_measure": string | number;
    }>({
      measures: ["map.winRate_measure", "map.picks_measure"],
      dimensions: ["map.mode_dimension", "map.map_dimension"],
      filters: withTrophy(
        [
          {
            member: "map.brawler_dimension",
            operator: "equals",
            values: expandAliases(brawler),
          },
          {
            member: "map.picks_measure",
            operator: "gte",
            values: [String(MIN_PICKS_MAP)],
          },
          {
            member: "map.season_dimension",
            operator: "gte",
            values: ["2026-03-30"],
          },
        ],
        trophyMin,
        "map.trophyRange_dimension"
      ),
      order: { "map.winRate_measure": "desc" },
    }),
    getRankedMaps(),
  ]);
  const rankedKey = new Set(
    ranked.map((m) => `${m.modeCube}::${m.cubeName.toLowerCase()}`)
  );
  return rows
    .filter((r) =>
      rankedKey.has(
        `${r["map.mode_dimension"]}::${String(r["map.map_dimension"]).toLowerCase()}`
      )
    )
    .slice(0, limit)
    .map((r) => ({
      mode: String(r["map.mode_dimension"]),
      map: String(r["map.map_dimension"]),
      winRate: Number(r["map.winRate_measure"]),
      picks: Number(r["map.picks_measure"]),
    }));
}

/** Top allies (synergy) for a brawler globally. Self is excluded — the cube
 *  reports B paired with itself for showdown / multi-pick scenarios but it
 *  doesn't make sense in a draft assistant. */
export async function bestAlliesForBrawler(
  brawler: string,
  trophyMin: number | null,
  limit = 5
): Promise<NamedWR[]> {
  const selfCanon = canonical(brawler);
  const rows = await cubeQuery<{
    "brawlerAllies.ally_dimension": string;
    "brawlerAllies.winRate_measure": string | number;
    "brawlerAllies.picks_measure": string | number;
  }>({
    measures: [
      "brawlerAllies.winRate_measure",
      "brawlerAllies.picks_measure",
    ],
    dimensions: ["brawlerAllies.ally_dimension"],
    filters: withTrophy(
      [
        {
          member: "brawlerAllies.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "brawlerAllies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_MATCHUP)],
        },
      ],
      trophyMin,
      "brawlerAllies.trophyRange_dimension"
    ),
    order: { "brawlerAllies.winRate_measure": "desc" },
  });
  const merged = new Map<string, { wr: number; picks: number }>();
  for (const r of rows) {
    const a = canonical(String(r["brawlerAllies.ally_dimension"]));
    if (isRemoved(a)) continue;
    if (a === selfCanon) continue; // don't recommend the brawler with itself
    const wr = Number(r["brawlerAllies.winRate_measure"]);
    const picks = Number(r["brawlerAllies.picks_measure"]);
    const prev = merged.get(a);
    if (!prev) merged.set(a, { wr, picks });
    else {
      const total = prev.picks + picks;
      merged.set(a, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
  }
  return [...merged.entries()]
    .map(([name, v]) => ({ name, winRate: v.wr, picks: v.picks }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
}

/** Enemies this brawler struggles against (low WR). */
export async function worstMatchupsForBrawler(
  brawler: string,
  trophyMin: number | null,
  limit = 5
): Promise<NamedWR[]> {
  const rows = await cubeQuery<{
    "brawlerEnemies.enemy_dimension": string;
    "brawlerEnemies.winRate_measure": string | number;
    "brawlerEnemies.picks_measure": string | number;
  }>({
    measures: [
      "brawlerEnemies.winRate_measure",
      "brawlerEnemies.picks_measure",
    ],
    dimensions: ["brawlerEnemies.enemy_dimension"],
    filters: withTrophy(
      [
        {
          member: "brawlerEnemies.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "brawlerEnemies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_MATCHUP)],
        },
      ],
      trophyMin,
      "brawlerEnemies.trophyRange_dimension"
    ),
    order: { "brawlerEnemies.winRate_measure": "asc" },
  });
  const merged = new Map<string, { wr: number; picks: number }>();
  for (const r of rows) {
    const e = canonical(String(r["brawlerEnemies.enemy_dimension"]));
    if (isRemoved(e)) continue;
    const wr = Number(r["brawlerEnemies.winRate_measure"]);
    const picks = Number(r["brawlerEnemies.picks_measure"]);
    const prev = merged.get(e);
    if (!prev) merged.set(e, { wr, picks });
    else {
      const total = prev.picks + picks;
      merged.set(e, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
  }
  return [...merged.entries()]
    .map(([name, v]) => ({ name, winRate: v.wr, picks: v.picks }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, limit);
}

/** Enemies this brawler beats most easily (high WR). */
export async function easiestMatchupsForBrawler(
  brawler: string,
  trophyMin: number | null,
  limit = 5
): Promise<NamedWR[]> {
  const rows = await cubeQuery<{
    "brawlerEnemies.enemy_dimension": string;
    "brawlerEnemies.winRate_measure": string | number;
    "brawlerEnemies.picks_measure": string | number;
  }>({
    measures: [
      "brawlerEnemies.winRate_measure",
      "brawlerEnemies.picks_measure",
    ],
    dimensions: ["brawlerEnemies.enemy_dimension"],
    filters: withTrophy(
      [
        {
          member: "brawlerEnemies.brawler_dimension",
          operator: "equals",
          values: expandAliases(brawler),
        },
        {
          member: "brawlerEnemies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_MATCHUP)],
        },
      ],
      trophyMin,
      "brawlerEnemies.trophyRange_dimension"
    ),
    order: { "brawlerEnemies.winRate_measure": "desc" },
  });
  const merged = new Map<string, { wr: number; picks: number }>();
  for (const r of rows) {
    const e = canonical(String(r["brawlerEnemies.enemy_dimension"]));
    if (isRemoved(e)) continue;
    const wr = Number(r["brawlerEnemies.winRate_measure"]);
    const picks = Number(r["brawlerEnemies.picks_measure"]);
    const prev = merged.get(e);
    if (!prev) merged.set(e, { wr, picks });
    else {
      const total = prev.picks + picks;
      merged.set(e, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
  }
  return [...merged.entries()]
    .map(([name, v]) => ({ name, winRate: v.wr, picks: v.picks }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
}

export async function brawlerBaseline(
  brawler: string,
  trophyMin: number | null
): Promise<number | null> {
  const m = await getBaselineWRs(trophyMin);
  return m.get(canonical(brawler)) ?? null;
}

/* ────────────────────── map stats (cube queries) ─────────────────── */

/** Top brawlers on a map by WR. Reuses bans data (same query shape). */
export async function topBrawlersOnMap(
  mode: string,
  map: string,
  trophyMin: number | null,
  limit = 10
): Promise<NamedWR[]> {
  const rows = await cubeQuery<{
    "map.brawler_dimension": string;
    "map.winRate_measure": string | number;
    "map.picks_measure": string | number;
  }>({
    measures: ["map.winRate_measure", "map.picks_measure"],
    dimensions: ["map.brawler_dimension"],
    filters: withTrophy(
      [
        { member: "map.mode_dimension", operator: "equals", values: [mode] },
        { member: "map.map_dimension", operator: "equals", values: [map] },
        {
          member: "map.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS_MAP)],
        },
      ],
      trophyMin,
      "map.trophyRange_dimension"
    ),
    order: { "map.winRate_measure": "desc" },
  });
  const merged = new Map<string, { wr: number; picks: number }>();
  for (const r of rows) {
    const b = canonical(String(r["map.brawler_dimension"]));
    if (isRemoved(b)) continue;
    const wr = Number(r["map.winRate_measure"]);
    const picks = Number(r["map.picks_measure"]);
    const prev = merged.get(b);
    if (!prev) merged.set(b, { wr, picks });
    else {
      const total = prev.picks + picks;
      merged.set(b, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
  }
  return [...merged.entries()]
    .map(([name, v]) => ({ name, winRate: v.wr, picks: v.picks }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
}

/* ────────────────── archetype derivation (heuristic) ─────────────── */

export type Archetype =
  | "sniperOpen"
  | "tankClose"
  | "assassinControl"
  | "mixed";

/** Derive a map archetype from the classes of its top brawlers. */
export function deriveArchetype(
  topBrawlers: NamedWR[],
  classByCube: Map<string, string | undefined>
): Archetype {
  const counts = new Map<string, number>();
  for (const b of topBrawlers.slice(0, 6)) {
    const c = classByCube.get(b.name);
    if (!c) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const get = (c: string) => counts.get(c) ?? 0;
  const sniperish = get("Marksman") + get("Artillery");
  const tankish = get("Tank") + get("Damage Dealer");
  const assassin = get("Assassin") + get("Controller");
  if (sniperish >= 3 && sniperish > tankish) return "sniperOpen";
  if (tankish >= 3 && tankish > sniperish) return "tankClose";
  if (assassin >= 3) return "assassinControl";
  return "mixed";
}

export { getBrawlers, getMaps };
