import type { Brawler, GameMap } from "./types";

const BRAWLIFY = "https://api.brawlify.com/v1";
const BRAWLIFY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (BrawlPick draft assistant; +https://github.com/HugoPires42/BrawlPicker)",
  Accept: "application/json",
};

type BrawlifyBrawler = {
  id: number;
  name: string;
  rarity?: { name: string };
  class?: { name: string };
  imageUrl?: string;
  imageUrl2?: string;
};

type BrawlifyMap = {
  id: number;
  name: string;
  hash: string;
  disabled?: boolean;
  imageUrl?: string;
  gameMode?: {
    name: string;
    color?: string;
    hash?: string;
    imageUrl?: string;
  };
};

let brawlersCache: { value: Brawler[]; at: number } | null = null;
let mapsCache: { value: GameMap[]; at: number } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

function modeNameToCube(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
      .join("")
  );
}

function brawlerToCubeName(name: string): string {
  return name.toUpperCase();
}

export async function getBrawlers(): Promise<Brawler[]> {
  if (brawlersCache && Date.now() - brawlersCache.at < TTL_MS) {
    return brawlersCache.value;
  }
  const res = await fetch(`${BRAWLIFY}/brawlers`, { headers: BRAWLIFY_HEADERS });
  const data = (await res.json()) as { list: BrawlifyBrawler[] };
  const value: Brawler[] = data.list
    .map((b) => ({
      id: b.id,
      name: b.name,
      cubeName: brawlerToCubeName(b.name),
      rarity: b.rarity?.name ?? "Common",
      className: b.class?.name,
      imageUrl:
        b.imageUrl2 ?? b.imageUrl ?? `https://cdn.brawlify.com/brawlers/borderless/${b.id}.png`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  brawlersCache = { value, at: Date.now() };
  return value;
}

export async function getMaps(): Promise<GameMap[]> {
  if (mapsCache && Date.now() - mapsCache.at < TTL_MS) return mapsCache.value;
  const res = await fetch(`${BRAWLIFY}/maps`, { headers: BRAWLIFY_HEADERS });
  const data = (await res.json()) as { list: BrawlifyMap[] };
  // Brawlify returns multiple entries per map name (one per rotation/version).
  // Prefer non-disabled entries; fall back to any entry if all are disabled.
  // The cube is the source of truth for what's actually in ranked rotation.
  const byKey = new Map<string, BrawlifyMap>();
  for (const m of data.list) {
    if (!m.gameMode?.name) continue;
    const k = `${m.gameMode.name}::${m.name}`;
    const existing = byKey.get(k);
    if (!existing) byKey.set(k, m);
    else if (existing.disabled && !m.disabled) byKey.set(k, m);
  }
  const value: GameMap[] = [...byKey.values()]
    .map((m) => ({
      id: m.id,
      name: m.name,
      cubeName: m.name, // default; overridden by getRankedMaps() when cube uses a different spelling
      hash: m.hash,
      modeName: m.gameMode!.name,
      modeCube: modeNameToCube(m.gameMode!.name),
      modeColor: m.gameMode!.color ?? "#888888",
      modeImageUrl:
        m.gameMode!.imageUrl ??
        `https://cdn-misc.brawlify.com/gamemode/header/${m.gameMode!.hash ?? m.gameMode!.name.replace(/\s+/g, "-")}.png`,
      imageUrl:
        m.imageUrl ?? `https://cdn.brawlify.com/maps/regular/${m.id}.png`,
    }))
    .sort((a, b) => a.modeName.localeCompare(b.modeName) || a.name.localeCompare(b.name));
  mapsCache = { value, at: Date.now() };
  return value;
}
