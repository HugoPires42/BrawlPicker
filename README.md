# BrawlPick

**Assistant de draft pour Brawl Stars Ranked.** Choisis ton mode et ta map, indique les picks adverses et alliés au fur et à mesure, et reçois en direct :

- les meilleurs **bans** de la map
- les **counters** spécifiques de chaque ennemi pické
- **4 colonnes de suggestions** : score combiné par IA, meilleurs sur la map, meilleures synergies avec tes alliés, meilleurs counters contre les ennemis
- le tout recalculé selon ton **ELO** (All / Diamond+ / Mythic+)

Les recommandations viennent d'un modèle de Matrix Factorization entraîné sur ~150 000 paires (brawler, brawler, map) issues du backend de [brawltime.ninja](https://brawltime.ninja), filtrées aux 5 dernières saisons pour rester collé à la méta actuelle.

---

## Sommaire

1. [Comment utiliser l'app](#1-comment-utiliser-lapp)
2. [Installation et lancement](#2-installation-et-lancement)
3. [Pousser sur GitHub en sécurité](#3-pousser-sur-github-en-sécurité)
4. [Architecture du projet](#4-architecture-du-projet)
5. [Le modèle ML en détail](#5-le-modèle-ml-en-détail)
6. [Endpoints API](#6-endpoints-api)
7. [Re-entraînement](#7-re-entraînement)
8. [Limites connues](#8-limites-connues)
9. [Roadmap v2](#9-roadmap-v2)

---

## 1. Comment utiliser l'app

L'app a une seule URL : **`/draft`** (la racine `/` redirige). Le flow se déroule en 3 étapes dans la même page.

### Étape 1 — Choisir le mode

Tu arrives sur une grille de 6-7 grosses cartes : Brawl Ball, Gem Grab, Knockout, Heist, Hot Zone, Bounty… Clique sur le mode que tu vas jouer.

### Étape 2 — Choisir la map

Grille des maps actuellement en rotation ranked pour ce mode (4 à 11 maps selon le mode). Cliquer une carte t'amène à l'écran de draft. Bouton « ← Changer de mode » dispo.

### Étape 3 — La vue draft

Tout est dans une seule fenêtre, organisée comme ceci :

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Mode  ← Changer de map  [ELO: All|Diamond+|Mythic+]   MAP+MODE│
├──────────────────────────────────────────────┬──────────────────┤
│ ÉQUIPE ENNEMIE         [3 slots]              │   TOP BANS       │
│   sous chaque ennemi pické :                  │  classement      │
│   4 counters dédiés (portrait + WR%)          │  des brawlers    │
│                                                │  à bannir en    │
│ TON ÉQUIPE             [3 slots]              │  priorité        │
│   slots cliquables, optionnels                 │                  │
│                                                │                  │
│ SUGGESTIONS IA — 4 colonnes :                 │                  │
│   1. Combiné IA  2. Meilleurs map             │                  │
│   3. Synergie alliés  4. Counter ennemis      │                  │
└──────────────────────────────────────────────┴──────────────────┘
```

**Comment ça se met à jour :** chaque fois que tu cliques un slot et pickes un brawler, toute la page se recalcule (counters, bans, suggestions). Les requêtes sont déduplicatées et cachées 30 min côté serveur, donc dès que tu joues un peu c'est instantané.

### Les 4 colonnes de suggestions

| Colonne | Ce qu'elle classe | Quand l'utiliser |
|---|---|---|
| **Combiné IA** | Score pondéré 0.4 × solo + 0.3 × synergie + 0.3 × vs ennemis | Le « bon » pick global toutes choses considérées |
| **Meilleurs sur la map** | WR brut sur cette map (ignore alliés / ennemis) | Si tu veux juste un brawler fiable sur cette map |
| **Synergie alliés** | WR moyen quand pické avec tes alliés | Active une fois que tu as un allié pické. Pour compléter ta compo |
| **Counter ennemis** | WR moyen face aux ennemis adverses | Active une fois que tu as un ennemi pické. Pour punir un pick adverse |

Les chiffres sont sur 100 (50 = neutre, 60+ = fort, 70+ = très fort).

### Le sélecteur ELO

Dans le header, le toggle **All / Diamond+ / Mythic+** filtre tout le pipeline (counters, bans, modèle IA) à la tranche d'ELO choisie. Les recommandations diffèrent significativement : la méta basse-ELO valorise les brawlers polyvalents, la méta haute-ELO les brawlers à fort skill ceiling (Mortis, Edgar…). À choisir selon ton niveau de jeu.

| Bucket | Tranche trophées approximative | Tier ranked typique |
|---|---|---|
| **All** | toutes | tous joueurs (défaut) |
| **Diamond+** | ≥ 1 300 trophées | Diamant et plus |
| **Mythic+** | ≥ 1 800 trophées | Mythique et plus |

---

## 2. Installation et lancement

### Prérequis

- **Node.js 22+** (testé sur Node 24)

### Premier lancement

```bash
git clone <ton-fork>
cd brawlstar
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Au premier hit, le serveur pré-réchauffe en tâche de fond les ~80 matchups les plus joués (~15 s). Pendant ce temps tu peux déjà cliquer — ta requête piggyback sur le warm. Ensuite tout est sub-100 ms pendant 30 min (cache cube).

### Si le port 3000 est occupé

```bash
taskkill /F /IM node.exe       # Windows
pkill -f "next dev"            # macOS / Linux
```

### Token Brawl Stars (optionnel)

Utile **seulement si tu veux scraper des battles brutes** via le script v2 `npm run ai:collect`. Pour utiliser l'app, c'est inutile.

1. Crée un token gratuit sur [developer.brawlstars.com](https://developer.brawlstars.com) (lié à ton IP)
2. Crée `.env.local` à la racine :
   ```
   BRAWLSTARS_TOKEN=eyJhbGciOiJIUz...ton-token
   ```
3. Le fichier est dans `.gitignore` — ne sera jamais commité.

### Build de production

```bash
npm run build
npm start
```

---

## 3. Pousser sur GitHub en sécurité

### Ce qui est déjà gitignored

Le `.gitignore` du repo couvre tout ce qui ne doit pas être public :

```
node_modules         # dépendances
.next, out           # build artifacts Next.js
.env, .env.*         # ★ TOUS les fichiers d'env, y compris .env.local avec le token
.claude/             # tes permissions Claude Code locales
.idea/, .vscode/     # config IDE
*.log                # logs (dev.log, train.log, extract.log)
data/training/       # extraits cube de ~25 MB chacun, à recréer avec ai:extract
data/battles/        # battles brutes du scraper v2
```

### Ce qui EST commité (et c'est ok)

- `data/model-*.json` — les modèles entraînés (~150 KB chacun). Comme ça, un nouveau clone a un modèle fonctionnel immédiatement sans devoir lancer `ai:refresh:all`. Si tu préfères forcer le retrain, décommente la ligne `data/model-*.json` dans `.gitignore`.

### Vérifie avant de push

```bash
git init                         # si pas encore fait
git add .
git status                       # vérifie qu'il N'Y A PAS .env.local listé
grep -rE "eyJ[A-Za-z0-9_-]{20,}\." . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git || echo "aucun JWT trouvé dans les fichiers tracked"
```

Si jamais un secret est commité par accident, **change immédiatement ton token** sur developer.brawlstars.com — l'historique git garde tout, le seul vrai remède est de rotationner.

### Risque résiduel

L'app fait des requêtes vers `brawltime.ninja` pour récupérer un JWT court qui interroge leur Cube.js. C'est **leur** infra publique, pas tes credentials. Si leur endpoint changeait demain l'app cesserait de marcher, mais il n'y a rien de toi à protéger ici.

---

## 4. Architecture du projet

### Flux global

```
┌──────────────────────────────────────────────────────────────────┐
│  Navigateur (React + Tailwind)                                   │
│   app/draft/page.tsx (state machine mode → map → draft)          │
│   components/* : ModePicker, MapGrid, BrawlerGrid, BrawlerSlot,  │
│                  BrawlerAvatar, BucketSelector, …                │
└──────────────────────────────────────────────────────────────────┘
                         │ fetch JSON
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js API routes (Node, App Router)                           │
│   /api/modes        ← getRankedMaps() agrège les modes           │
│   /api/maps?ranked  ← liste filtrée des maps ranked actuelles    │
│   /api/brawlers     ← liste brawlify + déclenche warm matchups   │
│   /api/draft-ai     ← endpoint principal, parallélise :          │
│        • getCountersForEnemy(e, trophyMin) ← cube                │
│        • getBansForMap(mode, map, trophyMin) ← cube              │
│        • getModel(bucket).scoreCandidates(ctx) ← model-*.json    │
│   /api/bans         ← utilisé en interne, exposé pour debug      │
└──────────────────────────────────────────────────────────────────┘
                         │              │
                         ▼              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│  brawltime.ninja Cube.js │    │  Brawlify (api.brawlify.com)    │
│  matchups, synergies,    │    │  brawlers, maps, images, modes  │
│  WR par map/season       │    │  (pas d'auth)                   │
│  Auth via JWT court      │    │                                 │
└──────────────────────────┘    └─────────────────────────────────┘
```

### Structure des fichiers

```
brawlstar/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── bans/route.ts
│   │   ├── brawlers/route.ts
│   │   ├── draft-ai/route.ts     # ★ endpoint principal
│   │   ├── maps/route.ts
│   │   └── modes/route.ts
│   ├── draft/page.tsx            # ★ vue principale (3 étapes)
│   ├── layout.tsx                # header + nav
│   ├── page.tsx                  # redirige vers /draft
│   └── globals.css               # tokens couleur + utilitaires
│
├── components/
│   ├── BrawlerAvatar.tsx         # portrait + fallback initiales
│   ├── BrawlerGrid.tsx           # modal de sélection brawler
│   ├── BrawlerSlot.tsx           # slot 3v3 cliquable
│   ├── BucketSelector.tsx        # toggle ELO
│   ├── MapGrid.tsx               # grille de maps (étape 2)
│   ├── MapPicker.tsx             # modal alternatif de map
│   ├── MiniCounter.tsx           # mini-carte counter sous ennemi
│   ├── ModePicker.tsx            # grille de modes (étape 1)
│   └── WrBar.tsx                 # barre de win rate
│
├── lib/
│   ├── aiModel.ts                # charge modèle + scoreCandidates()
│   ├── aliases.ts                # renames cube ↔ canonical
│   ├── bans.ts                   # calcul des bans
│   ├── brawlify.ts               # client brawlify (cache 6 h)
│   ├── buckets.ts                # définitions ELO (all/diamond/mythic)
│   ├── cube.ts                   # client cube.brawltime (JWT, cache 30 min)
│   ├── matchups.ts               # cache matchups + warm
│   ├── ranked.ts                 # filtre maps ranked + cubeName
│   └── types.ts                  # types partagés
│
├── scripts/
│   ├── extract.ts                # cube → data/training/raw-{bucket}.json
│   ├── train.ts                  # raw → data/model-{bucket}.json
│   ├── sanity.ts                 # prédictions de validation
│   └── collect-battles.ts        # (v2) scrape battles via API officielle
│
├── data/
│   ├── training/                 # gitignored, à recréer avec ai:extract
│   │   ├── raw-all.json
│   │   ├── raw-diamond.json
│   │   └── raw-mythic.json
│   ├── model-all.json            # commité, ~150 KB
│   ├── model-diamond.json
│   └── model-mythic.json
│
├── .env.local                    # gitignored ★ tes secrets
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### Scripts npm

```bash
npm run dev                     # serveur dev (localhost:3000)
npm run build                   # build production
npm run start                   # lance la build production

# Pipeline ML
BUCKET=all   npm run ai:extract   # extrait cube → data/training/raw-all.json (~30 s warm, 4 min cold)
BUCKET=all   npm run ai:train     # entraîne   → data/model-all.json (~5 s)
npm run ai:refresh                # extract + train (defaut bucket "all")
npm run ai:refresh:all            # refait les 3 buckets d'affilée
npm run ai:sanity                 # affiche des prédictions de validation

npm run ai:collect              # (v2) scrape battles via API officielle, requiert .env.local
```

---

## 5. Le modèle ML en détail

### Le problème

À partir de (map, alliés déjà pickés, ennemis déjà pickés), prédire un **score** pour chaque brawler candidat reflétant la probabilité que ton équipe gagne si tu le pickes.

### La donnée d'entraînement

Pour chacun des 3 buckets ELO, trois jeux d'agrégats extraits du cube (script `scripts/extract.ts`) :

| Type | Format | Quantité (bucket "all") |
|---|---|---|
| **Solo** | (brawler, map) → WR observé, picks observés | ~3 500 lignes |
| **Synergie** | (brawler, ally, map) → WR de _brawler_ quand il joue avec _ally_ | ~65 000 lignes |
| **Matchup** | (brawler, enemy, map) → WR de _brawler_ face à _enemy_ | ~85 000 lignes |
| **TOTAL** | | **~150 000 samples** |

**Fenêtre temporelle** : `season >= 2026-03-30` → les **5 dernières saisons** (chaque saison dure 2 semaines = ~10 semaines glissantes). Ajuster la constante `SEASON_FROM` dans `scripts/extract.ts` et `lib/ranked.ts` lors du retrain mensuel.

**Filtre ELO** : la dimension `trophyRange` du cube (1 unité = 100 trophées) est filtrée selon le bucket :
- `all` : pas de filtre
- `diamond` : `trophyRange >= 13` (1300+ trophées, joueurs compétitifs)
- `mythic` : `trophyRange >= 18` (1800+ trophées, top compétitif)

### Le modèle : Matrix Factorization avec embeddings

#### Paramètres appris (~12 k par bucket)

| Paramètre | Forme | Sens |
|---|---|---|
| `O[b]` | ℝ¹⁶ | embedding « offensive » — qui sait punir |
| `D[b]` | ℝ¹⁶ | embedding « defensive » — qui sait encaisser |
| `S[b]` | ℝ¹⁶ | embedding « synergie » — comment il complète une équipe |
| `bias[b]` | scalaire | force générale (au-dessus / en-dessous du WR 50 %) |
| `mapB[m,b]` | scalaire | bonus / malus du brawler b sur la map m |

#### Prédictions (en logits, passés dans sigmoid)

```
solo_wr(b, m)        = sigmoid(  mapB[m,b] + bias[b] )

synergie_wr(a, p, m) = sigmoid(  mapB[m,a] + bias[a]
                                + S[a] · S[p] )

matchup_wr(a, e, m)  = sigmoid(  (mapB[m,a] − mapB[m,e])
                                + (bias[a] − bias[e])
                                +  O[a] · D[e] − O[e] · D[a] )
```

Le produit scalaire `O[a] · D[e]` capture « à quel point l'offensive de _a_ matche les faiblesses défensives de _e_ ». Idem `S[a] · S[p]` pour la complémentarité.

#### Entraînement

- **Loss** : MSE pondérée — `(prédiction − observation)² × √picks`, normalisée pour éviter que les samples massifs ne dominent
- **Optimiseur** : SGD avec momentum 0.85, learning rate 0.05 avec décroissance 0.95 par epoch
- **L2** : 1e-5 (régularisation légère)
- **80 epochs** sur 90 % des samples (10 % en validation)
- **5 secondes** sur CPU par bucket

#### Inférence

Pour un candidat _X_ dans le contexte (map _M_, alliés _A1..An_, ennemis _E1..En_), on calcule les trois axes :

```
solo     = sigmoid( mapB[M,X] + bias[X] )                                # WR si tu pickes X tout seul sur cette map
synergie = moyenne_a∈alliés  sigmoid( mapB[M,X] + bias[X] + S[X]·S[a] )  # WR avec chacun de tes alliés
matchup  = moyenne_e∈ennemis sigmoid( (mapB[M,X]−mapB[M,e]) + ... )      # WR de X face à chacun des ennemis
```

Puis combinaison :
```
score(X) = 0.4 × solo + 0.3 × synergie + 0.3 × matchup
```

L'UI montre ces 4 axes en 4 colonnes (Combiné, Solo, Synergie, Counter), chacune classée indépendamment.

### Performance par bucket

| Bucket | Samples | Brawlers × Maps | Test MAE |
|---|---|---|---|
| **all**     | 152 680 | 102 × 30 | **6.91 %** |
| **diamond** |  69 115 | 102 × 30 | **4.14 %** |
| **mythic**  |  13 841 | 102 × 30 | **3.90 %** |

Random baseline = 13 %, scoring linéaire fixe (0.5/0.5) ≈ 9 %. Plus le bucket est haut, moins on a de samples mais plus la méta est cohérente → MAE meilleur.

### Sanity checks

`npm run ai:sanity` affiche des prédictions choisies pour vérifier visuellement :
- Counters connus ressortent (DAMIAN, GLOWY pour la méta actuelle vs SHELLY)
- Embeddings de synergie cluster les classes implicitement (Frank synergie-similar à Jacky/Nita/Bea = tanks)
- Embeddings offensifs aussi (Edgar offense-similar à Darryl/El Primo/Sam = assassins)

---

## 6. Endpoints API

| Route | Méthode | Body / params | Réponse |
|---|---|---|---|
| `/api/brawlers` | GET | — | `{ brawlers: Brawler[] }` (cache 6 h, déclenche warm global) |
| `/api/maps` | GET | `?ranked=true` | `{ maps: GameMap[] }` (30 maps actuellement) |
| `/api/modes` | GET | — | `{ modes: GameMode[] }` (6 modes ranked) |
| `/api/draft-ai` | POST | `{ mode, map, enemies[], allies[], bucket }` | `{ bucket, perEnemy[], bans[], recommendations[], topByMap[], topBySynergy[], topByCounter[], modelLoaded }` |
| `/api/bans` | POST | `{ mode, map }` | `{ bans: BanRow[] }` |

`bucket` accepte `"all"` (défaut), `"diamond"`, `"mythic"`.

---

## 7. Re-entraînement

La méta Brawl Stars évolue toutes les 2-4 semaines. Pour rester à jour :

### Workflow complet

```bash
# 1. Mettre à jour la fenêtre de saisons (~ tous les 1-2 mois)
#    Dans scripts/extract.ts ET lib/ranked.ts :
#    const SEASON_FROM = "AAAA-MM-JJ";  # remplace par une date il y a ~10 semaines

# 2. Lancer le pipeline complet pour les 3 buckets
npm run ai:refresh:all

# 3. Sanity check
npm run ai:sanity

# 4. Si tout est ok, commit les nouveaux model-*.json
git add data/model-*.json
git commit -m "retrain models (season window: ...)"
```

### Ajouter un brawler renommé

Quand Supercell renomme un brawler (ex : « Colonel Ruffs » → « Ruffs »), brawltime garde l'historique sous l'ancien nom **en plus** du nouveau. Pour fusionner :

1. Ajoute une entrée dans `lib/aliases.ts` :
   ```ts
   export const BRAWLER_ALIASES = {
     "COLONEL RUFFS": "RUFFS",
     "GLOWBERT": "GLOWY",
     "ANCIEN_NOM": "NOUVEAU_NOM_CANONIQUE",
   };
   ```
2. Relance `npm run ai:refresh:all`.

L'expansion d'alias est appliquée aussi au runtime (counters par ennemi), donc même sans retrain l'UI gère correctement le pick d'un brawler renommé.

---

## 8. Limites connues

### Du modèle

- **Pas de logs bruts** : on entraîne sur des agrégats pairwise (brawler ↔ brawler, brawler ↔ map). Le modèle ne voit jamais une compo 3v3 complète, juste des paires. Il infère par moyennage.
- **Pas d'équilibrage de classes explicite** : si tes alliés sont déjà 2 tanks, le modèle ne te dit pas littéralement « il te faut un DPS ». Il l'infère via les embeddings de synergie mais c'est indirect.
- **Maps récentes peu couvertes** : si Supercell ajoute une map ranked en mid-saison, elle n'a pas encore assez de data tant qu'on n'a pas re-extrait + re-trainé.
- **Brawlers sortis très récemment** : pareil, les embeddings sont peu fiables tant qu'ils n'ont pas accumulé ~1000 picks.

### Techniques

- **Dépendance à brawltime** : si leur endpoint d'auth (`brawltime.ninja/api/trpc/auth.getToken`) change ou ferme, on perd l'accès au cube. Mitigation : leur code est open source ; le scraper officiel (`npm run ai:collect`) est une alternative pour collecter des battles directement via l'API Supercell.
- **Cache RAM uniquement** : redémarrer le serveur efface le cache, premier hit ~15 s pour re-warmer. Persister sur disque ferait sauter ce délai.
- **Aliases manuels** : à chaque rename de brawler par Supercell, il faut éditer `lib/aliases.ts`.

---

## 9. Roadmap v2

Le script `scripts/collect-battles.ts` (déjà écrit) scrape l'API officielle de Brawl Stars pour récupérer des **battles brutes labelisées** (qui a gagné). Avec ~10-50 k battles, on pourrait :

- Entraîner un modèle **supervisé** : `P(team1 wins | map, [3 brawlers team1], [3 brawlers team2])`
- Utiliser une **Factorization Machine** ou un **petit MLP** avec embeddings appris sur les labels réels — typiquement +1 à 2 pp de précision sur le test MAE
- Re-train hebdomadaire automatique (cron)
- Ajout d'un signal **balance de rôles** explicite (tank / DPS / support)

Pour activer la v2, fournir un token dans `.env.local` :

```
BRAWLSTARS_TOKEN=eyJhbGciOiJIUz...
```

Token gratuit à créer sur [developer.brawlstars.com](https://developer.brawlstars.com) (lié à ton IP). Le scraper est prêt, le modèle supervisé reste à implémenter.

---

## Crédits

- **[brawltime.ninja](https://brawltime.ninja)** (schneefux) — backend Cube.js + données agrégées, open source
- **[brawlify.com](https://brawlify.com)** — métadonnées et assets des brawlers/maps
- **Supercell** — Brawl Stars. Cette app n'est ni affiliée ni endorsée par Supercell.
