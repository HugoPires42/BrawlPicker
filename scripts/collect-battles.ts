/**
 * Collect ranked battle logs from the official Brawl Stars API.
 *
 * Strategy:
 *  1. Seed with top N players from the global ranking
 *  2. BFS expand via club members for richer coverage
 *  3. Fetch /players/{tag}/battlelog (last 25 battles per player)
 *  4. Keep only `type === "ranked"` battles
 *  5. Normalize: { ts, mode, map, teamA: [brawlerNames], teamB: [...], result: "a"|"b"|"draw" }
 *
 * Output: data/battles/raw.jsonl (one JSON per line — easy to append)
 *
 * Run:  npm run ai:collect
 */

import { readFile, mkdir, appendFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const API = "https://api.brawlstars.com/v1";
const OUT = resolve(process.cwd(), "data/battles/raw.jsonl");
const SEEN_PATH = resolve(process.cwd(), "data/battles/seen.json");

const TARGET_BATTLES = Number(process.env.TARGET_BATTLES ?? 5000);
const SEED_TOP_PLAYERS = 200;
const CONCURRENCY = 6;
const MAX_PLAYERS = 8000;

type Battle = {
  ts: string;
  mode: string;
  map: string;
  teamA: string[];
  teamB: string[];
  result: "a" | "b" | "draw";
  starPlayer?: string;
};

async function loadToken(): Promise<string> {
  const buf = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
  const m = buf.match(/BRAWLSTARS_TOKEN=(.+)/);
  if (!m) throw new Error("BRAWLSTARS_TOKEN missing in .env.local");
  return m[1].trim();
}

async function api<T>(token: string, path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) return null;
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    // 401/403 etc.
    const txt = await res.text();
    throw new Error(`API ${res.status} ${path}: ${txt.slice(0, 200)}`);
  }
  return null;
}

function tagEnc(tag: string) {
  return encodeURIComponent(tag.startsWith("#") ? tag : "#" + tag);
}

function parseBattle(raw: {
  battleTime: string;
  event?: { mode?: string; map?: string };
  battle: {
    type?: string;
    mode?: string;
    result?: string;
    teams?: { brawler: { name: string }; tag: string }[][];
    starPlayer?: { tag: string };
  };
}): Battle | null {
  const b = raw.battle;
  if (b.type !== "ranked") return null;
  const teams = b.teams;
  if (!teams || teams.length !== 2) return null;
  if (teams[0].length !== 3 || teams[1].length !== 3) return null;
  const mode = raw.event?.mode ?? b.mode ?? "?";
  const map = raw.event?.map ?? "?";
  if (mode === "?" || map === "?") return null;
  return {
    ts: raw.battleTime,
    mode,
    map,
    teamA: teams[0].map((p) => p.brawler.name),
    teamB: teams[1].map((p) => p.brawler.name),
    result:
      b.result === "victory" ? "a" : b.result === "defeat" ? "b" : "draw",
    starPlayer: b.starPlayer?.tag,
  };
}

async function main() {
  const t0 = Date.now();
  const token = await loadToken();
  await mkdir(dirname(OUT), { recursive: true });

  // Track players we've already scraped + battle hashes to dedupe
  const seen: { players: string[]; battles: string[] } = await stat(SEEN_PATH)
    .then(() =>
      readFile(SEEN_PATH, "utf8").then(
        (b) => JSON.parse(b) as { players: string[]; battles: string[] }
      )
    )
    .catch(() => ({ players: [], battles: [] }));

  const seenPlayers = new Set(seen.players);
  const seenBattles = new Set(seen.battles);
  console.log(
    `Resuming: ${seenPlayers.size} players already scraped, ${seenBattles.size} battles cached`
  );

  // Seed with top global ranked players
  const queue: string[] = [];
  console.log(`Fetching top ${SEED_TOP_PLAYERS} from global ranking…`);
  const rankRes = await api<{ items: { tag: string; clubTag?: string }[] }>(
    token,
    `/rankings/global/players?limit=${SEED_TOP_PLAYERS}`
  );
  for (const p of rankRes?.items ?? []) {
    queue.push(p.tag);
  }
  console.log(`Seeded ${queue.length} players`);

  let battlesCollected = 0;
  let processed = 0;
  let lastFlushAt = Date.now();

  // Process queue with bounded concurrency, BFS-style
  let qi = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (battlesCollected < TARGET_BATTLES) {
      // Get next player
      let tag: string | undefined;
      while (qi < queue.length) {
        const t = queue[qi++];
        if (!seenPlayers.has(t)) {
          tag = t;
          break;
        }
      }
      if (!tag) {
        if (seenPlayers.size >= MAX_PLAYERS) return;
        await new Promise((r) => setTimeout(r, 200));
        if (qi >= queue.length) return; // queue exhausted
        continue;
      }
      seenPlayers.add(tag);

      try {
        // Fetch battle log
        const log = await api<{ items: Parameters<typeof parseBattle>[0][] }>(
          token,
          `/players/${tagEnc(tag)}/battlelog`
        );
        if (log?.items) {
          for (const raw of log.items) {
            const b = parseBattle(raw);
            if (!b) continue;
            // Dedup by ts + first brawler of A + first of B
            const hash = `${b.ts}|${b.mode}|${b.map}|${b.teamA[0]}|${b.teamB[0]}`;
            if (seenBattles.has(hash)) continue;
            seenBattles.add(hash);
            await appendFile(OUT, JSON.stringify(b) + "\n");
            battlesCollected++;
          }
        }

        // Expand via club members for breadth
        if (battlesCollected < TARGET_BATTLES && seenPlayers.size < MAX_PLAYERS) {
          const pl = await api<{ club?: { tag?: string } }>(
            token,
            `/players/${tagEnc(tag)}`
          );
          const clubTag = pl?.club?.tag;
          if (clubTag) {
            const members = await api<{ items: { tag: string }[] }>(
              token,
              `/clubs/${tagEnc(clubTag)}/members`
            );
            for (const m of members?.items ?? []) {
              if (!seenPlayers.has(m.tag)) queue.push(m.tag);
            }
          }
        }
      } catch (e) {
        console.warn(`fail ${tag}:`, (e as Error).message);
      }

      processed++;
      if (Date.now() - lastFlushAt > 5000) {
        lastFlushAt = Date.now();
        const rate = (battlesCollected / ((Date.now() - t0) / 1000)).toFixed(1);
        console.log(
          `  players=${processed}/${queue.length} battles=${battlesCollected}/${TARGET_BATTLES} (${rate}/s)`
        );
        await writeFile(
          SEEN_PATH,
          JSON.stringify({
            players: [...seenPlayers],
            battles: [...seenBattles],
          })
        );
      }
    }
  });

  await Promise.all(workers);

  await writeFile(
    SEEN_PATH,
    JSON.stringify({
      players: [...seenPlayers],
      battles: [...seenBattles],
    })
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\nDone. Collected ${battlesCollected} new battles (${processed} players queried, ${elapsed}s).`
  );
  console.log(`Output: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
