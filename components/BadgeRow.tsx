"use client";
import { useI18n } from "./I18nProvider";
import { displayBrawlerName } from "@/lib/brawlerNames";
import type { Brawler, Badge } from "@/lib/types";
import type { StringKey } from "@/lib/i18n";

type Props = {
  badges: Badge[] | undefined;
  byCube: Map<string, Brawler>;
};

const HC_REASON_KEY: Record<string, StringKey> = {
  diveSniper: "hc.diveSniper",
  diveThrower: "hc.diveThrower",
  tankMelter: "hc.tankMelter",
  antiAssassin: "hc.antiAssassin",
  wallBreak: "hc.wallBreak",
  kiteTank: "hc.kiteTank",
  ccSniper: "hc.ccSniper",
  ccAssassin: "hc.ccAssassin",
};

const TONE: Record<Badge["kind"], string> = {
  topCounter: "bg-bad/20 text-bad border-bad/30",
  topMap: "bg-accent/20 text-accent border-accent/30",
  topSynergy: "bg-good/20 text-good border-good/30",
  missingRole: "bg-[#8b9aff]/20 text-[#8b9aff] border-[#8b9aff]/30",
  hardCounter: "bg-bad/20 text-bad border-bad/30",
  metaPick: "bg-muted/20 text-muted border-muted/30",
};

export default function BadgeRow({ badges, byCube }: Props) {
  const { t, locale } = useI18n();
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.map((b, i) => {
        let text = "";
        if (b.kind === "topCounter") {
          const v = String(b.value ?? "");
          const [pp, against] = v.split("|");
          const base = t("badge.topCounter").replace("{n}", pp);
          text = against
            ? `${base} ${displayBrawlerName(byCube.get(against), against, locale)}`
            : base;
        } else if (b.kind === "topSynergy") {
          const v = String(b.value ?? "");
          const [pp, with_] = v.split("|");
          const base = t("badge.topSynergy") + " " + (pp ? `+${pp}` : "");
          text = with_
            ? `${base} · ${displayBrawlerName(byCube.get(with_), with_, locale)}`
            : base;
        } else if (b.kind === "topMap") {
          text = t("badge.topMap");
        } else if (b.kind === "missingRole") {
          text = t("badge.missingRole");
        } else if (b.kind === "hardCounter") {
          const reasonKey = HC_REASON_KEY[String(b.value ?? "")];
          text =
            t("badge.hardCounter") +
            (reasonKey ? " · " + t(reasonKey) : "");
        } else if (b.kind === "metaPick") {
          text = t("badge.metaPick");
        }
        return (
          <span
            key={i}
            className={
              "text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap " +
              TONE[b.kind]
            }
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
