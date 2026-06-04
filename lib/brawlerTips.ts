/**
 * Hand-curated "how to play" + "how to play against" tips, by brawler.
 * Fallback: class-based generic tips. Two locales (fr / en).
 *
 * Add a new brawler entry here when their playstyle is distinctive and
 * the generic class fallback doesn't capture it. Keep entries to ~2-3
 * concise sentences each.
 */
export type Tips = { howToPlay: string; howToPlayAgainst: string };
export type LocalizedTips = { fr: Tips; en: Tips };

const BRAWLER_TIPS: Record<string, LocalizedTips> = {
  EDGAR: {
    fr: {
      howToPlay:
        "Joue tes supers pour dive les snipers et brawlers fragiles isolés du back-line. Charge ton super via le combat ou en attendant — évite de t'engager sans lui. Recule après chaque trade pour exploiter ta régénération.",
      howToPlayAgainst:
        "Reste groupé et garde un anti-dive (Shelly, Bull, Bo). Force-le à dépenser son super sur une cible non-prioritaire. Évite d'engager à HP bas — c'est son terrain de chasse.",
    },
    en: {
      howToPlay:
        "Use your super to dive snipers and squishy backline targets. Charge it via combat or waiting — don't engage without it. Disengage after each trade to leverage your healing.",
      howToPlayAgainst:
        "Stay grouped and bring an anti-dive (Shelly, Bull, Bo). Bait his super onto a low-priority target. Don't engage at low HP — that's where he lives.",
    },
  },
  MORTIS: {
    fr: {
      howToPlay:
        "Dash autour des angles pour briser les lignes de vue des snipers. Ton super recharge avec tes attaques de base — enchaîne plusieurs hits sur les low-HP. Tu domines les ranges, tu galères contre les tanks et shotgunners.",
      howToPlayAgainst:
        "Prends un shotgun (Shelly, Bull, Buster). Reste près des murs et coince-le. Évite les corridors étroits où il peut dash-engager sans répliquer.",
    },
    en: {
      howToPlay:
        "Dash around angles to break sniper sightlines. Your super charges from auto-attacks — chain hits on low-HP targets. You dominate ranges, struggle vs tanks and shotguns.",
      howToPlayAgainst:
        "Pick a shotgun (Shelly, Bull, Buster). Stay near walls and corner him. Avoid narrow corridors where he can dash-engage without retaliation.",
    },
  },
  PIPER: {
    fr: {
      howToPlay:
        "Tiens les longues distances et punis les ennemis dans les couloirs. Ton super offre du repositionnement — utilise-le pour fuir ou pour atteindre un meilleur angle. Évite les engagements rapprochés à tout prix.",
      howToPlayAgainst:
        "Closing the gap est ta priorité : assassins (Edgar, Mortis, Stu) et brawlers à mobilité explosent Piper. Utilise les murs pour bloquer sa vue.",
    },
    en: {
      howToPlay:
        "Hold long ranges and punish enemies caught in lanes. Your super is repositioning — use it to escape or get a better angle. Avoid close-quarters fights at all costs.",
      howToPlayAgainst:
        "Closing the gap is the priority: assassins (Edgar, Mortis, Stu) and high-mobility brawlers crush Piper. Use walls to block her sightline.",
    },
  },
  SHELLY: {
    fr: {
      howToPlay:
        "Shotgun courte portée à fort burst. Ton super traverse les murs et déstabilise — utilise-le pour ouvrir une fight ou nettoyer une zone. Anti-assassin naturelle ; reste près des angles.",
      howToPlayAgainst:
        "Range-la (Piper, Brock, Mandy). Ne t'engage jamais en face-à-face à mid-range. Force-la à utiliser son super sur une cible secondaire avant de pousser.",
    },
    en: {
      howToPlay:
        "Short-range shotgun with high burst. Your super pierces walls and stuns — use it to open a fight or clear a zone. Natural anti-assassin; stay near angles.",
      howToPlayAgainst:
        "Range her out (Piper, Brock, Mandy). Never engage face-to-face at mid-range. Bait her super onto a secondary target before pushing.",
    },
  },
  COLT: {
    fr: {
      howToPlay:
        "Range moyen-long, gros DPS sur cible fixe. Casse les murs avec ton super pour ouvrir la map. Reste mobile, c'est ton hitbox qui te tue.",
      howToPlayAgainst:
        "Restez en mouvement et utilisez les murs. Les tanks (Frank, Rosa) absorbent ses dégâts et peuvent l'écraser une fois proches.",
    },
    en: {
      howToPlay:
        "Mid-to-long range with massive DPS on stationary targets. Break walls with your super to open the map. Stay mobile — your hitbox is your weakness.",
      howToPlayAgainst:
        "Keep moving and use walls. Tanks (Frank, Rosa) absorb his damage and crush him once they close.",
    },
  },
  BULL: {
    fr: {
      howToPlay:
        "Tank shotgun avec gros HP. Charge ton super en encaissant ou en dealant — utilise-le pour traverser les murs et engager les snipers. Anti-assassin et anti-thrower naturel.",
      howToPlayAgainst:
        "Kite-le avec du range. Les snipers (Piper, Brock) et brawlers à recul (Carl, Crow) le tiennent à distance.",
    },
    en: {
      howToPlay:
        "Tanky shotgun. Charge your super by tanking or dealing — use it to wall-break and engage snipers. Natural anti-assassin and anti-thrower.",
      howToPlayAgainst:
        "Kite him with range. Snipers (Piper, Brock) and pushback brawlers (Carl, Crow) keep him at bay.",
    },
  },
  FRANK: {
    fr: {
      howToPlay:
        "Tank lourd à mêlée. Ton super stun toute une zone — vise-le sur 2+ ennemis groupés. Vulnérable durant ton wind-up : protège-toi avec un mur ou un coéquipier.",
      howToPlayAgainst:
        "Tank-melter direct (Colette, Bibi, Piper). Évite d'être groupé — son super punit l'amas. Coupe-lui son wind-up avec un stun ou un knockback.",
    },
    en: {
      howToPlay:
        "Heavy melee tank. Your super stuns an area — land it on 2+ grouped enemies. Vulnerable during wind-up: shield with a wall or teammate.",
      howToPlayAgainst:
        "Direct tank melters (Colette, Bibi, Piper). Don't stack — his super punishes clusters. Interrupt his wind-up with a stun or knockback.",
    },
  },
  BO: {
    fr: {
      howToPlay:
        "Control via mines (super) et vision dégagée. Place tes mines sur les choke-points et les routes d'engage. Strong vs assassins (qui prennent les mines).",
      howToPlayAgainst:
        "Évite les choke-points évidents. Casse ses mines avec une attaque chargée, ou contourne avec un brawler à mobilité.",
    },
    en: {
      howToPlay:
        "Control through mines (super) and open vision. Place mines on choke points and engage paths. Strong vs assassins (who eat the mines).",
      howToPlayAgainst:
        "Avoid obvious choke points. Detonate his mines with a charged shot, or flank with a high-mobility brawler.",
    },
  },
  DYNAMIKE: {
    fr: {
      howToPlay:
        "Thrower par-dessus les murs. Idéal sur les maps fermées (Heist, Brawl Ball). Évite les espaces ouverts où tu te fais punir par les snipers.",
      howToPlayAgainst:
        "Anti-thrower : Edgar dive, Bull wallbreak, ou Carl/Crow pour le kite. Casse les murs pour le forcer hors couverture.",
    },
    en: {
      howToPlay:
        "Wall-throwing brawler. Best on enclosed maps (Heist, Brawl Ball). Avoid open lanes where snipers punish you.",
      howToPlayAgainst:
        "Anti-throwers: Edgar dive, Bull wall-break, or Carl/Crow to kite. Break walls to force him into the open.",
    },
  },
  POCO: {
    fr: {
      howToPlay:
        "Support avec heal en zone. Reste près de tes alliés tank/assassin pour les tenir en vie. Ton super heal allies + dégâts ennemis — combo offensif sous-estimé.",
      howToPlayAgainst:
        "Burst-le rapidement avant qu'il puisse heal. Les assassins (Edgar, Mortis) le dévorent.",
    },
    en: {
      howToPlay:
        "Support with AoE heal. Stay close to your tanks/assassins to keep them alive. Your super heals allies AND damages enemies — underrated offensive combo.",
      howToPlayAgainst:
        "Burst him fast before he can heal. Assassins (Edgar, Mortis) eat him alive.",
    },
  },
  DAMIAN: {
    fr: {
      howToPlay:
        "Pick méta polyvalent — fort sur quasi toutes les maps ranked actuelles. Tient le mid avec un bon contrôle d'espace. Joue safe les early fights, snowball avec ton super.",
      howToPlayAgainst:
        "Ban-le en priorité. Sinon, joue des compos qui le pressure constamment et évite les longues lanes ouvertes qu'il contrôle.",
    },
    en: {
      howToPlay:
        "Versatile meta pick — strong on almost every current ranked map. Holds mid with good space control. Play early fights safe, snowball with your super.",
      howToPlayAgainst:
        "Ban first. Otherwise, run comps that pressure him constantly and avoid long open lanes he controls.",
    },
  },
  GLOWY: {
    fr: {
      howToPlay:
        "DPS distance, top tier actuel. Garde tes lignes de vue et punis les engagements adverses. Map-dependent : préfère les maps mid-range avec des angles.",
      howToPlayAgainst:
        "Dive ou range supérieur — assassins ou snipers extrêmes. Ne lui laisse pas le contrôle des angles principaux.",
    },
    en: {
      howToPlay:
        "Range DPS, current top tier. Hold sightlines and punish enemy engages. Map-dependent: prefers mid-range maps with angles.",
      howToPlayAgainst:
        "Dive her or out-range her — assassins or extreme snipers. Don't let her control the main angles.",
    },
  },
};

export const CLASS_TIPS: Record<string, LocalizedTips> = {
  Assassin: {
    fr: {
      howToPlay:
        "Cible toujours le brawler le plus fragile derrière la ligne ennemie. Engage avec ton super (mobilité ou burst) puis disengage avant de te faire focus.",
      howToPlayAgainst:
        "Groupe-toi avec ton équipe pour rendre les dive coûteux. Prends un anti-assassin (Shelly, Bull, Rosa) et garde tes supers prêts pour la riposte.",
    },
    en: {
      howToPlay:
        "Always target the squishiest brawler behind the enemy line. Engage with your super (mobility or burst) then disengage before getting focused.",
      howToPlayAgainst:
        "Group up to make dives costly. Bring an anti-assassin (Shelly, Bull, Rosa) and save supers for the punish.",
    },
  },
  Marksman: {
    fr: {
      howToPlay:
        "Tiens les lignes de vue longues et punis les ennemis exposés. Reste mobile entre les angles, évite les engagements rapprochés.",
      howToPlayAgainst:
        "Closing the gap est la clé. Mobilité (assassins) ou couverture (murs, tanks) pour fermer la distance sans perdre trop d'HP.",
    },
    en: {
      howToPlay:
        "Hold long sightlines and punish exposed enemies. Stay mobile between angles, avoid close-quarters fights.",
      howToPlayAgainst:
        "Closing the gap is key. Use mobility (assassins) or cover (walls, tanks) to close in without bleeding HP.",
    },
  },
  Tank: {
    fr: {
      howToPlay:
        "Absorbe les dégâts pour ton équipe. Ton super est ta vitesse d'engagement — utilise-le pour ouvrir une fight ou casser un mur.",
      howToPlayAgainst:
        "Kite avec du range et de la mobilité. Évite les corridors étroits. Les tank-melters (Colette, Bibi) coupent leur valeur direct.",
    },
    en: {
      howToPlay:
        "Soak damage for your team. Your super is your engage speed — use it to open a fight or break a wall.",
      howToPlayAgainst:
        "Kite with range and mobility. Avoid tight corridors. Tank-melters (Colette, Bibi) shred them directly.",
    },
  },
  "Damage Dealer": {
    fr: {
      howToPlay:
        "DPS polyvalent à range moyenne. Trouve le bon angle, dis-engage si focus. Ton super varie — exploite-le selon la situation.",
      howToPlayAgainst:
        "Pression constante via mobilité ou range supérieure. Ne le laisse pas s'installer en mid.",
    },
    en: {
      howToPlay:
        "Versatile mid-range DPS. Find your angle, disengage if focused. Your super varies — exploit it situationally.",
      howToPlayAgainst:
        "Constant pressure via mobility or superior range. Don't let them settle in mid.",
    },
  },
  Support: {
    fr: {
      howToPlay:
        "Reste près de ton équipe — ton heal/utility les garde en vie. Positionne-toi en deuxième ligne, jamais en première.",
      howToPlayAgainst:
        "Burst-le en priorité avant qu'il puisse soutenir. Les assassins le dévorent.",
    },
    en: {
      howToPlay:
        "Stay close to your team — your heal/utility keeps them alive. Position in second line, never first.",
      howToPlayAgainst:
        "Burst him first before he can sustain. Assassins eat him alive.",
    },
  },
  Controller: {
    fr: {
      howToPlay:
        "Contrôle de zone via mines, CC ou utility. Place tes effets sur les choke-points et les routes d'engage attendues.",
      howToPlayAgainst:
        "Évite les choke-points évidents. Contourne avec un brawler à mobilité ou casse ses contrôles avec un tank.",
    },
    en: {
      howToPlay:
        "Zone control via mines, CC, or utility. Place effects on choke points and expected engage paths.",
      howToPlayAgainst:
        "Avoid obvious choke points. Flank with a mobile brawler or break their control with a tank.",
    },
  },
  Artillery: {
    fr: {
      howToPlay:
        "Thrower par-dessus les murs. Maps fermées = ton terrain. Garde un mur entre toi et l'ennemi pour la sécurité.",
      howToPlayAgainst:
        "Anti-thrower : dive (Edgar, Mortis), casse-mur (Bull, Jacky) ou range pour le forcer hors couverture.",
    },
    en: {
      howToPlay:
        "Wall-throwing brawler. Enclosed maps are your terrain. Keep a wall between you and the enemy for safety.",
      howToPlayAgainst:
        "Anti-thrower: dive (Edgar, Mortis), wall-break (Bull, Jacky), or range to force them into the open.",
    },
  },
};

const FALLBACK: LocalizedTips = {
  fr: {
    howToPlay:
      "Apprends ses patterns d'attaque, sa portée et sa charge de super. Joue agressif quand ton super est prêt, safe sinon.",
    howToPlayAgainst:
      "Identifie sa portée et reste en dehors. Force-le à dépenser son super sur une cible secondaire avant de pousser.",
  },
  en: {
    howToPlay:
      "Learn his attack patterns, range, and super charge. Play aggressive when your super is ready, safe otherwise.",
    howToPlayAgainst:
      "Identify his range and stay out of it. Bait his super onto a secondary target before pushing.",
  },
};

export function getTips(
  brawlerCubeName: string,
  className: string | undefined
): LocalizedTips {
  const curated = BRAWLER_TIPS[brawlerCubeName.toUpperCase()];
  if (curated) return curated;
  if (className && CLASS_TIPS[className]) return CLASS_TIPS[className];
  return FALLBACK;
}
