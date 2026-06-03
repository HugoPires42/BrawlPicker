# BrawlPick — Handover Documentation

> Companion document to `README.md`. The README explains what the app does
> to a user. This file documents the codebase, its history, and its
> trade-offs so a fresh contributor (or a Claude in a new conversation) can
> pick up where we left off without losing context.

---

## 1. One-paragraph overview

BrawlPick is a Next.js 15 web app that helps a Brawl Stars player pick
brawlers during the ranked draft. The user picks the mode, then the map,
then fills in enemy and ally slots as the draft unfolds. The app shows in
real time: (a) the top counters of each picked enemy, (b) the top bans for
the map, (c) four ranked columns of suggestions (Combined AI / Best on map
/ Ally synergy / Enemy counters), and (d) explanatory badges on every
suggestion. The data comes from **brawltime.ninja's Cube.js backend** (free,
public, but Cloudflare-protected) and from **Brawlify** (open JSON). A
self-trained Matrix Factorization model lives at `data/model-{bucket}.json`
and is loaded into memory at runtime. Three ELO buckets exist
(`all` / `diamond` / `mythic`), each with its own model and its own runtime
caches. Deployment target is **Render free tier** with a **Cloudflare
Worker proxy** in front of brawltime to bypass datacenter IP blocking.

---

## 2. Tech stack and important versions

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server-rendered API routes + React client components in one repo |
| Language | TypeScript 5.6, strict | Trusted types end-to-end |
| Runtime | Node.js 22+ (tested on 24) | Native fetch, modern TLS |
| Styling | Tailwind 3.4 | Tokens defined in `tailwind.config.ts` |
| UI | React 19 | Plain components, no UI library |
| Internationalisation | Custom (`lib/i18n.ts` + Context) | Two locales, no extra dep |
| Persistence | None (in-memory caches) | All data fetched on demand from cube/brawlify |
| ML | Hand-rolled Matrix Factorization in TS | ~12k params per bucket, trains in 5 s on CPU |
| Auth | Public JWT from brawltime trpc | No user accounts |
| Deployment | Render free tier (web service) | Sleeps after 15 min idle |
| Reverse proxy | Cloudflare Worker (free) | Bypasses CF bot-blocking on brawltime |

No external database, no Redis, no message queue. Everything is in-process
RAM. Sleep on Render wipes the caches → first request after sleep takes
~30 s to warm back up.

---

## 3. Architecture and data flow

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser (React + Tailwind)                                        │
│   app/draft/page.tsx (state machine: mode → map → draft)           │
│   app/how-it-works/page.tsx (educational, illustrated)             │
│   components/* : ModePicker, MapGrid, BrawlerGrid, BrawlerSlot,    │
│                  BrawlerAvatar, BucketSelector, ViewModeToggle,    │
│                  LangSwitcher, BadgeRow, Logo, AppShell, …         │
└────────────────────────────────────────────────────────────────────┘
                         │ fetch JSON
                         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Next.js API routes (Node, App Router)                             │
│   /api/brawlers       ← getBrawlers() + fire-and-forget warm of    │
│                         all 3 buckets (matchups + baseline)        │
│   /api/maps?ranked    ← getRankedMaps() — 30 maps currently        │
│   /api/modes          ← 6 modes derived from ranked maps           │
│   /api/draft-ai       ← MAIN ENDPOINT. Returns:                    │
│       • perEnemy[]          (top 4 counters per picked enemy)      │
│       • bans[]              (top bans on the map)                  │
│       • recommendations[]   (combined ML score, top 15)            │
│       • topByMap[]          (raw WR on map, top 10)                │
│       • topBySynergy[]      (raw mean WR with allies, top 10)      │
│       • topBySynergyDelta[] (ΔWR vs baseline + hard counters)      │
│       • topByCounter[]      (raw mean WR vs enemies, top 10)       │
│       • topByCounterDelta[] (ΔWR + hard counters)                  │
│       • modelLoaded         (boolean — did the bucket's model      │
│                              cover this specific map?)             │
│   /api/bans           ← exposed for debug; called internally       │
└────────────────────────────────────────────────────────────────────┘
                         │              │
                         ▼              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│  brawltime.ninja Cube    │    │  Brawlify (api.brawlify.com)    │
│  cube.brawltime.ninja    │    │  /v1/brawlers /v1/maps          │
│  /cubejs-api/v1/load     │    │  No auth, browser headers help  │
│                          │    │                                 │
│  Auth: short JWT fetched │    │  Asset CDN: cdn.brawlify.com    │
│  from /api/trpc/auth.    │    │  for portrait + map images      │
│  getToken (no auth on    │    │                                 │
│  that endpoint itself)   │    │                                 │
│                          │    │                                 │
│  ⚠ When running from a   │    │                                 │
│    datacenter IP (Render)│    │                                 │
│    Cloudflare 403s. We   │    │                                 │
│    route through a       │    │                                 │
│    Cloudflare Worker.    │    │                                 │
└──────────────────────────┘    └─────────────────────────────────┘
                ▲
                │ (only when BRAWLTIME_PROXY env var is set)
┌──────────────────────────┐
│  Cloudflare Worker       │
│  worker/worker.js        │
│  /trpc/* → brawltime trpc │
│  /cube/* → brawltime cube │
│  Adds Origin/Referer.    │
│  Strips CF internal hdrs │
│  Runs INSIDE CF network  │
│  ⇒ no bot block          │
└──────────────────────────┘
```

The Worker is the answer to a real problem we hit on Render: the brawltime
auth endpoint returns 403 to anything that *looks* like a server (even with
the right User-Agent and headers). A Cloudflare Worker is treated as
trusted CF infrastructure, so the same call from inside the CF network
goes through.

---

## 4. File tree (annotated)

```
brawlstar/
├── app/                                  # Next.js App Router
│   ├── api/
│   │   ├── bans/route.ts                 # POST {mode,map} → bans
│   │   ├── brawlers/route.ts             # GET — also fires all-bucket warm
│   │   ├── draft-ai/route.ts             # ★ main endpoint, see §10
│   │   ├── maps/route.ts                 # GET ?ranked=true
│   │   └── modes/route.ts                # GET
│   ├── draft/page.tsx                    # ★ 3-step state machine
│   ├── how-it-works/page.tsx             # Illustrated explanations
│   ├── icon.svg                          # Favicon (auto-detected by Next)
│   ├── layout.tsx                        # Wraps with I18nProvider + AppShell
│   ├── page.tsx                          # Just redirects to /draft
│   └── globals.css                       # Color tokens + utility classes
│
├── components/                           # Client-side React components
│   ├── AppShell.tsx                      # Header (logo + nav + lang) + footer
│   ├── BadgeRow.tsx                      # Renders Badge[] from API response
│   ├── BrawlerAvatar.tsx                 # Portrait OR colored-initials fallback
│   ├── BrawlerGrid.tsx                   # Full-screen brawler picker modal
│   ├── BrawlerSlot.tsx                   # Clickable 3v3 slot
│   ├── BucketSelector.tsx                # ELO toggle (All / Diamond+ / Mythic+)
│   ├── I18nProvider.tsx                  # React context for translations
│   ├── LangSwitcher.tsx                  # FR / EN toggle
│   ├── Logo.tsx                          # Inline SVG of the crosshair logo
│   ├── MapButton.tsx                     # Compact "current map" button
│   ├── MapGrid.tsx                       # Step-2 map grid
│   ├── MapPicker.tsx                     # Alternative modal map picker
│   ├── MiniCounter.tsx                   # Mini counter card under enemy slot
│   ├── ModePicker.tsx                    # Step-1 mode picker
│   ├── ViewModeToggle.tsx                # Pure-WR / Hard-counters toggle
│   └── WrBar.tsx                         # Win-rate progress bar
│
├── lib/                                  # Server + shared logic
│   ├── aiModel.ts                        # Loads model-{bucket}.json, scoring
│   ├── aliases.ts                        # Cube name → canonical (renames)
│   ├── bans.ts                           # getBansForMap()
│   ├── baseline.ts                       # Per-brawler global WR (for ΔWR)
│   ├── brawlify.ts                       # getBrawlers() + getMaps() + cache
│   ├── buckets.ts                        # ELO bucket meta
│   ├── cube.ts                           # JWT auth + cubeQuery() + cache
│   ├── hardCounters.ts                   # Curated kit-level matchups
│   ├── i18n.ts                           # Translation dictionary
│   ├── matchups.ts                       # Per-enemy counter + per-ally synergy
│   ├── ranked.ts                         # Filter maps to current ranked rotation
│   ├── removed.ts                        # Brawlers that no longer exist in-game
│   ├── roleBalance.ts                    # Class-based suggestion adjustment
│   └── types.ts                          # Shared TypeScript types
│
├── scripts/                              # CLI utilities, run via tsx
│   ├── extract.ts                        # Cube → data/training/raw-{bucket}.json
│   ├── train.ts                          # raw → data/model-{bucket}.json
│   ├── sanity.ts                         # Print model predictions for review
│   └── collect-battles.ts                # v2 scraper (needs Supercell token)
│
├── worker/
│   └── worker.js                         # Cloudflare Worker proxy code
│
├── data/                                 # ML artefacts
│   ├── training/                         # GITIGNORED (large, regeneratable)
│   │   ├── raw-all.json                  # ~25 MB
│   │   ├── raw-diamond.json
│   │   └── raw-mythic.json
│   ├── model-all.json                    # Committed (~150 KB each)
│   ├── model-diamond.json
│   └── model-mythic.json
│
├── .env.local                            # GITIGNORED — BRAWLSTARS_TOKEN here
├── .env.example                          # (could add) — env var template
├── .gitignore
├── HANDOVER.md                           # ← you are here
├── README.md                             # User-facing docs
├── next-env.d.ts                         # Auto-managed by Next
├── next.config.js                        # Image domains, etc.
├── package.json                          # npm scripts, deps
├── tailwind.config.ts                    # Theme tokens
└── tsconfig.json
```

---

## 5. Core libraries in depth

### `lib/cube.ts` — brawltime client

- Single export: `cubeQuery<T>(query: CubeQuery): Promise<T[]>`
- Token URL: `https://brawltime.ninja/api/trpc/auth.getToken`
  - The response shape **changed mid-project**:
    - Old: `{ result: { data: { json: "eyJ...token" } } }`
    - New: `{ result: { data: { json: { token: "eyJ...", expiresAt: 1780... } } } }`
  - Handler accepts both shapes.
- Cube URL: `https://cube.brawltime.ninja/cubejs-api/v1/load`
- **If `BRAWLTIME_PROXY` env var is set**, both URLs are rewritten to
  hit the Cloudflare Worker (`${PROXY}/trpc/auth.getToken` and
  `${PROXY}/cube/cubejs-api/v1/load`). This is required on Render — see §13.
- All outbound requests include browser-shaped headers (Chrome UA,
  `Origin: https://brawltime.ninja`, `Referer`, etc.). Without these
  the cube returns 403 from any non-residential IP.
- Cube returns `{"error": "Continue wait"}` while a query is computing;
  we poll up to 20 times with 1.2 s delays.
- In-memory response cache, **30-minute TTL**, keyed by serialised query.
- In-flight deduplication: two identical concurrent queries share a
  single fetch.
- Token cache: refreshed when `expiresAt − 60 s` has passed.

### `lib/brawlify.ts` — brawlify client

- `getBrawlers()` and `getMaps()`, 6-hour cache each.
- Filters removed brawlers (`isRemoved()` from `lib/removed.ts`).
- Map name normalisation: brawlify spells some maps differently from
  brawltime ("Belles Rock" vs "Belle's Rock", "Out In The Open" vs
  "Out in the Open"). We keep `name` (brawlify display) and `cubeName`
  (cube spelling) on the `GameMap` type — see §6.
- Multiple Brawlify list entries per map (different rotations); we
  prefer the non-disabled entry.

### `lib/ranked.ts` — current ranked rotation

- `getRankedMaps()` queries the cube with `powerplay=1`, season filter
  `>= SEASON_FROM`, and `picks >= 50_000`. Returns ~30 maps across
  6 modes today (Bounty, Brawl Ball, Gem Grab, Heist, Hot Zone,
  Knockout). Brawl Hockey is *not* a ranked mode despite appearing in
  the cube historically.
- `SEASON_FROM = "2026-03-30"` — must be kept in sync with
  `scripts/extract.ts`.

### `lib/matchups.ts` — per-enemy + per-ally cube data

Three exports the API uses:
- `warmGlobal(trophyMin)` — fire-and-forget bulk fetch of the top 80
  brawlers' matchup data for this bucket. Idempotent within 30 min.
- `warmMap(mode, map, trophyMin)` — bulk fetch of the top 20 brawlers
  on this specific map.
- `getCountersForEnemy(enemy, trophyMin)` — single-enemy counter list.
  Hits cache first; if missing, waits for any in-flight warm; if still
  missing, issues a single-enemy cube query.
- `getSynergyForAlly(ally, trophyMin)` — equivalent for the
  brawlerAllies cube.

All cache entries are keyed by `${trophyKey}:${enemyOrAlly}` so each ELO
bucket has its own warm and cache. Aliases (e.g. GLOWBERT → GLOWY) are
expanded both at the query level (cube filter includes both names) and
in the merge step (results are summed by canonical name).

Removed brawlers are filtered out of results.

### `lib/baseline.ts` — per-brawler global WR

- `getBaselineWRs(trophyMin)` queries the `brawlerEnemies` cube with no
  enemy filter, just `picks >= 100_000`, returning each brawler's
  aggregate WR. This is the denominator for ΔWR (= "how much this
  brawler over- or under-performs vs its own baseline").
- Cached 30 min per bucket.
- Filters removed brawlers.

### `lib/bans.ts` — getBansForMap

- Returns `BanRow[]` with `{brawler, winRate, picks, pickShare, banScore}`.
- `banScore = max(0, winRate − 0.5) × √picks` (strength × popularity).
- Filters removed brawlers.

### `lib/aliases.ts` — brawler renames

- `BRAWLER_ALIASES`: cube name → canonical name. Currently:
  - `COLONEL RUFFS → RUFFS`
  - `GLOWBERT → GLOWY`
- `expandAliases(canonical)` returns `[canonical, ...alias-old-names]`
  so cube queries cover both.
- `canonical(name)` is the inverse — collapse any name to its
  canonical form.

### `lib/removed.ts` — brawlers no longer in game

- `REMOVED_BRAWLERS` Set, currently `{ "BUZZ LIGHTYEAR" }`.
- `isRemoved(name)` helper.
- Applied at every source: `matchups.ts`, `bans.ts`, `baseline.ts`,
  `brawlify.ts`, `aiModel.ts`.

### `lib/buckets.ts` — ELO buckets

```ts
type Bucket = "all" | "diamond" | "mythic";

BUCKET_META = {
  all:     { trophyMin: null, ... },
  diamond: { trophyMin: 13,   ... },  // ≈ 1300+ trophies
  mythic:  { trophyMin: 18,   ... },  // ≈ 1800+ trophies
};
```

The `trophyRange` cube dimension is in 100-trophy units (so 13 = 1300+).
Each bucket has its own `model-{bucket}.json`, its own matchups cache,
its own baseline cache.

### `lib/hardCounters.ts` — curated kit interactions

- ~36 rules that the ML model can't learn from pairwise WRs (kit
  interactions like Edgar dive on snipers, Colette anti-tank, Sandy CC).
- Each rule: `{ counter, vs, bonus, reasonKey }`. Bonuses are small
  (0.03 to 0.05 — i.e. 3-5 percentage points) — they break ties, they
  don't rewrite the ranking.
- Used **only** in the ΔWR variant ("Hard counters / synergies" toggle),
  not in the raw WR variant.
- Surfaced via a `hardCounter` badge with a localised reason
  (`hc.diveSniper`, `hc.tankMelter`, etc.).
- Maintenance: review every 2 months or after a Supercell balance patch.

### `lib/roleBalance.ts` — class balance

- Uses `className` from Brawlify (`"Tank"`, `"Marksman"`, etc.).
- `buildClassBalance(allies, brawlers)` returns a map of
  `{class → penalty}` for over-represented classes.
- `classBalanceBonus(candidateClass, balanceMap, picksCount)` returns
  `{bonus, missingRole}` to add to a candidate's score.
- Defaults: `+0.04` for a class missing from the team, `−0.02` for a
  class with 2+ allies already.
- Applied only on the Combined IA column. Surfaces as a `missingRole`
  badge when relevant.

### `lib/aiModel.ts` — Matrix Factorization runtime

Model artefact: `data/model-{bucket}.json`. Contains:
- `brawlers: string[]` — index → cube name
- `maps: string[]` — index → "modeCube::mapName"
- `O, D, S: number[]` — flattened B×16 embedding matrices
- `bias: number[]` — length B
- `mapB: number[]` — flattened M×B

Inference for candidate X in context (map M, allies A, enemies E):
```
solo     = sigmoid( mapB[M,X] + bias[X] )

synergy  = mean over allies a:
             sigmoid( bias[X] + S[X] · S[a] )       ← no map term!

matchup  = mean over enemies e:
             sigmoid( (bias[X] − bias[e])
                    +  O[X]·D[e] − O[e]·D[X] )      ← no map term!

score    = 0.4 × solo + 0.3 × synergy + 0.3 × matchup
```

The synergy and matchup formulas **deliberately dropped the map term** —
otherwise `mapB[M,X]` dominated numerically and the columns barely
changed with picks. The map term still flows into the *combined* score
via `solo`. See decision log §16 for the history.

Filters removed brawlers from the candidate loop.

---

## 6. The shared types (`lib/types.ts`)

Key types — pay attention to these because every API call returns them.

```ts
export type Brawler = {
  id: number;
  name: string;                  // Brawlify display, e.g. "Ruffs"
  cubeName: string;              // UPPERCASE, e.g. "RUFFS"
  rarity: string;
  className?: string;            // "Tank", "Marksman", …
  imageUrl: string;
};

export type GameMap = {
  id: number;
  name: string;                  // Brawlify display, e.g. "Belles Rock"
  cubeName: string;              // Cube spelling, e.g. "Belle's Rock"
  hash: string;
  modeName: string;              // "Gem Grab"
  modeCube: string;              // "gemGrab" — camelCase for cube filter
  modeColor: string;
  modeImageUrl: string;
  imageUrl: string;
};

export type Badge = {
  kind: "topCounter" | "topMap" | "topSynergy"
      | "missingRole" | "hardCounter" | "metaPick";
  value?: string | number;
  // For topCounter:  value = "12|PIPER"   →  "+12 pp vs Piper"
  // For hardCounter: value = "diveSniper" →  i18n key "hc.diveSniper"
};

export type ScoredCandidate = {
  brawler: string;               // cube name
  solo: number;                  // 0..1
  synergy: number | null;
  matchup: number | null;
  delta?: number | null;         // ΔWR variant only
  score: number;                 // the metric this column is sorted by
  source: "ml" | "heuristic";
  badges?: Badge[];
};
```

Whenever you call `/api/draft-ai`, the `recommendations[]`,
`topByMap[]`, `topBySynergy[]`, `topBySynergyDelta[]`, `topByCounter[]`,
and `topByCounterDelta[]` arrays are all `ScoredCandidate[]`.

---

## 7. The 4 columns + ΔWR variant

### Raw mode (`viewMode === "raw"`, default)

| Column | Data source | Sort key |
|---|---|---|
| **Combined IA** | ML model `scoreCandidates()` | `score` (combined model output) |
| **Best on map** | `bans` (raw WR on map) | `solo` |
| **Ally synergy** | Cube `brawlerAllies` per ally, mean across allies | `synergy` |
| **Enemy counters** | Cube `brawlerEnemies` per enemy, mean across enemies | `matchup` |

In raw mode the user sees absolute WRs. Meta brawlers (Damian, Glowy,
Sirius, Najia) sit at the top of synergy and counter columns because
their global baseline is high — they're good against everyone.

### Delta mode (`viewMode === "delta"`, "Hard counters / synergies")

| Column | Data source | Sort key |
|---|---|---|
| **Combined IA** | Same as raw | `score` |
| **Best on map** | Same as raw | `solo` |
| **Ally synergy** | `synergy − baseline(X)` for each ally, mean | `delta` |
| **Enemy counters** | `matchup − baseline(X)` + hard-counter bonus | `delta` |

In delta mode the metric is "above this brawler's own baseline". A
brawler with 50 % global WR but 65 % vs Edgar shows +15 pp — a real
specific counter, not just a meta pick. Hard counter rules add a small
extra bonus when applicable.

### The toggle

`components/ViewModeToggle.tsx`. Two buttons: **Winrate pure** /
**Hard counters / synergies**. Default is "raw" (Winrate pure). State
lives in `app/draft/page.tsx`.

---

## 8. The badges system

Generated server-side in `app/api/draft-ai/route.ts` (`buildBadges()`).
Rendered client-side by `components/BadgeRow.tsx` with localised text.

| Kind | When emitted | Visual tone |
|---|---|---|
| `topCounter` | ΔWR ≥ 3 pp in counter column. Value = `"<pp>"` or `"<pp>\|<ENEMY>"` to highlight the specific enemy | red |
| `topSynergy` | Same idea for synergy column | green |
| `topMap` | On Map column when raw WR ≥ 60 % | yellow (accent) |
| `missingRole` | Combined column when the candidate's class is absent from the ally team | blue |
| `hardCounter` | When a `hardCounters.ts` rule applies. Value = reason key (`diveSniper`, `tankMelter`, etc.) | red |
| `metaPick` | Combined column when baseline WR ≥ 65 % | grey |

Add new badge kinds by:
1. Extending `Badge["kind"]` in `lib/types.ts`
2. Adding tone in `components/BadgeRow.tsx`
3. Adding i18n strings (`badge.<kind>`)
4. Emitting from `buildBadges()` in the API route

---

## 9. i18n

- Two locales: `fr` (default), `en`
- Dictionary: `lib/i18n.ts` — flat object, 100+ keys
- Provider: `components/I18nProvider.tsx` — persists choice to
  `localStorage` under key `brawlpick.locale`
- Hook: `useI18n()` returns `{ locale, setLocale, t }`
- Switcher: `components/LangSwitcher.tsx` in the header

When a translation contains a placeholder we use a `{n}` token and
substitute client-side (`text.replace("{n}", value)`). Keep it simple —
no plural rules, no date formatting.

Adding a new string:
1. Add `"namespace.key": { fr: "...", en: "..." }` to `STRINGS`
2. Use `t("namespace.key")` in any client component (must have
   `"use client"`)
3. TypeScript will complain at the call site if the key doesn't exist

Server-rendered metadata (`title`, `description` in `app/layout.tsx`) is
not translated — it's static.

---

## 10. The `/api/draft-ai` endpoint — what it does

This is the workhorse. Reading `app/api/draft-ai/route.ts` end-to-end is
worth 10 minutes — here's a summary.

Request body:
```ts
{
  mode: string;                  // e.g. "gemGrab"
  map: string;                   // CUBE spelling, e.g. "Hard Rock Mine"
  enemies?: string[];            // cube names (UPPERCASE)
  allies?: string[];             // cube names
  bucket?: "all" | "diamond" | "mythic";   // default "all"
}
```

Step-by-step:
1. Parse, normalise (uppercase), build `excludedSet` (= enemies ∪ allies).
2. **Fire-and-forget warm**: `warmGlobal(trophyMin)` and
   `warmMap(mode, map, trophyMin)`. These return immediately; their
   results populate the cache for future hits.
3. **Kick off six tasks in parallel**:
   - Per-enemy counter lists (`getCountersForEnemy` × each enemy)
   - Per-ally synergy lists (`getSynergyForAlly` × each ally)
   - Bans on the map (`getBansForMap`)
   - Baseline WRs (`getBaselineWRs`)
   - Brawler list (`getBrawlers`) — needed for class info
   - ML model output (`getModel(bucket).scoreCandidates(...)`)
4. Build the response:
   - `perEnemy` = top 4 counters per picked enemy
   - `topByCounter` / `topByCounterDelta` = `aggregatePartnerLists()` →
     intersection-mean of per-enemy lists. Delta variant adds hard
     counter bonuses + ΔWR.
   - `topBySynergy` / `topBySynergyDelta` = same logic on ally lists
   - `topByMap` = bans sorted by raw WR
   - `recommendations` = ML output with role-balance bonus + badges
5. Generate badges for every candidate in every list via `buildBadges()`.

The whole thing typically completes in 50-200 ms when all caches are
warm. First hit on a cold bucket: 15-40 s.

---

## 11. ELO buckets — three of everything

Bucket switching is the most likely source of subtle bugs. Mental model:
**each bucket is a completely separate universe** of cached data and
trained model.

| Resource | All bucket | Diamond bucket | Mythic bucket |
|---|---|---|---|
| Trophy filter | none | `trophyRange >= 13` | `trophyRange >= 18` |
| Training data | `data/training/raw-all.json` | `raw-diamond.json` | `raw-mythic.json` |
| Trained model | `data/model-all.json` | `model-diamond.json` | `model-mythic.json` |
| Matchups cache | keyed `all:<name>` | keyed `13:<name>` | keyed `18:<name>` |
| Baseline cache | keyed `"all"` | keyed `"13"` | keyed `"18"` |
| Map warm flag | keyed `all::<mode>::<map>` | keyed `13::<mode>::<map>` | keyed `18::<mode>::<map>` |

When the user toggles the bucket, the page's `useEffect` (with `bucket`
in deps) re-fires the request. The server hits the new bucket's caches,
which are likely cold → slow first hit (mitigated by pre-warming on
`/api/brawlers`, see §15).

The loading overlay in the recommendations panel is intentionally very
visible during this transition because we received feedback that users
thought "nothing happened" when clicking Diamond+.

---

## 12. The ML pipeline (offline)

Three scripts, run via tsx, set `BUCKET` env var (use `cross-env` on
Windows). The `npm run ai:refresh:all` script chains all three buckets.

### `scripts/extract.ts`

For each ranked map, for each of three cubes (`map`, `brawlerAllies`,
`brawlerEnemies`), query and aggregate into one JSON file per bucket.

- `MIN_PICKS_SOLO = 200` — drop rare brawlers on a map
- `MIN_PICKS_PAIR = 500` — drop rare pairings
- `SEASON_FROM = "2026-03-30"` — last ~5 seasons
- Concurrency 4 (cube backend is the bottleneck)
- Aliases are applied: `aggregate()` sums picks and weight-averages WR

Output: `data/training/raw-{bucket}.json` (~25 MB each). Gitignored.

### `scripts/train.ts`

Trains the Matrix Factorization model on the extracted data.

- Embedding dim: 16
- Parameters: O (B×16), D (B×16), S (B×16), bias (B), mapB (M×B) ≈ 12 k
- 80 epochs, momentum SGD, lr 0.05 with 0.95 decay, momentum 0.85, L2 1e-5
- Sample weights = √picks, then capped at p95 and normalised so most
  weights are ≈ 1. **This normalisation is critical** — without it
  gradients explode and the model never learns (we hit this and the
  first training was producing MAE 49 %).
- 90 / 10 train / holdout split
- Output: `data/model-{bucket}.json` — committed to git (small)

Final metrics:
- `all`: ~150 k samples, test MAE ~6.9 %
- `diamond`: ~65 k samples, test MAE ~4.1 %
- `mythic`: ~14 k samples, test MAE ~3.9 %

Higher buckets have less data but more consistent behaviour → better MAE.

### `scripts/sanity.ts`

Loads each model and prints:
- Top picks vs a few well-known enemies
- Top picks per map probe
- Picks on a specific map vs a 3-enemy team
- Embedding neighbours (cosine similarity in S and O space) — should
  cluster classes (assassins together, snipers together) implicitly

### `scripts/collect-battles.ts`

v2 placeholder. Scrapes raw battles via the official Supercell API
(needs `BRAWLSTARS_TOKEN` in `.env.local`, IP-locked token from
[developer.brawlstars.com](https://developer.brawlstars.com)). Output:
`data/battles/raw.jsonl`. The supervised v2 model isn't implemented yet.

---

## 13. The Cloudflare Worker proxy

### Why

Running on Render (datacenter IP), `brawltime.ninja/api/trpc/auth.getToken`
returns 403 even with perfect headers. Cloudflare's bot detection
fingerprints the TLS handshake and IP reputation. A Cloudflare Worker
runs inside the CF network and is treated as trusted, so the same call
succeeds.

### Code: `worker/worker.js`

Single-file Worker. Routes:
- `POST /trpc/<path>` → `https://brawltime.ninja/api/trpc/<path>`
- `POST /cube/<path>` → `https://cube.brawltime.ninja/<path>`

Adds `Origin` + `Referer` headers, strips CF-internal headers
(`cf-connecting-ip`, etc.), passes through the body as `arrayBuffer`.

### Deploying the Worker

1. Cloudflare dashboard → Compute → Workers & Pages → Create Worker
2. Paste `worker/worker.js`
3. Settings → Domains → enable the `workers.dev` subdomain
4. Copy the URL: `https://<name>.<account>.workers.dev`

### Wiring into the app

Set `BRAWLTIME_PROXY` env var on Render. `lib/cube.ts` automatically
rewrites both URLs through the proxy when this env var is present.

Locally we don't set this env var → calls go direct to brawltime,
which works from a residential IP.

---

## 14. Deployment on Render

Free tier web service. Free tier has limitations to remember:
- Instance sleeps after 15 min of no traffic
- First request after sleep: ~30 s to wake + warm
- 750 instance-hours / month (= 31 days continuous, fine)
- No request timeout that bites us

Render config:
- **Runtime**: Node
- **Build command**: `npm install; npm run build`
- **Start command**: `npm run start`
- **Region**: Frankfurt (lowest latency to brawltime, less bot-blocking)
- **Env vars**:
  - `BRAWLTIME_PROXY=https://<your-worker>.workers.dev`
  - (Optional) `BRAWLSTARS_TOKEN=...` — only if running the v2 scraper
    inside the deployed service, which we don't

API routes must be `export const dynamic = "force-dynamic";` — otherwise
Next tries to pre-render them at build time, hits the cube, and fails
the build. We learned this the hard way.

Render auto-deploys on git push to `main`.

---

## 15. Pre-warming on first request

The `/api/brawlers` GET route fires the following in the background
(fire-and-forget) for every bucket:
- `warmGlobal(trophyMin)` — kicks off matchups warm
- `getBaselineWRs(trophyMin)` — populates baseline cache

The browser fetches `/api/brawlers` very early in the page lifecycle
(during the `useEffect` in `app/draft/page.tsx`). By the time the user
finishes picking a map and brawlers and switches the ELO bucket, the
cube data is usually warm.

This costs ~3× the initial cube load but spreads it across the user's
think-time. The cube backend caches identical queries, so the
incremental cost on subsequent visitors is minimal.

---

## 16. Decision log (chronological-ish)

The most important context to know about *why* the code is the way it is.

1. **Why a custom cube proxy and not a generic API client?**
   We need JWT renewal + "Continue wait" polling + dedupe + cache, and
   the cubejs-client package is overkill for one query type.

2. **Why Matrix Factorization and not deep learning?**
   The cube exposes only pairwise aggregates (no raw battles). MF with
   embeddings is the natural fit for that data shape; deep learning
   would overfit and not give us more signal. Embedding neighbours
   already cluster brawler classes (verified in `sanity.ts`).

3. **Why drop the map term from synergy/matchup at inference time?**
   The user observed that picking 3 tanks vs 3 ranges gave the same
   counter column. Investigation: `mapBase[m, X]` dominated numerically
   in `sigmoid(mapBase + ... + tinyDifferential)`, squashing the
   matchup signal. Removing the map term makes the synergy/counter
   columns actually respond to picks. The map term still flows into
   the *combined* score via `solo`.

4. **Why cube data instead of model output for synergy/counter columns?**
   The user noticed the AI counter column showed different brawlers than
   the per-enemy counter cards under each enemy slot. Cause: the per-enemy
   cards come from raw cube data, the AI counter column came from model
   embeddings. They diverged because the model smooths. To make the two
   views consistent, the counter/synergy columns now use the same raw cube
   aggregates (mean across enemies/allies). The model is only used for the
   Combined IA column.

5. **Why ΔWR variant?**
   Even after #4, meta brawlers (Damian, Sirius, Glowy, etc.) dominated
   every counter list because they have high baseline WR globally.
   The Δ variant subtracts each brawler's own baseline, surfacing
   *specific* counters instead of universal meta picks. Gemini
   independently suggested this; we converged.

6. **Why hard counters?**
   Kit-level interactions (Sandy super disabling auto-aim, Edgar dive
   on snipers) aren't captured by the model because they're too niche
   to show up in pairwise WRs above the noise. A small curated table
   adds these as bonuses to ΔWR. Bonuses are intentionally small
   (3-5 pp) — they break ties, they don't rewrite rankings.

7. **Why role balance?**
   The model has no notion of team composition — three tanks would
   rank tank-similar brawlers similarly. The role balance heuristic
   penalises over-represented classes (-2 pp) and rewards missing
   classes (+4 pp). Applied only on Combined IA.

8. **Why two model name spaces (cube name vs canonical)?**
   Brawltime keeps history under old brawler names (GLOWBERT) after
   Supercell renames (GLOWY). We canonicalise everywhere and expand
   aliases at cube query time so both names contribute to the canonical
   stats. New rename? Add a line in `lib/aliases.ts` and re-train.

9. **Why two map name fields?**
   Brawlify uses "Out In The Open"; cube uses "Out in the Open"; cube
   also uses "Belle's Rock" while Brawlify says "Belles Rock". We
   fuzzy-match (lowercase + strip apostrophes) to merge them, and store
   the cube spelling in `cubeName` so queries hit. Display uses `name`.

10. **Why a Cloudflare Worker?**
    See §13. Render's IP is blocked by brawltime's Cloudflare.

11. **Why no real-time multiplayer / live API integration?**
    Out of scope. The Supercell API is read-only and rate-limited;
    we don't need it for draft assistance.

12. **Why no user accounts?**
    Same — out of scope. The app is a single-page tool.

---

## 17. Maintenance checklist

### Monthly (or after each Supercell balance patch)

- [ ] Update `SEASON_FROM` in `scripts/extract.ts` AND `lib/ranked.ts`
      to ~10 weeks ago
- [ ] `npm run ai:refresh:all` — re-extract + re-train all 3 buckets
- [ ] `npm run ai:sanity` — visual check that the new model makes sense
- [ ] Commit `data/model-*.json`
- [ ] Review `lib/hardCounters.ts` — any kit-level interactions to add?
- [ ] Push

### When Supercell renames a brawler

- [ ] Add an entry in `lib/aliases.ts`:
  ```ts
  BRAWLER_ALIASES["OLD_NAME"] = "NEW_NAME";
  ```
- [ ] If the rename was recent, the cube has both names. The alias
      expansion in `expandAliases()` ensures both are queried.
- [ ] Re-train at next scheduled refresh.

### When Supercell removes a brawler

- [ ] Add the cube name to `REMOVED_BRAWLERS` in `lib/removed.ts`
- [ ] No retrain needed — the runtime filter handles it.

### When Supercell adds a new mode to ranked

- [ ] `getRankedMaps()` should pick it up automatically (it queries
      cube `powerplay=1` maps).
- [ ] Run a fresh extraction to include the new mode in the training
      data.

### When the cube auth response shape changes (it happened once)

- [ ] Update `getToken()` in `lib/cube.ts`. The current code accepts
      both old (JWT-as-string) and new (object `{token, expiresAt}`)
      shapes.

### Render goes to sleep / first hit slow

- [ ] Expected. Free tier sleeps after 15 min of no traffic.
- [ ] Optional: configure UptimeRobot (free) to ping the URL every
      14 min. Uses Render free hours (750/month is plenty).

---

## 18. Known issues and limitations

### Data quality

- **Pairwise only**: cube doesn't expose 3v3 trio data. The model
  approximates trio composition by averaging pairs. Trio emergent
  effects (e.g. a specific trio that snowballs) aren't captured.
- **Map term dropped at inference**: synergy/counter columns ignore
  the specific map's effect on each candidate. The map influence still
  flows into Combined IA via `solo`.
- **Renamed brawlers' historical data**: the alias expansion captures
  both names at query time, but if a rename happened mid-season the
  pairwise WRs might be split awkwardly across both names. Brawltime
  appears to use the new name going forward.

### Model

- **Test MAE 4-7 %** — random baseline ≈ 13 %, simple weighted average
  ≈ 9 %. Solid but not perfect; about 1-2 pp of expected error per
  predicted WR.
- **Fresh brawlers**: a brawler released in the last 1-2 weeks has too
  few picks (filter is `picks >= 1000`) to appear in matchup data.
  They won't show up in counter columns until they accumulate data.
- **Map term simplification**: the synergy and matchup inference does
  not condition on the map. Some matchups *are* map-specific (Mortis
  shines on open maps, struggles on walled ones); the model can't
  express that today.

### Runtime

- **No CDN cache for API responses** — every request hits Render's
  Node process. With Render free tier and the 30-min in-memory cache,
  this is fine for small audiences.
- **No graceful degradation if brawltime goes down**: the app errors
  out. We could cache last-good responses on disk; we don't.
- **Cube proxy adds 1 hop**: ~30-100 ms extra latency per cube call
  via the Worker. Negligible.

### UX

- **Cold bucket switch is 15-40 s on Render** — visible loading
  overlay tells the user this is happening, but it's still annoying.
  Mitigation: pre-warm fires for all 3 buckets on `/api/brawlers`.
- **No mobile-specific layout tuning** — Tailwind responsive classes
  are used but no real testing on small screens.

---

## 19. v2 roadmap (raw-battles supervised model)

If/when the user wants to go beyond pairwise aggregates:

1. Use `scripts/collect-battles.ts` to scrape battles via the Supercell
   API. With a fresh token from
   [developer.brawlstars.com](https://developer.brawlstars.com)
   (IP-locked), one can collect ~10-50 k ranked battles in a few hours.
   Output: `data/battles/raw.jsonl` — one battle per line.
2. Each battle has: `(map, mode, team1: 3 brawlers, team2: 3 brawlers, winner)`.
3. Train a supervised model:
   - **Factorization Machine** with brawler + map embeddings,
     team pooling (sum of S vectors per team), `P(team1 wins | …)`
   - Or a small **MLP** on hand-crafted features (solo, synergy mean,
     matchup mean, role distribution, map class) + binary cross-entropy
4. New scoring: for a candidate X, compute
   `P(team_with_X wins | map, team_without_X + X, enemies)` directly.
5. Add explicit role-distribution features so the model learns "you
   need a tank + a control + a dps" automatically.
6. Target metric: +1 to 2 pp improvement on a held-out battles set.

The scraper already exists; the supervised model + training script
don't. Estimated effort: 1-2 days of focused work.

---

## 20. Cube schema reference (the bits we actually use)

From the `meta` endpoint (`/cubejs-api/v1/meta`). Only the most-used
fields shown.

```
cube: brawler
  measures: picks, pickRate, useRate, users, timestamp, day
  dimensions: season, timestamp, day, player, brawler, brawlerId

cube: battle
  measures: picks, pickRate, useRate, users, timestamp, day, winRate
  dimensions: season, timestamp, day, player, brawler, brawlerId

cube: map                  ← solo per-map stats, also used for bans
  measures: mode, map, eventId, timestamp, trophyChange, winRate, picks
  dimensions: brawler, season, trophyRange, mode, map, powerplay

cube: brawlerAllies        ← synergy column
  measures: winRate, picks
  dimensions: brawler, season, trophyRange, brawlerId, ally, allyId

cube: brawlerEnemies       ← counter column + baseline
  measures: winRate, picks
  dimensions: brawler, season, trophyRange, brawlerId, enemy, enemyId

cube: gadget, starpower, gear ← not used (could be future feature)
cube: survey                  ← community polls, not used
```

Important conventions:
- All dimension filters expect string values (e.g. `mode: "gemGrab"`,
  `powerplay: "1"`).
- `winRate_measure` is in [0, 1] (not percentage).
- `trophyRange` is an integer where 1 unit = 100 trophies.
- `season` is an ISO-style datetime string of the season-end date.
  Use `gte "2026-03-30"` for "last N seasons" filtering.

---

## 21. Quick orientation for the next contributor

If you're reading this for the first time:

1. **Skim `app/draft/page.tsx`** — that's the entire UI state machine.
2. **Read `app/api/draft-ai/route.ts`** — that's where everything
   converges. It calls the libs in `lib/*.ts` and returns the structured
   payload the page renders.
3. **Read `lib/aiModel.ts`** to understand the ML model at inference.
4. **Read `lib/matchups.ts` + `lib/baseline.ts`** to understand the
   cube data flow.
5. **Read this file's §16 (Decision log)** to understand *why* the code
   looks the way it does.
6. Run `npm run dev`, open `/draft`, switch ELO buckets, toggle "Pure
   winrate" vs "Hard counters / synergies". Inspect Network → `/api/draft-ai`.

When implementing a new feature, the playbook is usually:
- Add the data fetch to a new or existing `lib/*.ts` helper (cached)
- Surface it in `/api/draft-ai/route.ts`
- Type the response in `lib/types.ts`
- Render it in the appropriate component
- Add i18n strings
- Build + smoke test
