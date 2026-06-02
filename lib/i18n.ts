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
} satisfies Record<string, Dict>;

export type StringKey = keyof typeof STRINGS;

export function translate(key: StringKey, locale: Locale): string {
  const entry = STRINGS[key];
  return entry[locale] ?? entry[DEFAULT_LOCALE] ?? key;
}
