"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import BadgeRow from "@/components/BadgeRow";
import BrawlerAvatar from "@/components/BrawlerAvatar";
import BrawlerGrid from "@/components/BrawlerGrid";
import BrawlerModal from "@/components/BrawlerModal";
import BrawlerSlot from "@/components/BrawlerSlot";
import BucketSelector from "@/components/BucketSelector";
import MiniCounter from "@/components/MiniCounter";
import ModePicker from "@/components/ModePicker";
import MapGrid from "@/components/MapGrid";
import ViewModeToggle, { type ViewMode } from "@/components/ViewModeToggle";
import { useI18n } from "@/components/I18nProvider";
import { type Bucket } from "@/lib/buckets";
import { slugify } from "@/lib/slug";
import type { StringKey } from "@/lib/i18n";
import type {
  BanRow,
  Brawler,
  CounterRow,
  GameMap,
  GameMode,
  ScoredCandidate,
} from "@/lib/types";

type Step = "mode" | "map" | "draft";
type SlotKind = "enemy" | "ally";
type SlotRef = { kind: SlotKind; index: number };
const SLOTS = 3;

type DraftResp = {
  bucket: Bucket;
  perEnemy: { enemy: string; counters: CounterRow[] }[];
  bans: BanRow[];
  recommendations: ScoredCandidate[];
  topByMap: ScoredCandidate[];
  topBySynergy: ScoredCandidate[];
  topBySynergyDelta: ScoredCandidate[];
  topByCounter: ScoredCandidate[];
  topByCounterDelta: ScoredCandidate[];
  modelLoaded: boolean;
};

const BUCKET_LABEL_KEY: Record<Bucket, StringKey> = {
  all: "bucket.all.label",
  diamond: "bucket.diamond.label",
  mythic: "bucket.mythic.label",
};

export default function DraftPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("mode");

  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [modes, setModes] = useState<GameMode[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [map, setMap] = useState<GameMap | null>(null);

  const [enemies, setEnemies] = useState<(string | null)[]>(
    Array(SLOTS).fill(null)
  );
  const [allies, setAllies] = useState<(string | null)[]>(
    Array(SLOTS).fill(null)
  );
  const [bucket, setBucket] = useState<Bucket>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [wikiSlug, setWikiSlug] = useState<string | null>(null);
  const openWiki = (cubeName: string) => setWikiSlug(slugify(cubeName));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<SlotRef | null>(null);

  const [resp, setResp] = useState<DraftResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/brawlers").then((r) => r.json()),
      fetch("/api/modes").then((r) => r.json()),
      fetch("/api/maps?ranked=true").then((r) => r.json()),
    ])
      .then(([b, m, mp]) => {
        setBrawlers(b.brawlers);
        setModes(m.modes);
        setMaps(mp.maps);
      })
      .catch(() => setErr(t("draft.loadFailed")));
  }, []);

  const byCube = useMemo(
    () => new Map(brawlers.map((b) => [b.cubeName, b])),
    [brawlers]
  );

  const enemiesPicked = useMemo(
    () => enemies.filter((e): e is string => !!e),
    [enemies]
  );
  const alliesPicked = useMemo(
    () => allies.filter((e): e is string => !!e),
    [allies]
  );
  const allPicked = useMemo(
    () => new Set([...enemiesPicked, ...alliesPicked]),
    [enemiesPicked, alliesPicked]
  );

  useEffect(() => {
    if (step !== "draft" || !map || !mode) {
      setResp(null);
      return;
    }
    setLoading(true);
    setErr(null);
    const id = ++reqId.current;
    fetch("/api/draft-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode.cube,
        map: map.cubeName,
        enemies: enemiesPicked,
        allies: alliesPicked,
        bucket,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (id !== reqId.current) return;
        if (d.error) throw new Error(d.error);
        setResp(d);
      })
      .catch((e) => {
        if (id === reqId.current) setErr(String(e.message ?? e));
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [step, mode, map, enemiesPicked, alliesPicked, bucket]);

  const enemyCounters = useMemo(() => {
    const m = new Map<string, CounterRow[]>();
    if (!resp) return m;
    for (const e of resp.perEnemy) m.set(e.enemy, e.counters);
    return m;
  }, [resp]);

  const openPickerFor = (ref: SlotRef) => {
    setPickerTarget(ref);
    setPickerOpen(true);
  };
  const setSlot = (kind: SlotKind, index: number, value: string | null) => {
    if (kind === "enemy") {
      setEnemies((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    } else {
      setAllies((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    }
  };
  const handlePick = (cubeName: string) => {
    if (!pickerTarget) return;
    setSlot(pickerTarget.kind, pickerTarget.index, cubeName);
  };

  const resetPicks = () => {
    setEnemies(Array(SLOTS).fill(null));
    setAllies(Array(SLOTS).fill(null));
  };

  const goToMap = (m: GameMode) => {
    setMode(m);
    setMap(null);
    resetPicks();
    setStep("map");
  };
  const goToDraft = (m: GameMap) => {
    setMap(m);
    resetPicks();
    setStep("draft");
  };
  const backToMode = () => {
    setMode(null);
    setMap(null);
    resetPicks();
    setStep("mode");
  };
  const backToMap = () => {
    setMap(null);
    resetPicks();
    setStep("map");
  };

  if (err && step === "mode") {
    return (
      <div className="card text-bad text-sm">
        {t("draft.error")} {err}
      </div>
    );
  }

  if (step === "mode") {
    if (modes.length === 0) {
      return <div className="text-muted text-sm text-center py-12">Chargement…</div>;
    }
    return <ModePicker modes={modes} onPick={goToMap} />;
  }

  if (step === "map" && mode) {
    return (
      <MapGrid mode={mode} maps={maps} onPick={goToDraft} onBack={backToMode} />
    );
  }

  if (step !== "draft" || !mode || !map) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={backToMode} className="btn-ghost text-xs">
          {t("draft.backToMode")}
        </button>
        <button onClick={backToMap} className="btn-ghost text-xs">
          {t("draft.changeMap")}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {t("draft.eloLabel")}
          </span>
          <BucketSelector value={bucket} onChange={setBucket} />
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Image
            src={map.imageUrl}
            alt=""
            width={44}
            height={44}
            className="rounded-md"
            unoptimized
          />
          <div className="text-right">
            <div className="font-bold">{map.name}</div>
            <div
              className="text-[11px] uppercase tracking-wide"
              style={{ color: mode.color }}
            >
              {mode.name}
            </div>
          </div>
        </div>
        <button onClick={resetPicks} className="btn-ghost text-xs">
          {t("draft.resetPicks")}
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <section className="card">
            <div className="text-[11px] uppercase tracking-wide text-bad mb-3">
              {t("draft.enemyTeam")}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {enemies.map((e, i) => {
                const brawler = e ? byCube.get(e) ?? null : null;
                const counters = e ? enemyCounters.get(e) ?? [] : [];
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2"
                  >
                    <BrawlerSlot
                      brawler={brawler}
                      variant="enemy"
                      size="lg"
                      onClick={() =>
                        openPickerFor({ kind: "enemy", index: i })
                      }
                      onClear={
                        brawler
                          ? () => setSlot("enemy", i, null)
                          : undefined
                      }
                    />
                    <div className="w-full space-y-1 min-h-[120px]">
                      {e && counters.length === 0 && loading && (
                        <div className="text-[10px] text-muted text-center py-3">
                          {t("draft.loading")}
                        </div>
                      )}
                      {counters.slice(0, 4).map((c) => (
                        <MiniCounter
                          key={c.brawler}
                          brawler={byCube.get(c.brawler)}
                          cubeName={c.brawler}
                          winRate={c.winRate}
                          onSelect={openWiki}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="text-[11px] uppercase tracking-wide text-good mb-3">
              {t("draft.yourTeam")}
            </div>
            <div className="grid grid-cols-3 gap-3 justify-items-center">
              {allies.map((a, i) => {
                const brawler = a ? byCube.get(a) ?? null : null;
                return (
                  <BrawlerSlot
                    key={i}
                    brawler={brawler}
                    variant="ally"
                    size="lg"
                    label={i === 0 ? t("draft.you") : t("draft.ally")}
                    onClick={() => openPickerFor({ kind: "ally", index: i })}
                    onClear={
                      brawler ? () => setSlot("ally", i, null) : undefined
                    }
                  />
                );
              })}
            </div>
          </section>

          <RecommendationsPanel
            resp={resp}
            byCube={byCube}
            loading={loading}
            map={map}
            bucket={bucket}
            viewMode={viewMode}
            onSelectBrawler={openWiki}
          />
        </div>

        <BansPanel
          resp={resp}
          byCube={byCube}
          loading={loading}
          map={map}
          onSelectBrawler={openWiki}
        />
      </div>

      <BrawlerGrid
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        brawlers={brawlers}
        onPick={handlePick}
        disabled={allPicked}
        title={
          pickerTarget?.kind === "enemy"
            ? t("draft.pickEnemy")
            : t("draft.pickAlly")
        }
      />

      <BrawlerModal
        slug={wikiSlug}
        onClose={() => setWikiSlug(null)}
        onSwap={openWiki}
      />
    </div>
  );
}

function RecommendationsPanel({
  resp,
  byCube,
  loading,
  map,
  bucket,
  viewMode,
  onSelectBrawler,
}: {
  resp: DraftResp | null;
  byCube: Map<string, Brawler>;
  loading: boolean;
  map: GameMap;
  bucket: Bucket;
  viewMode: ViewMode;
  onSelectBrawler: (cubeName: string) => void;
}) {
  const { t } = useI18n();
  const recs = resp?.recommendations ?? [];
  const byMap = resp?.topByMap ?? [];
  const bySyn =
    viewMode === "delta"
      ? resp?.topBySynergyDelta ?? []
      : resp?.topBySynergy ?? [];
  const byCnt =
    viewMode === "delta"
      ? resp?.topByCounterDelta ?? []
      : resp?.topByCounter ?? [];
  const synMetric: "synergy" | "delta" = viewMode === "delta" ? "delta" : "synergy";
  const cntMetric: "matchup" | "delta" = viewMode === "delta" ? "delta" : "matchup";

  return (
    <section className="card relative">
      {loading && (
        <div className="absolute inset-0 z-10 bg-bg/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="flex items-center gap-2 text-accent text-sm font-semibold animate-pulse">
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="40 20"
                strokeLinecap="round"
              />
            </svg>
            {t("draft.updating")}
          </div>
          <div className="text-[11px] text-muted text-center max-w-xs">
            {t("draft.firstLoadHint")}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className="text-sm uppercase tracking-wide text-muted">
          {t("recs.title")}
        </h2>
        <span className="text-[10px] text-muted">
          {t(BUCKET_LABEL_KEY[bucket])} · {map.name}
        </span>
        {!loading && resp && !resp.modelLoaded && (
          <span className="ml-auto text-[10px] text-muted">
            {t("recs.modelNotLoaded")}
          </span>
        )}
      </div>

      {recs.length === 0 && !loading && (
        <div className="text-sm text-muted py-4 text-center">
          {resp && !resp.modelLoaded
            ? t("recs.mapNotInModel")
            : t("recs.noSignal")}
        </div>
      )}

      {recs.length > 0 && (
        <div
          className={
            "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 transition " +
            (loading ? "opacity-30" : "")
          }
        >
          <RecColumn
            title={t("col.combined.title")}
            tone="accent"
            subtitle={t("col.combined.subtitle")}
            metricKey="score"
            items={recs.slice(0, 10)}
            byCube={byCube}
            onSelectBrawler={onSelectBrawler}
          />
          <RecColumn
            title={t("col.map.title")}
            tone="muted"
            subtitle={t("col.map.subtitle")}
            metricKey="solo"
            items={byMap}
            byCube={byCube}
            onSelectBrawler={onSelectBrawler}
          />
          <RecColumn
            title={t("col.synergy.title")}
            tone="good"
            subtitle={
              bySyn.length > 0
                ? t("col.synergy.subtitleActive") +
                  (viewMode === "delta" ? " · ΔWR" : "")
                : t("col.synergy.subtitleInactive")
            }
            metricKey={synMetric}
            items={bySyn}
            byCube={byCube}
            empty={t("col.synergy.empty")}
            isDelta={viewMode === "delta"}
            onSelectBrawler={onSelectBrawler}
          />
          <RecColumn
            title={t("col.counter.title")}
            tone="bad"
            subtitle={
              byCnt.length > 0
                ? t("col.counter.subtitleActive") +
                  (viewMode === "delta" ? " · ΔWR" : "")
                : t("col.counter.subtitleInactive")
            }
            metricKey={cntMetric}
            items={byCnt}
            byCube={byCube}
            empty={t("col.counter.empty")}
            isDelta={viewMode === "delta"}
            onSelectBrawler={onSelectBrawler}
          />
        </div>
      )}
    </section>
  );
}

type Tone = "accent" | "muted" | "good" | "bad";

function RecColumn({
  title,
  subtitle,
  tone,
  metricKey,
  items,
  byCube,
  empty,
  isDelta = false,
  onSelectBrawler,
}: {
  title: string;
  subtitle: string;
  tone: Tone;
  metricKey: "score" | "solo" | "synergy" | "matchup" | "delta";
  items: ScoredCandidate[];
  byCube: Map<string, Brawler>;
  empty?: string;
  isDelta?: boolean;
  onSelectBrawler: (cubeName: string) => void;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent border-accent/40"
      : tone === "good"
        ? "text-good border-good/40"
        : tone === "bad"
          ? "text-bad border-bad/40"
          : "text-muted border-border";

  function formatValue(p: ScoredCandidate): string {
    const v = p[metricKey] as number | null | undefined;
    if (v == null) return "—";
    if (isDelta) {
      const pp = Math.round(v * 100);
      const sign = pp > 0 ? "+" : "";
      return `${sign}${pp}`;
    }
    return `${(v * 100).toFixed(0)}`;
  }

  return (
    <div className={"rounded-xl border bg-panel2/40 p-3 " + toneClass}>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className={"text-xs uppercase tracking-wide font-bold " + toneClass.split(" ")[0]}>
          {title}
        </h3>
      </div>
      <div className="text-[10px] text-muted mb-2">{subtitle}</div>

      {items.length === 0 ? (
        <RecColumnEmpty fallback={empty} />
      ) : (
        <ul className="space-y-1.5">
          {items.map((p, idx) => {
            const b = byCube.get(p.brawler);
            const top = idx < 3;
            return (
              <li
                key={p.brawler}
                className={
                  "rounded transition hover:bg-panel " +
                  (top ? "bg-panel/60" : "")
                }
              >
                <button
                  onClick={() => onSelectBrawler(p.brawler)}
                  className="flex items-center gap-2 py-1.5 px-2 w-full text-left"
                >
                  <span className="text-[10px] text-muted w-4 text-right tabular-nums shrink-0">
                    {idx + 1}
                  </span>
                  <BrawlerAvatar
                    brawler={b}
                    cubeName={p.brawler}
                    size={30}
                    className="shrink-0"
                  />
                  <span className="text-xs font-medium flex-1 min-w-0 truncate">
                    {b?.name ?? p.brawler}
                  </span>
                  <span
                    className={
                      "text-sm font-bold tabular-nums shrink-0 " +
                      (top ? toneClass.split(" ")[0] : "text-muted")
                    }
                  >
                    {formatValue(p)}
                  </span>
                </button>
                <div className="px-2 pb-1.5">
                  <BadgeRow badges={p.badges} byCube={byCube} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecColumnEmpty({ fallback }: { fallback?: string }) {
  const { t } = useI18n();
  return (
    <div className="text-[11px] text-muted py-4 text-center">
      {fallback ?? t("col.noData")}
    </div>
  );
}

function BansPanel({
  resp,
  byCube,
  loading,
  map,
  onSelectBrawler,
}: {
  resp: DraftResp | null;
  byCube: Map<string, Brawler>;
  loading: boolean;
  map: GameMap;
  onSelectBrawler: (cubeName: string) => void;
}) {
  const { t } = useI18n();
  const bans = resp?.bans ?? [];
  const maxScore = bans.length > 0 ? bans[0].banScore : 1;
  return (
    <section className="card h-fit lg:sticky lg:top-20">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm uppercase tracking-wide text-bad">
          {t("bans.title")}
        </h2>
        <span className="text-[10px] text-muted">{map.name}</span>
        {loading && bans.length === 0 && (
          <span className="ml-auto text-[10px] text-muted animate-pulse">
            …
          </span>
        )}
      </div>
      {bans.length === 0 && !loading && (
        <div className="text-sm text-muted text-center py-4">
          {t("bans.notEnough")}
        </div>
      )}
      <ul className="space-y-1">
        {bans.slice(0, 12).map((b, i) => {
          const br = byCube.get(b.brawler);
          const tier = i < 3 ? "text-bad" : i < 6 ? "text-accent" : "text-muted";
          return (
            <li key={b.brawler} className="rounded hover:bg-panel">
              <button
                onClick={() => onSelectBrawler(b.brawler)}
                className="flex items-center gap-2 py-1.5 px-1 w-full text-left"
              >
                <span className={"w-5 text-right text-xs font-bold " + tier}>
                  {i + 1}
                </span>
                <BrawlerAvatar
                  brawler={br}
                  cubeName={b.brawler}
                  size={28}
                  className="!rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">
                    {br?.name ?? b.brawler}
                  </div>
                  <div className="h-1 mt-1 bg-panel2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bad/70"
                      style={{
                        width: `${(b.banScore / maxScore) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-good tabular-nums">
                  {(b.winRate * 100).toFixed(0)}%
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
