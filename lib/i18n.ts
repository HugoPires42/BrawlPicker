export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

type Dict = Record<Locale, string>;

export const STRINGS = {
  // Layout
  "footer.attribution": {
    fr: "Données : brawltime.ninja (cube) + brawlify.com. Non affilié à Supercell.",
    en: "Data: brawltime.ninja (cube) + brawlify.com. Not affiliated with Supercell.",
  },

  // Mode picker (step 1)
  "mode.title": { fr: "Choisis le mode", en: "Pick a mode" },
  "mode.subtitle": {
    fr: "Sélectionne le mode ranked que tu joues",
    en: "Select the ranked mode you're playing",
  },
  "mode.mapCount.one": { fr: "map ranked", en: "ranked map" },
  "mode.mapCount.many": { fr: "maps ranked", en: "ranked maps" },

  // Map grid (step 2)
  "map.changeMode": { fr: "← Changer de mode", en: "← Change mode" },
  "map.modeLabel": { fr: "Mode", en: "Mode" },
  "map.title": { fr: "Choisis la map", en: "Pick a map" },
  "map.countSuffix": { fr: "maps en ranked", en: "ranked maps" },

  // Draft view header
  "draft.backToMode": { fr: "← Mode", en: "← Mode" },
  "draft.changeMap": { fr: "← Changer de map", en: "← Change map" },
  "draft.resetPicks": { fr: "Reset picks", en: "Reset picks" },
  "draft.eloLabel": { fr: "ELO", en: "ELO" },

  // Teams
  "draft.enemyTeam": { fr: "Équipe ennemie", en: "Enemy team" },
  "draft.yourTeam": { fr: "Ton équipe", en: "Your team" },
  "draft.you": { fr: "Toi", en: "You" },
  "draft.ally": { fr: "Allié", en: "Ally" },
  "draft.pickEnemy": { fr: "Pick un ennemi", en: "Pick an enemy" },
  "draft.pickAlly": { fr: "Pick un allié", en: "Pick an ally" },

  // Loading / errors
  "draft.loading": { fr: "chargement…", en: "loading…" },
  "draft.updating": { fr: "Mise à jour…", en: "Updating…" },
  "draft.error": { fr: "Erreur :", en: "Error:" },
  "draft.loadFailed": {
    fr: "Impossible de charger les données",
    en: "Unable to load data",
  },

  // Recommendations
  "recs.title": { fr: "Suggestions IA", en: "AI suggestions" },
  "recs.modelNotLoaded": {
    fr: "(modèle non chargé pour cette map)",
    en: "(model not loaded for this map)",
  },
  "recs.noSignal": {
    fr: "Pas encore assez de signal — pick au moins un brawler ou une map pour démarrer.",
    en: "Not enough signal yet — pick at least one brawler or map to start.",
  },
  "recs.mapNotInModel": {
    fr: "Cette map n'est pas couverte par le modèle (à ré-entraîner).",
    en: "This map isn't covered by the model (retrain required).",
  },

  // Recommendation columns
  "col.combined.title": { fr: "Combiné IA", en: "AI combined" },
  "col.combined.subtitle": {
    fr: "0.4 solo + 0.3 synergie + 0.3 vs ennemis",
    en: "0.4 solo + 0.3 synergy + 0.3 vs enemies",
  },
  "col.map.title": { fr: "Meilleurs sur la map", en: "Best on map" },
  "col.map.subtitle": {
    fr: "WR brut sur cette map",
    en: "Raw WR on this map",
  },
  "col.synergy.title": { fr: "Synergie alliés", en: "Ally synergy" },
  "col.synergy.subtitleActive": {
    fr: "WR moyen avec tes alliés",
    en: "Average WR with your allies",
  },
  "col.synergy.subtitleInactive": {
    fr: "Pick au moins un allié",
    en: "Pick at least one ally",
  },
  "col.synergy.empty": {
    fr: "Choisis au moins un allié pour activer cette colonne.",
    en: "Pick at least one ally to activate this column.",
  },
  "col.counter.title": { fr: "Counter ennemis", en: "Enemy counters" },
  "col.counter.subtitleActive": {
    fr: "WR moyen vs les ennemis pickés",
    en: "Average WR vs picked enemies",
  },
  "col.counter.subtitleInactive": {
    fr: "Pick au moins un ennemi",
    en: "Pick at least one enemy",
  },
  "col.counter.empty": {
    fr: "Choisis au moins un ennemi pour activer cette colonne.",
    en: "Pick at least one enemy to activate this column.",
  },
  "col.noData": { fr: "Pas de données.", en: "No data." },

  // Bans panel
  "bans.title": { fr: "Top bans", en: "Top bans" },
  "bans.notEnough": { fr: "Pas assez de données.", en: "Not enough data." },

  // Per-enemy counters area
  "counter.placeholder": {
    fr: "Pick un ennemi pour voir ses counters",
    en: "Pick an enemy to see its counters",
  },

  // Brawler picker modal
  "picker.title": { fr: "Choisis un brawler", en: "Pick a brawler" },
  "picker.search": { fr: "Rechercher…", en: "Search…" },
  "picker.all": { fr: "Tous", en: "All" },
  "picker.empty": {
    fr: "Aucun brawler ne correspond.",
    en: "No brawler matches.",
  },

  // Map picker modal
  "mapPicker.title": { fr: "Choisis une map ranked", en: "Pick a ranked map" },
  "mapPicker.search": { fr: "Rechercher une map…", en: "Search a map…" },
  "mapPicker.allModes": { fr: "Tous", en: "All" },
  "mapPicker.empty": { fr: "Aucune map.", en: "No map." },

  // Map button (idle)
  "mapButton.choose": { fr: "Choisir une map", en: "Pick a map" },
  "mapButton.help": {
    fr: "Filtre les recommandations selon la map ranked",
    en: "Filters recommendations by ranked map",
  },
  "mapButton.change": { fr: "changer", en: "change" },

  // Aria labels
  "aria.close": { fr: "Fermer", en: "Close" },
  "aria.remove": { fr: "Retirer", en: "Remove" },
  "aria.chooseBrawler": { fr: "Choisir un brawler", en: "Pick a brawler" },

  // ELO bucket labels
  "bucket.all.label": { fr: "Tous les joueurs", en: "All players" },
  "bucket.all.desc": {
    fr: "Pas de filtre — toutes les tranches de trophées",
    en: "No filter — all trophy ranges",
  },
  "bucket.diamond.label": { fr: "Diamant et +", en: "Diamond and up" },
  "bucket.diamond.desc": {
    fr: "≥ 1 300 trophées — joueurs compétitifs",
    en: "≥ 1,300 trophies — competitive players",
  },
  "bucket.mythic.label": { fr: "Mythique et +", en: "Mythic and up" },
  "bucket.mythic.desc": {
    fr: "≥ 1 800 trophées — top compétitif",
    en: "≥ 1,800 trophies — top competitive",
  },

  // Nav
  "nav.draft": { fr: "Draft", en: "Draft" },
  "nav.how": { fr: "Comment ça marche", en: "How it works" },

  // How-it-works — hero
  "how.hero.title": { fr: "Comment ça marche", en: "How it works" },
  "how.hero.subtitle": {
    fr: "Le mode opératoire, les formules de chaque colonne, et ce que fait le modèle d'IA derrière.",
    en: "The flow, the formula behind each column, and what the AI model actually does.",
  },
  "how.hero.cta": { fr: "Aller au draft", en: "Go to draft" },

  // How-it-works — flow
  "how.flow.title": { fr: "Le flow en 5 étapes", en: "The flow in 5 steps" },
  "how.flow.step1.title": { fr: "Choisis le mode", en: "Pick the mode" },
  "how.flow.step1.body": {
    fr: "Sept modes en rotation ranked — Brawl Ball, Gem Grab, Knockout, Heist, Hot Zone, Bounty, Brawl Hockey. Clique celui que tu vas jouer.",
    en: "Seven modes in ranked rotation — Brawl Ball, Gem Grab, Knockout, Heist, Hot Zone, Bounty, Brawl Hockey. Pick the one you're about to play.",
  },
  "how.flow.step2.title": { fr: "Choisis la map", en: "Pick the map" },
  "how.flow.step2.body": {
    fr: "On filtre automatiquement aux maps de la saison ranked actuelle (4 à 6 par mode). Pas besoin de scroller dans des maps obsolètes.",
    en: "We auto-filter to the maps in the current ranked rotation (4 to 6 per mode). No scrolling through stale ones.",
  },
  "how.flow.step3.title": {
    fr: "Pick tes ennemis",
    en: "Mark enemy picks",
  },
  "how.flow.step3.body": {
    fr: "Dès qu'un ennemi est pické, les 4 meilleurs counters s'affichent sous lui. Ça t'aide à voir tout de suite qui peut le punir.",
    en: "As soon as an enemy is picked, their 4 best counters show up underneath. Lets you instantly see who punishes them.",
  },
  "how.flow.step4.title": {
    fr: "Pick tes alliés (optionnel)",
    en: "Mark your allies (optional)",
  },
  "how.flow.step4.body": {
    fr: "Renseigne ce que tes coéquipiers ont déjà pris pour que les suggestions tiennent compte des synergies de compo.",
    en: "Add what your teammates already locked in so the suggestions take team synergy into account.",
  },
  "how.flow.step5.title": {
    fr: "Lis les 4 colonnes",
    en: "Read the 4 columns",
  },
  "how.flow.step5.body": {
    fr: "Le panel de suggestions se met à jour à chaque pick. Tu y trouves quatre angles d'analyse différents — détaillés plus bas.",
    en: "The suggestion panel updates on every pick. Four different angles of analysis — explained below.",
  },

  // How-it-works — anatomy
  "how.anatomy.title": {
    fr: "Anatomie de la vue draft",
    en: "Draft view anatomy",
  },
  "how.anatomy.intro": {
    fr: "L'écran de draft tient sur une seule page. Voici à quoi sert chaque zone :",
    en: "The draft screen fits on one page. Here's what each zone does:",
  },
  "how.anatomy.elo": { fr: "Sélecteur ELO", en: "ELO selector" },
  "how.anatomy.eloDesc": {
    fr: "Filtre tout le pipeline à la tranche de trophées choisie (All / Diamond+ / Mythic+).",
    en: "Filters the whole pipeline to the chosen trophy bracket (All / Diamond+ / Mythic+).",
  },
  "how.anatomy.enemies": {
    fr: "Slots ennemis + counters",
    en: "Enemy slots + counters",
  },
  "how.anatomy.enemiesDesc": {
    fr: "3 slots cliquables. Sous chaque ennemi pické, ses 4 meilleurs counters.",
    en: "3 clickable slots. Under each picked enemy, their 4 strongest counters.",
  },
  "how.anatomy.allies": { fr: "Slots alliés", en: "Ally slots" },
  "how.anatomy.alliesDesc": {
    fr: "3 slots. Optionnels — sert à activer la colonne synergie.",
    en: "3 slots. Optional — used to activate the synergy column.",
  },
  "how.anatomy.recs": {
    fr: "4 colonnes de suggestions",
    en: "4 suggestion columns",
  },
  "how.anatomy.recsDesc": {
    fr: "Le cœur du draft assistant. Quatre angles, mêmes données.",
    en: "The core of the draft assistant. Four angles, same data.",
  },
  "how.anatomy.bans": { fr: "Top bans", en: "Top bans" },
  "how.anatomy.bansDesc": {
    fr: "Les brawlers à interdire en priorité sur cette map.",
    en: "Brawlers to ban first on this map.",
  },

  // How-it-works — columns
  "how.columns.title": {
    fr: "Les 4 colonnes en détail",
    en: "The 4 columns in detail",
  },

  "how.col.combined.title": { fr: "Combiné IA", en: "Combined AI" },
  "how.col.combined.what": {
    fr: "Le score global qui mixe les 3 autres dimensions. C'est ce qu'on recommande comme \"meilleur pick\" toutes choses considérées.",
    en: "The global score blending the other 3 dimensions. This is the recommended \"best pick\" all things considered.",
  },
  "how.col.combined.formula": {
    fr: "score = 0.4 × solo + 0.3 × synergie + 0.3 × counter",
    en: "score = 0.4 × solo + 0.3 × synergy + 0.3 × counter",
  },
  "how.col.combined.example": {
    fr: "Si un brawler a solo 60 %, synergie 65 %, counter 75 %, son score combiné = 0.4·60 + 0.3·65 + 0.3·75 = 66.",
    en: "If a brawler has solo 60 %, synergy 65 %, counter 75 %, their combined score = 0.4·60 + 0.3·65 + 0.3·75 = 66.",
  },

  "how.col.map.title": { fr: "Meilleurs sur la map", en: "Best on map" },
  "how.col.map.what": {
    fr: "Le WR brut de chaque brawler sur cette map, agrégé sur les ~5 dernières saisons. Ignore ce qui est déjà pické.",
    en: "Raw WR of each brawler on this map, aggregated over the last ~5 seasons. Ignores existing picks.",
  },
  "how.col.map.formula": {
    fr: "solo(b, m) = sigmoid( mapBase[m,b] + bias[b] )",
    en: "solo(b, m) = sigmoid( mapBase[m,b] + bias[b] )",
  },
  "how.col.map.example": {
    fr: "Sur Hard Rock Mine, RICO a un solo de 64 %. Il est fort sur la map sans rien savoir des compos.",
    en: "On Hard Rock Mine, RICO has a 64 % solo WR. Strong on the map regardless of comps.",
  },

  "how.col.syn.title": { fr: "Synergie alliés", en: "Ally synergy" },
  "how.col.syn.what": {
    fr: "Le WR moyen quand un brawler est dans la même équipe que les alliés pickés, calculé sur des données globales (toutes maps confondues) pour que le choix de la map ne masque pas l'effet synergie.",
    en: "Average WR when a brawler is teamed with the picked allies, computed on global data (all maps combined) so the map choice doesn't mask the synergy effect.",
  },
  "how.col.syn.formula": {
    fr: "synergie(X) = moyenne sur alliés a:  sigmoid( bias[X] + S[X] · S[a] )",
    en: "synergy(X) = mean over allies a:  sigmoid( bias[X] + S[X] · S[a] )",
  },
  "how.col.syn.example": {
    fr: "S[X]·S[a] est un produit scalaire entre deux vecteurs de 16 dims. Plus c'est élevé, plus les deux brawlers se complètent dans une équipe. Le modèle l'apprend tout seul à partir des WR pairwise.",
    en: "S[X]·S[a] is a dot product between two 16-dim vectors. The higher it is, the better the two brawlers complement each other in a team. The model learns this on its own from pairwise WRs.",
  },

  "how.col.cnt.title": { fr: "Counter ennemis", en: "Enemy counters" },
  "how.col.cnt.what": {
    fr: "Le WR moyen quand un brawler affronte les ennemis pickés, calculé sur des données globales (toutes maps confondues) pour que la compo ennemie change vraiment le classement.",
    en: "Average WR when a brawler faces the picked enemies, computed on global data (all maps combined) so the enemy comp actually drives the ranking.",
  },
  "how.col.cnt.formula": {
    fr: "counter(X) = moyenne sur ennemis e:  sigmoid( bias[X] − bias[e] + O[X]·D[e] − O[e]·D[X] )",
    en: "counter(X) = mean over enemies e:  sigmoid( bias[X] − bias[e] + O[X]·D[e] − O[e]·D[X] )",
  },
  "how.col.cnt.example": {
    fr: "O[X]·D[e] mesure à quel point l'offensive de X exploite les faiblesses défensives de e. Le terme symétrique O[e]·D[X] est soustrait : si l'ennemi te punit en même temps, ton avantage net est plus faible.",
    en: "O[X]·D[e] measures how well X's offense exploits e's defensive weaknesses. The symmetric O[e]·D[X] is subtracted: if the enemy also punishes you, your net advantage shrinks.",
  },

  "how.col.shared.formula": { fr: "Formule", en: "Formula" },
  "how.col.shared.example": { fr: "Exemple", en: "Example" },

  // How-it-works — model
  "how.model.title": { fr: "Et le modèle d'IA, c'est quoi ?", en: "And the AI model — what is it?" },
  "how.model.intro": {
    fr: "Un modèle de Matrix Factorization. Pour chaque brawler il apprend 3 petits vecteurs (16 dims chacun) et quelques scalaires :",
    en: "A Matrix Factorization model. For each brawler it learns 3 small vectors (16 dims each) and a few scalars:",
  },
  "how.model.O": { fr: "O — embedding offensif", en: "O — offensive embedding" },
  "how.model.Odesc": { fr: "ce que ce brawler sait punir", en: "what this brawler knows how to punish" },
  "how.model.D": { fr: "D — embedding défensif", en: "D — defensive embedding" },
  "how.model.Ddesc": { fr: "à quoi ce brawler résiste", en: "what this brawler resists" },
  "how.model.S": { fr: "S — embedding de synergie", en: "S — synergy embedding" },
  "how.model.Sdesc": { fr: "comment il complète une compo", en: "how it complements a comp" },
  "how.model.bias": { fr: "bias — force globale", en: "bias — global strength" },
  "how.model.biasdesc": { fr: "au-dessus ou en-dessous du WR 50 %", en: "above or below the 50 % WR baseline" },
  "how.model.mapB": { fr: "mapBase[m,b] — bonus/malus map", en: "mapBase[m,b] — per-map bonus/penalty" },
  "how.model.mapBdesc": { fr: "modulation spécifique map × brawler", en: "specific map × brawler modulation" },
  "how.model.trained": {
    fr: "Entraîné sur ~150 000 paires (brawler, brawler, map) du backend de brawltime.ninja, filtrées aux 5 dernières saisons. Test MAE 4 à 7 % selon le bucket ELO.",
    en: "Trained on ~150,000 (brawler, brawler, map) pairs from the brawltime.ninja backend, filtered to the last 5 seasons. Test MAE 4 to 7 % depending on the ELO bucket.",
  },
  "how.model.classes": {
    fr: "Bonus marrant : sans qu'on lui dise ce qu'est une « classe », le modèle regroupe les brawlers similaires dans ses embeddings. Les snipers ont des O proches, les tanks des S proches.",
    en: "Fun bonus: without being told what a \"class\" is, the model clusters similar brawlers in its embeddings. Snipers have similar O vectors, tanks share S vectors.",
  },

  // Per-step indicators
  "how.step": { fr: "Étape", en: "Step" },

  // View-mode toggle (raw WR vs specific ΔWR)
  "view.raw": { fr: "Brut WR", en: "Raw WR" },
  "view.delta": { fr: "Spécifique ΔWR", en: "Specific ΔWR" },
  "view.help.raw": {
    fr: "Win rate observé brut — cohérent avec les per-ennemis, mais les méta brawlers dominent.",
    en: "Raw observed win rate — consistent with per-enemy lists but meta brawlers dominate.",
  },
  "view.help.delta": {
    fr: "Win rate au-dessus de la baseline du brawler — fait ressortir les counters spécifiques.",
    en: "Win rate above the brawler's baseline — surfaces specific counters that meta picks hide.",
  },

  // Badge labels (the {n} / {name} placeholders are replaced client-side)
  "badge.topCounter": { fr: "+{n} pp vs", en: "+{n} pp vs" },
  "badge.topMap": { fr: "Top map", en: "Top map" },
  "badge.topSynergy": { fr: "Synergie", en: "Synergy" },
  "badge.missingRole": { fr: "Rôle manquant", en: "Missing role" },
  "badge.hardCounter": { fr: "Hard counter", en: "Hard counter" },
  "badge.metaPick": { fr: "Méta", en: "Meta" },

  // Hard counter reason labels (shown in tooltip)
  "hc.diveSniper": { fr: "Dive sur sniper", en: "Dive on sniper" },
  "hc.diveThrower": { fr: "Dive sur thrower", en: "Dive on thrower" },
  "hc.tankMelter": { fr: "Tank melter", en: "Tank melter" },
  "hc.antiAssassin": { fr: "Anti-assassin", en: "Anti-assassin" },
  "hc.wallBreak": { fr: "Casse les murs", en: "Wall breaker" },
  "hc.kiteTank": { fr: "Kite les tanks", en: "Kites tanks" },
  "hc.ccSniper": { fr: "CC sniper", en: "CC sniper" },
  "hc.ccAssassin": { fr: "CC assassin", en: "CC assassin" },
} satisfies Record<string, Dict>;

export type StringKey = keyof typeof STRINGS;

export function translate(key: StringKey, locale: Locale): string {
  const entry = STRINGS[key];
  return entry[locale] ?? entry[DEFAULT_LOCALE] ?? key;
}
