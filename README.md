# BrawlPick

**Draft assistant for Brawl Stars Ranked.** Pick your mode and map, fill in the enemy and ally picks as they come in, and get in real time:

- the top **bans** for the map
- the specific **counters** for each enemy that's been picked
- **4 columns of suggestions**: AI combined score, best on the map, best synergies with your allies, best counters against the enemies
- all of it recomputed against your **ELO bracket** (All / Diamond+ / Mythic+)

Recommendations come from a Matrix Factorization model trained on ~150 000 (brawler, brawler, map) pairs from the [brawltime.ninja](https://brawltime.ninja) backend, filtered to the last 5 seasons so the meta stays current.

---

## Table of contents

1. [How to use the app](#1-how-to-use-the-app)
2. [Install and run](#2-install-and-run)
3. [Pushing to GitHub safely](#3-pushing-to-github-safely)
4. [Project architecture](#4-project-architecture)
5. [The ML model in detail](#5-the-ml-model-in-detail)
6. [API endpoints](#6-api-endpoints)
7. [Re-training](#7-re-training)
8. [Known limitations](#8-known-limitations)
9. [v2 roadmap](#9-v2-roadmap)

---

## 1. How to use the app

The app has a single URL: **`/draft`** (the root `/` redirects). The flow happens in 3 steps within the same page.

### Step 1 — Pick the mode

You land on a grid of 6-7 large cards: Brawl Ball, Gem Grab, Knockout, Heist, Hot Zone, Bounty… Click the mode you're about to play.

### Step 2 — Pick the map

Grid of the maps currently in ranked rotation for that mode (4 to 11 maps depending on the mode). Clicking a card takes you to the draft screen. A "← Change mode" button is available.

### Step 3 — The draft view

Everything lives in a single window, organized like this:

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Mode  ← Change map  [ELO: All|Diamond+|Mythic+]      MAP+MODE │
├──────────────────────────────────────────────┬──────────────────┤
│ ENEMY TEAM             [3 slots]              │   TOP BANS       │
│   under each picked enemy:                    │  ranked list of  │
│   4 dedicated counters (portrait + WR%)       │  brawlers to ban │
│                                                │  in priority     │
│ YOUR TEAM              [3 slots]              │                  │
│   clickable slots, optional                    │                  │
│                                                │                  │
│ AI SUGGESTIONS — 4 columns:                   │                  │
│   1. Combined AI   2. Best on map             │                  │
│   3. Ally synergy  4. Enemy counters          │                  │
└──────────────────────────────────────────────┴──────────────────┘
```

**How it updates:** every time you click a slot and pick a brawler, the whole page recomputes (counters, bans, suggestions). Requests are deduplicated and cached for 30 min server-side, so once you've played around a bit everything is instant.

### The 4 suggestion columns

| Column | What it ranks | When to use |
|---|---|---|
| **Combined AI** | Weighted score: 0.4 × solo + 0.3 × synergy + 0.3 × vs enemies | The "right" overall pick all things considered |
| **Best on map** | Raw WR on this map (ignores allies / enemies) | If you just want a reliable brawler on this map |
| **Ally synergy** | Average WR when picked alongside your allies | Activates once you have an ally picked. To round out your comp |
| **Enemy counters** | Average WR against the picked enemies | Activates once you have an enemy picked. To punish an enemy pick |

Numbers are out of 100 (50 = neutral, 60+ = strong, 70+ = very strong).

### The ELO selector

In the header, the **All / Diamond+ / Mythic+** toggle filters the entire pipeline (counters, bans, AI model) to the chosen ELO bracket. The recommendations differ meaningfully: the low-ELO meta favors versatile brawlers, the high-ELO meta favors high skill-ceiling brawlers (Mortis, Edgar…). Pick the one matching your play level.

| Bucket | Approximate trophy range | Typical ranked tier |
|---|---|---|
| **All** | all | all players (default) |
| **Diamond+** | ≥ 1 300 trophies | Diamond and above |
| **Mythic+** | ≥ 1 800 trophies | Mythic and above |

---

## 2. Install and run

### Requirements

- **Node.js 22+** (tested on Node 24)

### First launch

```bash
git clone <your-fork>
cd brawlstar
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On the first hit, the server pre-warms the ~80 most-played matchups in the background (~15 s). While that runs you can already click — your request piggybacks on the warm. After that everything is sub-100 ms for 30 min (cube cache).

### If port 3000 is busy

```bash
taskkill /F /IM node.exe       # Windows
pkill -f "next dev"            # macOS / Linux
```

### Brawl Stars token (optional)

Useful **only if you want to scrape raw battles** via the v2 script `npm run ai:collect`. To use the app itself, no token is needed.

1. Create a free token at [developer.brawlstars.com](https://developer.brawlstars.com) (IP-locked)
2. Create `.env.local` at the project root:
   ```
   BRAWLSTARS_TOKEN=eyJhbGciOiJIUz...your-token
   ```
3. The file is in `.gitignore` — it will never be committed.

### Production build

```bash
npm run build
npm start
```

---

## 3. Pushing to GitHub safely

### What's already gitignored

The repo's `.gitignore` covers everything that must not be public:

```
node_modules         # dependencies
.next, out           # Next.js build artifacts
.env, .env.*         # ★ ALL env files, including .env.local with the token
.claude/             # your local Claude Code permissions
.idea/, .vscode/     # IDE configs
*.log                # logs (dev.log, train.log, extract.log)
data/training/       # cube extracts of ~25 MB each, recreatable via ai:extract
data/battles/        # raw battles from the v2 scraper
```

### What IS committed (and that's fine)

- `data/model-*.json` — the trained models (~150 KB each). This way a fresh clone has a working model right away without having to run `ai:refresh:all`. If you'd rather force a retrain, uncomment the `data/model-*.json` line in `.gitignore`.

### Check before you push

```bash
git init                         # if not already done
git add .
git status                       # make sure .env.local is NOT listed
grep -rE "eyJ[A-Za-z0-9_-]{20,}\." . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git || echo "no JWT found in tracked files"
```

If a secret ever does get committed by accident, **rotate your token immediately** at developer.brawlstars.com — git history keeps everything, the only real remedy is to rotate.

### Residual risk

The app sends requests to `brawltime.ninja` to fetch a short-lived JWT that queries their Cube.js. That's **their** public infra, not your credentials. If their endpoint changed tomorrow the app would stop working, but there's nothing of yours to protect on that side.

---

## 4. Project architecture

### Global flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (React + Tailwind)                                      │
│   app/draft/page.tsx (state machine mode → map → draft)          │
│   components/* : ModePicker, MapGrid, BrawlerGrid, BrawlerSlot,  │
│                  BrawlerAvatar, BucketSelector, …                │
└──────────────────────────────────────────────────────────────────┘
                         │ fetch JSON
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js API routes (Node, App Router)                           │
│   /api/modes        ← getRankedMaps() aggregates the modes       │
│   /api/maps?ranked  ← filtered list of currently ranked maps     │
│   /api/brawlers     ← brawlify list + triggers matchups warm     │
│   /api/draft-ai     ← main endpoint, runs in parallel:           │
│        • getCountersForEnemy(e, trophyMin) ← cube                │
│        • getBansForMap(mode, map, trophyMin) ← cube              │
│        • getModel(bucket).scoreCandidates(ctx) ← model-*.json    │
│   /api/bans         ← used internally, exposed for debug         │
└──────────────────────────────────────────────────────────────────┘
                         │              │
                         ▼              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│  brawltime.ninja Cube.js │    │  Brawlify (api.brawlify.com)    │
│  matchups, synergies,    │    │  brawlers, maps, images, modes  │
│  WR by map/season        │    │  (no auth)                      │
│  Auth via short JWT      │    │                                 │
└──────────────────────────┘    └─────────────────────────────────┘
```

### File structure

```
brawlstar/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── bans/route.ts
│   │   ├── brawlers/route.ts
│   │   ├── draft-ai/route.ts     # ★ main endpoint
│   │   ├── maps/route.ts
│   │   └── modes/route.ts
│   ├── draft/page.tsx            # ★ main view (3 steps)
│   ├── layout.tsx                # header + nav
│   ├── page.tsx                  # redirects to /draft
│   └── globals.css               # color tokens + utilities
│
├── components/
│   ├── BrawlerAvatar.tsx         # portrait + initials fallback
│   ├── BrawlerGrid.tsx           # brawler picker modal
│   ├── BrawlerSlot.tsx           # clickable 3v3 slot
│   ├── BucketSelector.tsx        # ELO toggle
│   ├── MapGrid.tsx               # map grid (step 2)
│   ├── MapPicker.tsx             # alternative map modal
│   ├── MiniCounter.tsx           # mini counter card under enemy
│   ├── ModePicker.tsx            # mode grid (step 1)
│   └── WrBar.tsx                 # win-rate bar
│
├── lib/
│   ├── aiModel.ts                # loads model + scoreCandidates()
│   ├── aliases.ts                # cube ↔ canonical renames
│   ├── bans.ts                   # ban computation
│   ├── brawlify.ts               # brawlify client (6 h cache)
│   ├── buckets.ts                # ELO definitions (all/diamond/mythic)
│   ├── cube.ts                   # cube.brawltime client (JWT, 30 min cache)
│   ├── matchups.ts               # matchup cache + warm
│   ├── ranked.ts                 # ranked maps filter + cubeName
│   └── types.ts                  # shared types
│
├── scripts/
│   ├── extract.ts                # cube → data/training/raw-{bucket}.json
│   ├── train.ts                  # raw → data/model-{bucket}.json
│   ├── sanity.ts                 # validation predictions
│   └── collect-battles.ts        # (v2) scrape battles via the official API
│
├── data/
│   ├── training/                 # gitignored, recreate via ai:extract
│   │   ├── raw-all.json
│   │   ├── raw-diamond.json
│   │   └── raw-mythic.json
│   ├── model-all.json            # committed, ~150 KB
│   ├── model-diamond.json
│   └── model-mythic.json
│
├── .env.local                    # gitignored ★ your secrets
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### npm scripts

```bash
npm run dev                     # dev server (localhost:3000)
npm run build                   # production build
npm run start                   # run the production build

# ML pipeline
BUCKET=all   npm run ai:extract   # extracts cube → data/training/raw-all.json (~30 s warm, 4 min cold)
BUCKET=all   npm run ai:train     # trains       → data/model-all.json (~5 s)
npm run ai:refresh                # extract + train (default bucket "all")
npm run ai:refresh:all            # rebuilds all 3 buckets back to back
npm run ai:sanity                 # prints validation predictions

npm run ai:collect              # (v2) scrape battles via the official API, requires .env.local
```

---

## 5. The ML model in detail

### The problem

Given (map, allies already picked, enemies already picked), predict a **score** for each candidate brawler reflecting the probability that your team wins if you pick it.

### Training data

For each of the 3 ELO buckets, three sets of aggregates are extracted from the cube (`scripts/extract.ts`):

| Type | Format | Quantity ("all" bucket) |
|---|---|---|
| **Solo** | (brawler, map) → observed WR, observed picks | ~3 500 rows |
| **Synergy** | (brawler, ally, map) → WR of _brawler_ when paired with _ally_ | ~65 000 rows |
| **Matchup** | (brawler, enemy, map) → WR of _brawler_ facing _enemy_ | ~85 000 rows |
| **TOTAL** | | **~150 000 samples** |

**Time window**: `season >= 2026-03-30` → the **last 5 seasons** (each season is 2 weeks = ~10 weeks rolling). Update the `SEASON_FROM` constant in `scripts/extract.ts` and `lib/ranked.ts` during monthly retrains.

**ELO filter**: the cube's `trophyRange` dimension (1 unit = 100 trophies) is filtered per bucket:
- `all`: no filter
- `diamond`: `trophyRange >= 13` (1 300+ trophies, competitive players)
- `mythic`: `trophyRange >= 18` (1 800+ trophies, top competitive)

### The model: Matrix Factorization with embeddings

#### Learned parameters (~12 k per bucket)

| Parameter | Shape | Meaning |
|---|---|---|
| `O[b]` | ℝ¹⁶ | "offensive" embedding — who knows how to punish |
| `D[b]` | ℝ¹⁶ | "defensive" embedding — who knows how to soak |
| `S[b]` | ℝ¹⁶ | "synergy" embedding — how it complements a team |
| `bias[b]` | scalar | overall strength (above/below 50 % WR) |
| `mapB[m,b]` | scalar | bonus / penalty of brawler b on map m |

#### Predictions (as logits, passed through sigmoid)

```
solo_wr(b, m)        = sigmoid(  mapB[m,b] + bias[b] )

synergy_wr(a, p, m)  = sigmoid(  mapB[m,a] + bias[a]
                                + S[a] · S[p] )

matchup_wr(a, e, m)  = sigmoid(  (mapB[m,a] − mapB[m,e])
                                + (bias[a] − bias[e])
                                +  O[a] · D[e] − O[e] · D[a] )
```

The dot product `O[a] · D[e]` captures "how well _a_'s offense matches _e_'s defensive weaknesses". Likewise `S[a] · S[p]` for complementarity.

#### Training

- **Loss**: weighted MSE — `(prediction − observation)² × √picks`, normalized so massive samples don't dominate
- **Optimizer**: SGD with momentum 0.85, learning rate 0.05 with 0.95 per-epoch decay
- **L2**: 1e-5 (light regularization)
- **80 epochs** on 90 % of the samples (10 % held out for validation)
- **5 seconds** on CPU per bucket

#### Inference

For a candidate _X_ in context (map _M_, allies _A1..An_, enemies _E1..En_), we compute the three axes:

```
solo     = sigmoid( mapB[M,X] + bias[X] )                                # WR if you pick X solo on this map
synergy  = mean_a∈allies   sigmoid( mapB[M,X] + bias[X] + S[X]·S[a] )    # WR with each of your allies
matchup  = mean_e∈enemies  sigmoid( (mapB[M,X]−mapB[M,e]) + ... )        # WR of X facing each enemy
```

Then combined:
```
score(X) = 0.4 × solo + 0.3 × synergy + 0.3 × matchup
```

The UI shows these 4 axes as 4 columns (Combined, Solo, Synergy, Counter), each ranked independently.

### Performance per bucket

| Bucket | Samples | Brawlers × Maps | Test MAE |
|---|---|---|---|
| **all**     | 152 680 | 102 × 30 | **6.91 %** |
| **diamond** |  69 115 | 102 × 30 | **4.14 %** |
| **mythic**  |  13 841 | 102 × 30 | **3.90 %** |

Random baseline = 13 %, fixed linear scoring (0.5/0.5) ≈ 9 %. The higher the bucket, the fewer samples but the more consistent the meta → better MAE.

### Sanity checks

`npm run ai:sanity` prints chosen predictions for visual verification:
- Known counters surface (DAMIAN, GLOWY in the current meta vs SHELLY)
- Synergy embeddings cluster classes implicitly (Frank synergy-similar to Jacky/Nita/Bea = tanks)
- Offensive embeddings too (Edgar offense-similar to Darryl/El Primo/Sam = assassins)

---

## 6. API endpoints

| Route | Method | Body / params | Response |
|---|---|---|---|
| `/api/brawlers` | GET | — | `{ brawlers: Brawler[] }` (6 h cache, triggers global warm) |
| `/api/maps` | GET | `?ranked=true` | `{ maps: GameMap[] }` (30 maps currently) |
| `/api/modes` | GET | — | `{ modes: GameMode[] }` (6 ranked modes) |
| `/api/draft-ai` | POST | `{ mode, map, enemies[], allies[], bucket }` | `{ bucket, perEnemy[], bans[], recommendations[], topByMap[], topBySynergy[], topByCounter[], modelLoaded }` |
| `/api/bans` | POST | `{ mode, map }` | `{ bans: BanRow[] }` |

`bucket` accepts `"all"` (default), `"diamond"`, `"mythic"`.

---

## 7. Re-training

The Brawl Stars meta shifts every 2-4 weeks. To stay current:

### Full workflow

```bash
# 1. Update the season window (~ every 1-2 months)
#    In scripts/extract.ts AND lib/ranked.ts:
#    const SEASON_FROM = "YYYY-MM-DD";  # set to a date ~10 weeks ago

# 2. Run the full pipeline for all 3 buckets
npm run ai:refresh:all

# 3. Sanity check
npm run ai:sanity

# 4. If everything looks good, commit the new model-*.json files
git add data/model-*.json
git commit -m "retrain models (season window: ...)"
```

### Adding a renamed brawler

When Supercell renames a brawler (e.g. "Colonel Ruffs" → "Ruffs"), brawltime keeps the history under the old name **on top of** the new one. To merge:

1. Add an entry in `lib/aliases.ts`:
   ```ts
   export const BRAWLER_ALIASES = {
     "COLONEL RUFFS": "RUFFS",
     "GLOWBERT": "GLOWY",
     "OLD_NAME": "NEW_CANONICAL_NAME",
   };
   ```
2. Re-run `npm run ai:refresh:all`.

Alias expansion is also applied at runtime (per-enemy counters), so even without a retrain the UI handles picks of a renamed brawler correctly.

---

## 8. Known limitations

### Of the model

- **No raw logs**: we train on pairwise aggregates (brawler ↔ brawler, brawler ↔ map). The model never sees a full 3v3 comp, only pairs. It infers by averaging.
- **No explicit class balancing**: if your allies are already 2 tanks, the model doesn't literally tell you "you need a DPS". It infers that via synergy embeddings but it's indirect.
- **Recently added maps poorly covered**: if Supercell adds a ranked map mid-season, it doesn't have enough data yet until we re-extract and retrain.
- **Very recently released brawlers**: same, embeddings aren't trustworthy until they've accumulated ~1 000 picks.

### Technical

- **Dependency on brawltime**: if their auth endpoint (`brawltime.ninja/api/trpc/auth.getToken`) changes or goes down, we lose cube access. Mitigation: their code is open source; the official scraper (`npm run ai:collect`) is an alternative to collect battles directly via the Supercell API.
- **RAM-only cache**: restarting the server clears the cache, first hit ~15 s to re-warm. Persisting to disk would skip that delay.
- **Manual aliases**: every Supercell rename requires editing `lib/aliases.ts`.

---

## 9. v2 roadmap

The `scripts/collect-battles.ts` script (already written) scrapes the official Brawl Stars API for **raw labeled battles** (who won). With ~10-50 k battles you could:

- Train a **supervised** model: `P(team1 wins | map, [3 brawlers team1], [3 brawlers team2])`
- Use a **Factorization Machine** or a **small MLP** with embeddings learned on real labels — typically +1 to 2 pp better test MAE
- Schedule weekly automatic retraining (cron)
- Add an explicit **role balance** signal (tank / DPS / support)

To enable v2, drop a token in `.env.local`:

```
BRAWLSTARS_TOKEN=eyJhbGciOiJIUz...
```

Free token to create at [developer.brawlstars.com](https://developer.brawlstars.com) (IP-locked). The scraper is ready; the supervised model still needs to be implemented.

---

## Credits

- **[brawltime.ninja](https://brawltime.ninja)** (schneefux) — Cube.js backend + aggregated data, open source
- **[brawlify.com](https://brawlify.com)** — brawler/map metadata and assets
- **Supercell** — Brawl Stars. This app is not affiliated with or endorsed by Supercell.
