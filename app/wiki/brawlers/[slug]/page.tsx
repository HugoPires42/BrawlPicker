"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import BrawlerAvatar from "@/components/BrawlerAvatar";
import BucketSelector from "@/components/BucketSelector";
import { useI18n } from "@/components/I18nProvider";
import { type Bucket } from "@/lib/buckets";
import { slugify } from "@/lib/wikiData";
import type { Brawler } from "@/lib/types";

type BuildItem = {
  id: string;
  winRate: number;
  picks: number;
  name?: string;
  description?: string;
};

type MapHit = {
  mode: string;
  map: string;
  winRate: number;
  picks: number;
  name?: string;
  modeName?: string;
  modeColor?: string;
  imageUrl?: string;
};
type NamedWR = { name: string; winRate: number; picks: number };

type BrawlerPayload = {
  brawler: Brawler;
  detail: {
    description: string;
    rarity?: string;
    rarityColor?: string;
    className?: string;
    gadgets: { id: number; name: string; imageUrl: string }[];
    starPowers: { id: number; name: string; imageUrl: string }[];
  } | null;
  baseline: number | null;
  bucket: Bucket;
  bestBuild: {
    gadgets: BuildItem[];
    starPowers: BuildItem[];
    gears: BuildItem[];
  };
  bestMaps: MapHit[];
  bestAllies: NamedWR[];
  worstEnemies: NamedWR[];
  bestEnemies: NamedWR[];
};

export default function BrawlerDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t } = useI18n();
  const [data, setData] = useState<BrawlerPayload | null>(null);
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
    fetch(`/api/wiki/brawler/${slug}?bucket=${bucket}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [slug, bucket]);

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

  if (!data || !data.brawler) {
    return (
      <div className="card text-bad text-sm">
        Brawler introuvable.
      </div>
    );
  }

  const b = data.brawler;
  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/wiki/brawlers" className="text-muted hover:text-accent">
          ← {t("wiki.brawlers.title")}
        </Link>
      </div>

      <header className="card flex flex-col md:flex-row items-center md:items-start gap-5">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-panel2 ring-2 ring-border shrink-0">
          <Image
            src={b.imageUrl}
            alt={b.name}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">{b.name}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            {b.className && (
              <span>
                <span className="text-muted">{t("wiki.brawler.class")}: </span>
                <span className="font-semibold">{b.className}</span>
              </span>
            )}
            {b.rarity && (
              <span>
                <span className="text-muted">
                  {t("wiki.brawler.rarity")}:{" "}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: data.detail?.rarityColor }}
                >
                  {b.rarity}
                </span>
              </span>
            )}
            {data.baseline != null && (
              <span>
                <span className="text-muted">
                  {t("wiki.brawler.baseline")}:{" "}
                </span>
                <span className="font-semibold text-good">
                  {(data.baseline * 100).toFixed(1)}%
                </span>
              </span>
            )}
          </div>
          {data.detail?.description && (
            <p className="text-sm text-muted mt-3 max-w-3xl leading-relaxed">
              {data.detail.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <BucketSelector value={bucket} onChange={setBucket} />
        </div>
      </header>

      {/* Best build */}
      <section className="card">
        <h2 className="text-sm uppercase tracking-wide text-muted">
          {t("wiki.brawler.bestBuild")}
        </h2>
        <p className="text-xs text-muted mt-1">
          {t("wiki.brawler.bestBuild.subtitle")}
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <BuildPanel
            label={t("wiki.brawler.bestGadget")}
            items={data.bestBuild.gadgets}
            tone="bg-accent/15 border-accent/40"
          />
          <BuildPanel
            label={t("wiki.brawler.bestStarpower")}
            items={data.bestBuild.starPowers}
            tone="bg-good/15 border-good/40"
          />
          <BuildPanel
            label={t("wiki.brawler.bestGears")}
            items={data.bestBuild.gears}
            tone="bg-[#8b9aff]/15 border-[#8b9aff]/40"
          />
        </div>
      </section>

      {/* Best maps */}
      {data.bestMaps.length > 0 && (
        <section className="card">
          <h2 className="text-sm uppercase tracking-wide text-muted mb-3">
            {t("wiki.brawler.bestMaps")}
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {data.bestMaps.map((m) => (
              <li
                key={m.mode + "::" + m.map}
                className="flex items-center gap-3 p-2 rounded-lg border border-border bg-panel2/40"
              >
                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-panel shrink-0 ring-1 ring-border">
                  {m.imageUrl && (
                    <Image
                      src={m.imageUrl}
                      alt={m.name ?? m.map}
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.name ?? m.map}
                  </div>
                  {m.modeName && (
                    <div
                      className="text-[10px] uppercase tracking-wide"
                      style={{ color: m.modeColor }}
                    >
                      {m.modeName}
                    </div>
                  )}
                  <div className="h-1 mt-1 bg-panel rounded">
                    <div
                      className="h-full bg-good/70 rounded"
                      style={{ width: `${m.winRate * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-good tabular-nums w-12 text-right shrink-0">
                  {(m.winRate * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Synergies + matchups */}
      <div className="grid md:grid-cols-3 gap-4">
        <MatchupList
          title={t("wiki.brawler.bestAllies")}
          tone="text-good"
          items={data.bestAllies}
          byCube={byCube}
          good
        />
        <MatchupList
          title={t("wiki.brawler.easyMatchups")}
          tone="text-accent"
          items={data.bestEnemies}
          byCube={byCube}
          good
        />
        <MatchupList
          title={t("wiki.brawler.hardCounters")}
          tone="text-bad"
          items={data.worstEnemies}
          byCube={byCube}
          good={false}
        />
      </div>

      {(!data.bestBuild.gadgets.length &&
        !data.bestBuild.starPowers.length &&
        !data.bestMaps.length) && (
        <div className="card text-sm text-muted text-center py-6">
          {t("wiki.brawler.noStats")}
        </div>
      )}
    </div>
  );
}

function BuildPanel({
  label,
  items,
  tone,
}: {
  label: string;
  items: BuildItem[];
  tone: string;
}) {
  return (
    <div className={"rounded-xl border p-3 " + tone}>
      <div className="text-[10px] uppercase tracking-wide text-muted mb-2">
        {label}
      </div>
      {items.length === 0 ? (
        <div className="text-[11px] text-muted">—</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">
                  {it.name ?? `#${it.id}`}
                </span>
                <span className="text-good font-bold tabular-nums shrink-0">
                  {(it.winRate * 100).toFixed(1)}%
                </span>
              </div>
              {it.description && (
                <p className="text-[10px] text-muted mt-0.5 leading-relaxed line-clamp-3">
                  {it.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchupList({
  title,
  tone,
  items,
  byCube,
  good,
}: {
  title: string;
  tone: string;
  items: NamedWR[];
  byCube: Map<string, Brawler>;
  good: boolean;
}) {
  return (
    <section className="card">
      <h3 className={"text-xs uppercase tracking-wide font-bold mb-3 " + tone}>
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((m) => {
          const br = byCube.get(m.name);
          return (
            <li
              key={m.name}
              className="flex items-center gap-2"
            >
              <BrawlerAvatar
                brawler={br}
                cubeName={m.name}
                size={28}
              />
              <Link
                href={`/wiki/brawlers/${slugify(m.name)}`}
                className="text-xs font-medium flex-1 truncate hover:text-accent transition"
              >
                {br?.name ?? m.name}
              </Link>
              <span
                className={
                  "text-xs font-bold tabular-nums " +
                  (good ? "text-good" : "text-bad")
                }
              >
                {(m.winRate * 100).toFixed(0)}%
              </span>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-[11px] text-muted">—</li>
        )}
      </ul>
    </section>
  );
}
