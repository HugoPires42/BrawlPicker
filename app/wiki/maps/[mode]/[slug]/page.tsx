"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import BrawlerAvatar from "@/components/BrawlerAvatar";
import BucketSelector from "@/components/BucketSelector";
import { useI18n } from "@/components/I18nProvider";
import { type Bucket } from "@/lib/buckets";
import { slugify } from "@/lib/wikiData";
import type { Brawler, BanRow, GameMap } from "@/lib/types";
import type { StringKey } from "@/lib/i18n";

type NamedWR = { name: string; winRate: number; picks: number };
type Archetype = "sniperOpen" | "tankClose" | "assassinControl" | "mixed";

type MapPayload = {
  map: GameMap;
  bucket: Bucket;
  archetype: Archetype;
  topBrawlers: NamedWR[];
  bans: BanRow[];
};

const ARCH_LABEL: Record<Archetype, StringKey> = {
  sniperOpen: "arch.sniperOpen",
  tankClose: "arch.tankClose",
  assassinControl: "arch.assassinControl",
  mixed: "arch.mixed",
};

const ARCH_STRAT: Record<Archetype, StringKey> = {
  sniperOpen: "strat.sniperOpen",
  tankClose: "strat.tankClose",
  assassinControl: "strat.assassinControl",
  mixed: "strat.mixed",
};

export default function MapDetail({
  params,
}: {
  params: Promise<{ mode: string; slug: string }>;
}) {
  const { mode, slug } = use(params);
  const { t } = useI18n();
  const [data, setData] = useState<MapPayload | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [allBrawlers, setAllBrawlers] = useState<Brawler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brawlers")
      .then((r) => r.json())
      .then((d) => setAllBrawlers(d.brawlers));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wiki/map/${mode}/${slug}?bucket=${bucket}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [mode, slug, bucket]);

  const byCube = useMemo(
    () => new Map(allBrawlers.map((b) => [b.cubeName, b])),
    [allBrawlers]
  );

  if (loading && !data) {
    return (
      <div className="card text-sm text-muted text-center py-12">
        Loading…
      </div>
    );
  }
  if (!data || !data.map) {
    return (
      <div className="card text-bad text-sm">
        Map introuvable.
      </div>
    );
  }

  const m = data.map;
  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/wiki/maps" className="text-muted hover:text-accent">
          ← {t("wiki.maps.title")}
        </Link>
      </div>

      <header className="card flex flex-col md:flex-row gap-5 items-center md:items-start">
        <div className="relative w-48 h-60 rounded-lg overflow-hidden bg-panel2 ring-1 ring-border shrink-0">
          <Image
            src={m.imageUrl}
            alt={m.name}
            fill
            sizes="192px"
            className="object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">{m.name}</h1>
          <div
            className="text-xs uppercase tracking-wide mt-1"
            style={{ color: m.modeColor }}
          >
            {m.modeName}
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <div className="text-[10px] uppercase text-muted">
                {t("wiki.map.archetype")}
              </div>
              <div className="text-sm font-semibold">
                {t(ARCH_LABEL[data.archetype])}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted">
                {t("wiki.map.strategy")}
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-2xl">
                {t(ARCH_STRAT[data.archetype])}
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <BucketSelector value={bucket} onChange={setBucket} />
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="text-sm uppercase tracking-wide text-muted">
            {t("wiki.map.topBrawlers")}
          </h2>
          <p className="text-[10px] text-muted mb-3">
            {t("wiki.map.topBrawlers.subtitle")}
          </p>
          <ul className="space-y-1.5">
            {data.topBrawlers.slice(0, 10).map((b, i) => {
              const br = byCube.get(b.name);
              return (
                <li key={b.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted w-4 text-right">
                    {i + 1}
                  </span>
                  <BrawlerAvatar
                    brawler={br}
                    cubeName={b.name}
                    size={28}
                  />
                  <Link
                    href={`/wiki/brawlers/${slugify(b.name)}`}
                    className="text-xs font-medium flex-1 truncate hover:text-accent transition"
                  >
                    {br?.name ?? b.name}
                  </Link>
                  <div className="flex-1 h-1 bg-panel2 rounded">
                    <div
                      className="h-full bg-good/60 rounded"
                      style={{ width: `${b.winRate * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-good tabular-nums w-10 text-right">
                    {(b.winRate * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-sm uppercase tracking-wide text-bad mb-3">
            {t("wiki.map.topBans")}
          </h2>
          <ul className="space-y-1.5">
            {data.bans.slice(0, 10).map((b, i) => {
              const br = byCube.get(b.brawler);
              const tier =
                i < 3 ? "text-bad" : i < 6 ? "text-accent" : "text-muted";
              return (
                <li key={b.brawler} className="flex items-center gap-2">
                  <span
                    className={"text-[10px] w-4 text-right font-bold " + tier}
                  >
                    {i + 1}
                  </span>
                  <BrawlerAvatar
                    brawler={br}
                    cubeName={b.brawler}
                    size={28}
                  />
                  <Link
                    href={`/wiki/brawlers/${slugify(b.brawler)}`}
                    className="text-xs font-medium flex-1 truncate hover:text-accent transition"
                  >
                    {br?.name ?? b.brawler}
                  </Link>
                  <span className="text-xs font-bold text-good tabular-nums">
                    {(b.winRate * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
