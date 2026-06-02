"use client";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import type { StringKey } from "@/lib/i18n";

// Real Brawlify CDN brawler IDs we use for illustrations.
// These are fan-content-policy-friendly portraits and not used commercially
// here — purely as illustrative examples.
const PORTRAIT = (id: number) =>
  `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
const MAP_IMG = (id: number) =>
  `https://cdn.brawlify.com/maps/regular/${id}.png`;

const SHELLY = PORTRAIT(16000000);
const COLT = PORTRAIT(16000001);
const BULL = PORTRAIT(16000003);
const PIPER = PORTRAIT(16000020);
const EDGAR = PORTRAIT(16000029);
const FRANK = PORTRAIT(16000017);
const RICO = PORTRAIT(16000014);
const POCO = PORTRAIT(16000007);
const MORTIS = PORTRAIT(16000010);
const JESSIE = PORTRAIT(16000016);

const HARD_ROCK_MINE = MAP_IMG(15000007);

export default function HowItWorks() {
  const { t } = useI18n();

  return (
    <div className="space-y-16 pb-12">
      <Hero />

      <Flow />

      <Anatomy />

      <Columns />

      <Model />

      <div className="text-center pt-4">
        <Link href="/draft" className="btn-primary px-5 py-2.5 text-sm">
          {t("how.hero.cta")} →
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────── HERO ────────────────────────────── */

function Hero() {
  const { t } = useI18n();
  return (
    <section className="text-center py-8">
      <div className="inline-block rounded-2xl bg-gradient-to-br from-accent/30 to-accent2/20 p-4 mb-4">
        <CrosshairBig />
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        {t("how.hero.title")}
      </h1>
      <p className="text-muted mt-2 max-w-2xl mx-auto text-sm md:text-base">
        {t("how.hero.subtitle")}
      </p>
    </section>
  );
}

function CrosshairBig() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="17" fill="none" stroke="#0d0f15" strokeWidth="3.5" />
      <circle cx="32" cy="32" r="5" fill="#0d0f15" />
      <line x1="32" y1="6" x2="32" y2="18" stroke="#0d0f15" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="32" y1="46" x2="32" y2="58" stroke="#0d0f15" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="6" y1="32" x2="18" y2="32" stroke="#0d0f15" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="46" y1="32" x2="58" y2="32" stroke="#0d0f15" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/* ────────────────────────────── FLOW ─────────────────────────────── */

function Flow() {
  const { t } = useI18n();
  const steps: { titleKey: StringKey; bodyKey: StringKey; illustration: React.ReactNode }[] = [
    { titleKey: "how.flow.step1.title", bodyKey: "how.flow.step1.body", illustration: <ModeTiles /> },
    { titleKey: "how.flow.step2.title", bodyKey: "how.flow.step2.body", illustration: <MapTile /> },
    { titleKey: "how.flow.step3.title", bodyKey: "how.flow.step3.body", illustration: <EnemySlotIllu /> },
    { titleKey: "how.flow.step4.title", bodyKey: "how.flow.step4.body", illustration: <AllySlotIllu /> },
    { titleKey: "how.flow.step5.title", bodyKey: "how.flow.step5.body", illustration: <ColumnsIllu /> },
  ];

  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold mb-6">{t("how.flow.title")}</h2>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li
            key={i}
            className="card flex flex-col md:flex-row items-start gap-5 md:gap-6"
          >
            <div className="flex items-center gap-3 md:flex-col md:w-20 shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent text-black flex items-center justify-center font-extrabold text-lg">
                {i + 1}
              </div>
              <div className="md:hidden text-xs uppercase text-muted">{t("how.step")}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">{t(s.titleKey)}</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {t(s.bodyKey)}
              </p>
            </div>
            <div className="w-full md:w-72 shrink-0 self-stretch flex items-center justify-center bg-panel2/40 rounded-xl p-3">
              {s.illustration}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ModeTiles() {
  const modes = [
    { name: "Brawl Ball", color: "#83e7ff" },
    { name: "Gem Grab", color: "#d852ff" },
    { name: "Knockout", color: "#f7c842" },
    { name: "Heist", color: "#ff7eb6" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-[240px]">
      {modes.map((m) => (
        <div
          key={m.name}
          className="rounded-lg p-2 border border-border bg-panel"
          style={{ background: `linear-gradient(135deg, ${m.color}25, ${m.color}05)` }}
        >
          <div className="aspect-video rounded bg-panel2/60" />
          <div className="text-[10px] font-bold mt-1 truncate" style={{ color: m.color }}>
            {m.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function MapTile() {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-panel w-32">
      <div className="relative aspect-[4/5] bg-panel2">
        <Image
          src={HARD_ROCK_MINE}
          alt=""
          fill
          sizes="128px"
          className="object-contain"
          unoptimized
        />
      </div>
      <div className="p-2">
        <div className="text-[11px] font-bold truncate">Hard Rock Mine</div>
        <div className="text-[9px] uppercase tracking-wide" style={{ color: "#d852ff" }}>
          Gem Grab
        </div>
      </div>
    </div>
  );
}

function EnemySlotIllu() {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <PortraitRing src={SHELLY} ring="ring-bad/60" />
      <div className="w-full space-y-1">
        <MiniCounterIllu src={EDGAR} name="Edgar" wr="74%" strong />
        <MiniCounterIllu src={PIPER} name="Piper" wr="68%" />
        <MiniCounterIllu src={POCO} name="Poco" wr="62%" />
      </div>
    </div>
  );
}

function AllySlotIllu() {
  return (
    <div className="flex gap-3 items-center">
      <PortraitRing src={POCO} ring="ring-good/60" />
      <div className="text-xs text-muted">
        Poco<br/>
        <span className="text-good">+ synergie</span>
      </div>
      <PortraitRing src={FRANK} ring="ring-good/60" />
    </div>
  );
}

function ColumnsIllu() {
  const cols = [
    { label: "Combiné", tone: "text-accent", border: "border-accent/50" },
    { label: "Map", tone: "text-muted", border: "border-border" },
    { label: "Synergie", tone: "text-good", border: "border-good/40" },
    { label: "Counter", tone: "text-bad", border: "border-bad/40" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 w-full">
      {cols.map((c) => (
        <div key={c.label} className={"rounded p-1.5 border bg-panel2/60 " + c.border}>
          <div className={"text-[9px] uppercase font-bold " + c.tone}>{c.label}</div>
          <div className="mt-1 space-y-0.5">
            <div className="h-1.5 bg-panel rounded" />
            <div className="h-1.5 bg-panel rounded w-3/4" />
            <div className="h-1.5 bg-panel rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── ANATOMY ─────────────────────────── */

function Anatomy() {
  const { t } = useI18n();
  type Zone = { key: StringKey; descKey: StringKey; color: string };
  const zones: Zone[] = [
    { key: "how.anatomy.elo", descKey: "how.anatomy.eloDesc", color: "#ffb000" },
    { key: "how.anatomy.enemies", descKey: "how.anatomy.enemiesDesc", color: "#ff4d6d" },
    { key: "how.anatomy.allies", descKey: "how.anatomy.alliesDesc", color: "#3ecf8e" },
    { key: "how.anatomy.recs", descKey: "how.anatomy.recsDesc", color: "#8b9aff" },
    { key: "how.anatomy.bans", descKey: "how.anatomy.bansDesc", color: "#ff4d6d" },
  ];
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold mb-3">{t("how.anatomy.title")}</h2>
      <p className="text-sm text-muted mb-6">{t("how.anatomy.intro")}</p>

      <div className="grid md:grid-cols-[1fr_320px] gap-5">
        <div className="card p-3 md:p-4 relative overflow-hidden">
          <DraftMockup />
        </div>
        <ul className="space-y-2">
          {zones.map((z, i) => (
            <li key={z.key} className="card flex gap-3 items-start py-3">
              <div
                className="w-6 h-6 rounded-full text-[10px] font-extrabold text-black flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: z.color }}
              >
                {i + 1}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: z.color }}>
                  {t(z.key)}
                </div>
                <div className="text-xs text-muted mt-0.5">{t(z.descKey)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ZoneTag({ n, color, label, className = "" }: { n: number; color: string; label: string; className?: string }) {
  return (
    <div
      className={"inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 " + className}
      style={{ background: color + "20", color, boxShadow: `inset 0 0 0 1px ${color}50` }}
    >
      <span
        className="w-3.5 h-3.5 rounded-full text-[9px] font-extrabold text-black flex items-center justify-center"
        style={{ background: color }}
      >
        {n}
      </span>
      {label}
    </div>
  );
}

function DraftMockup() {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase text-muted">ELO</div>
        <div className="flex items-center gap-px bg-panel2 rounded">
          <span className="px-2 py-0.5 text-[10px] bg-accent text-black rounded-l">All</span>
          <span className="px-2 py-0.5 text-[10px] text-muted">D+</span>
          <span className="px-2 py-0.5 text-[10px] text-muted">M+</span>
        </div>
        <ZoneTag n={1} color="#ffb000" label={t("how.anatomy.elo")} />
        <div className="ml-auto text-[10px] text-muted">Hard Rock Mine · Gem Grab</div>
      </div>
      {/* body */}
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <div className="space-y-2">
          {/* enemies */}
          <div className="rounded-lg border border-bad/30 bg-bad/5 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] uppercase text-bad font-bold">{t("draft.enemyTeam")}</div>
              <ZoneTag n={2} color="#ff4d6d" label={t("how.anatomy.enemies")} />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <MiniSlot src={SHELLY} small />
              <MiniSlot src={COLT} small />
              <MiniSlot empty small />
            </div>
          </div>
          {/* allies */}
          <div className="rounded-lg border border-good/30 bg-good/5 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] uppercase text-good font-bold">{t("draft.yourTeam")}</div>
              <ZoneTag n={3} color="#3ecf8e" label={t("how.anatomy.allies")} />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <MiniSlot src={POCO} small />
              <MiniSlot empty small />
              <MiniSlot empty small />
            </div>
          </div>
          {/* recs */}
          <div className="rounded-lg border border-[#8b9aff]/40 bg-[#8b9aff]/5 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] uppercase font-bold" style={{ color: "#8b9aff" }}>
                {t("recs.title")}
              </div>
              <ZoneTag n={4} color="#8b9aff" label={t("how.anatomy.recs")} />
            </div>
            <ColumnsIllu />
          </div>
        </div>
        {/* bans */}
        <div className="rounded-lg border border-bad/30 bg-bad/5 p-2">
          <div className="text-[9px] uppercase text-bad font-bold mb-1.5 flex items-center justify-between">
            <span>{t("bans.title")}</span>
          </div>
          <div className="space-y-1">
            {[BULL, RICO, MORTIS, JESSIE].map((src, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="text-[8px] text-muted w-3 text-right">{i + 1}</div>
                <PortraitRing src={src} ring="ring-bad/40" sizeClass="w-5 h-5" />
                <div className="flex-1 h-1 bg-panel rounded">
                  <div
                    className="h-full bg-bad/60 rounded"
                    style={{ width: `${100 - i * 15}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5">
            <ZoneTag n={5} color="#ff4d6d" label={t("how.anatomy.bans")} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── COLUMNS ──────────────────────────── */

function Columns() {
  const { t } = useI18n();
  type C = {
    titleKey: StringKey;
    whatKey: StringKey;
    formulaKey: StringKey;
    exampleKey: StringKey;
    tone: "accent" | "muted" | "good" | "bad";
    example: React.ReactNode;
  };
  const cards: C[] = [
    {
      titleKey: "how.col.combined.title",
      whatKey: "how.col.combined.what",
      formulaKey: "how.col.combined.formula",
      exampleKey: "how.col.combined.example",
      tone: "accent",
      example: <CombinedExample />,
    },
    {
      titleKey: "how.col.map.title",
      whatKey: "how.col.map.what",
      formulaKey: "how.col.map.formula",
      exampleKey: "how.col.map.example",
      tone: "muted",
      example: <MapExample />,
    },
    {
      titleKey: "how.col.syn.title",
      whatKey: "how.col.syn.what",
      formulaKey: "how.col.syn.formula",
      exampleKey: "how.col.syn.example",
      tone: "good",
      example: <SynergyExample />,
    },
    {
      titleKey: "how.col.cnt.title",
      whatKey: "how.col.cnt.what",
      formulaKey: "how.col.cnt.formula",
      exampleKey: "how.col.cnt.example",
      tone: "bad",
      example: <CounterExample />,
    },
  ];
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold mb-6">{t("how.columns.title")}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <ColumnCard key={c.titleKey} {...c} />
        ))}
      </div>
    </section>
  );
}

function ColumnCard({
  titleKey,
  whatKey,
  formulaKey,
  exampleKey,
  tone,
  example,
}: {
  titleKey: StringKey;
  whatKey: StringKey;
  formulaKey: StringKey;
  exampleKey: StringKey;
  tone: "accent" | "muted" | "good" | "bad";
  example: React.ReactNode;
}) {
  const { t } = useI18n();
  const toneText =
    tone === "accent"
      ? "text-accent"
      : tone === "good"
        ? "text-good"
        : tone === "bad"
          ? "text-bad"
          : "text-muted";
  const toneBorder =
    tone === "accent"
      ? "border-accent/40"
      : tone === "good"
        ? "border-good/40"
        : tone === "bad"
          ? "border-bad/40"
          : "border-border";
  return (
    <div className={"card border-2 " + toneBorder}>
      <h3 className={"font-bold text-lg " + toneText}>{t(titleKey)}</h3>
      <p className="text-sm text-muted mt-2 leading-relaxed">{t(whatKey)}</p>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
          {t("how.col.shared.formula")}
        </div>
        <code className="block text-[11px] md:text-xs bg-panel p-2 rounded border border-border font-mono overflow-x-auto whitespace-pre">
          {t(formulaKey)}
        </code>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-muted mb-1.5">
          {t("how.col.shared.example")}
        </div>
        <div className="bg-panel2/40 rounded-lg p-3 border border-border">
          {example}
        </div>
        <p className="text-[11px] text-muted mt-2 leading-relaxed">
          {t(exampleKey)}
        </p>
      </div>
    </div>
  );
}

function CombinedExample() {
  return (
    <div className="flex items-center gap-3">
      <PortraitRing src={EDGAR} ring="ring-accent/60" sizeClass="w-12 h-12" />
      <div className="flex-1">
        <div className="text-xs font-semibold mb-1">Edgar</div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <Mini badge="solo" value="60" />
          <Mini badge="syn" value="65" />
          <Mini badge="vs" value="75" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-accent tabular-nums">66</div>
    </div>
  );
}

function MapExample() {
  return (
    <div className="space-y-1.5">
      {[
        { src: RICO, name: "Rico", wr: 64 },
        { src: BULL, name: "Bull", wr: 61 },
        { src: JESSIE, name: "Jessie", wr: 58 },
      ].map((b) => (
        <div key={b.name} className="flex items-center gap-2">
          <PortraitRing src={b.src} ring="ring-border" sizeClass="w-7 h-7" />
          <div className="text-xs flex-1">{b.name}</div>
          <div className="flex-1 h-1 bg-panel rounded">
            <div className="h-full bg-good/60 rounded" style={{ width: `${b.wr}%` }} />
          </div>
          <div className="text-xs font-semibold text-good w-8 text-right">{b.wr}</div>
        </div>
      ))}
    </div>
  );
}

function SynergyExample() {
  return (
    <div className="flex items-center gap-2">
      <PortraitRing src={POCO} ring="ring-good/60" sizeClass="w-9 h-9" />
      <div className="text-xs text-muted">+</div>
      <PortraitRing src={FRANK} ring="ring-good/60" sizeClass="w-9 h-9" />
      <div className="text-good font-mono text-xs ml-2">
        S<sub>poco</sub> · S<sub>frank</sub>
      </div>
      <div className="ml-auto text-lg font-extrabold text-good">+8</div>
    </div>
  );
}

function CounterExample() {
  return (
    <div className="flex items-center gap-2">
      <PortraitRing src={EDGAR} ring="ring-good/60" sizeClass="w-9 h-9" />
      <span className="text-bad text-base">⚔</span>
      <PortraitRing src={SHELLY} ring="ring-bad/60" sizeClass="w-9 h-9" />
      <div className="text-bad font-mono text-xs ml-2">
        O<sub>edgar</sub> · D<sub>shelly</sub>
      </div>
      <div className="ml-auto text-lg font-extrabold text-bad">+12</div>
    </div>
  );
}

function Mini({ badge, value }: { badge: string; value: string }) {
  return (
    <div className="bg-panel border border-border rounded px-1.5 py-0.5 text-center">
      <div className="text-[8px] uppercase text-muted">{badge}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

/* ──────────────────────────── MODEL ───────────────────────────── */

function Model() {
  const { t } = useI18n();
  type Var = { key: StringKey; descKey: StringKey; symbol: string; color: string };
  const vars: Var[] = [
    { key: "how.model.O", descKey: "how.model.Odesc", symbol: "O", color: "#ff7eb6" },
    { key: "how.model.D", descKey: "how.model.Ddesc", symbol: "D", color: "#71f5dc" },
    { key: "how.model.S", descKey: "how.model.Sdesc", symbol: "S", color: "#3ecf8e" },
    { key: "how.model.bias", descKey: "how.model.biasdesc", symbol: "β", color: "#ffb000" },
    { key: "how.model.mapB", descKey: "how.model.mapBdesc", symbol: "M", color: "#8b9aff" },
  ];
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold mb-3">{t("how.model.title")}</h2>
      <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed">
        {t("how.model.intro")}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {vars.map((v) => (
          <div key={v.key} className="card flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-extrabold text-black shrink-0"
              style={{ background: v.color }}
            >
              {v.symbol}
            </div>
            <div>
              <div className="font-semibold text-sm">{t(v.key)}</div>
              <div className="text-xs text-muted mt-0.5">{t(v.descKey)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card text-sm leading-relaxed">
        <p>{t("how.model.trained")}</p>
        <p className="text-muted mt-3 text-xs italic">
          {t("how.model.classes")}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── shared bits ──────────────────────── */

function PortraitRing({
  src,
  ring,
  sizeClass = "w-10 h-10",
}: {
  src: string;
  ring: string;
  sizeClass?: string;
}) {
  return (
    <div
      className={
        "relative rounded-full overflow-hidden bg-panel ring-2 shrink-0 " +
        ring +
        " " +
        sizeClass
      }
    >
      <Image src={src} alt="" fill sizes="40px" className="object-cover" unoptimized />
    </div>
  );
}

function MiniCounterIllu({
  src,
  name,
  wr,
  strong = false,
}: {
  src: string;
  name: string;
  wr: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center gap-2 px-1.5 py-1 rounded-md border bg-panel2/80 " +
        (strong ? "border-good/40" : "border-border")
      }
    >
      <PortraitRing src={src} ring="ring-border" sizeClass="w-6 h-6" />
      <div className="text-[11px] flex-1 truncate">{name}</div>
      <div
        className={
          "text-xs font-semibold " + (strong ? "text-good" : "text-muted")
        }
      >
        {wr}
      </div>
    </div>
  );
}

function MiniSlot({
  src,
  empty = false,
  small = false,
}: {
  src?: string;
  empty?: boolean;
  small?: boolean;
}) {
  const size = small ? "w-10 h-10" : "w-14 h-14";
  return (
    <div className={"rounded-full bg-panel2 ring-1 ring-border " + size + " mx-auto relative overflow-hidden"}>
      {!empty && src && (
        <Image src={src} alt="" fill sizes="56px" className="object-cover" unoptimized />
      )}
      {empty && (
        <div className="absolute inset-0 flex items-center justify-center text-muted text-base">
          +
        </div>
      )}
    </div>
  );
}
