"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "./I18nProvider";
import type { StringKey } from "@/lib/i18n";

const STORAGE_TAG = "brawlpick.playerTag";
const STORAGE_OWNED = "brawlpick.ownedOnly";

type PlayerInfo = {
  name: string;
  tag: string;
  ownedLevel11: string[];
};

type Props = {
  /** Set of cube names of brawlers owned at power >= 11. */
  ownedSet: Set<string>;
  setOwnedSet: (s: Set<string>) => void;
  ownedOnly: boolean;
  setOwnedOnly: (v: boolean) => void;
};

export default function PlayerSettings({
  ownedSet,
  setOwnedSet,
  ownedOnly,
  setOwnedOnly,
}: Props) {
  const { t } = useI18n();
  const [tag, setTag] = useState("");
  const [info, setInfo] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [errKey, setErrKey] = useState<StringKey | null>(null);

  // Restore from localStorage on mount + auto-load.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TAG);
      if (saved) {
        setTag(saved);
        void load(saved, /* silent */ true);
      }
      const ownedSaved = localStorage.getItem(STORAGE_OWNED);
      if (ownedSaved === "true") setOwnedOnly(true);
    } catch {
      /* SSR / no storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(rawTag: string, silent = false) {
    const clean = rawTag.replace(/^[#]+/, "").trim();
    if (!clean) return;
    setLoading(true);
    if (!silent) setErrKey(null);
    try {
      const r = await fetch(`/api/player/${encodeURIComponent(clean)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        const code = j?.error;
        if (code === "NOT_FOUND") setErrKey("player.error.notFound");
        else if (code === "TOKEN_MISSING")
          setErrKey("player.error.tokenMissing");
        else if (code === "TOKEN_IP") setErrKey("player.error.tokenIP");
        else setErrKey("player.error.generic");
        setInfo(null);
        return;
      }
      const data = (await r.json()) as PlayerInfo;
      setInfo(data);
      setOwnedSet(new Set(data.ownedLevel11));
      try {
        localStorage.setItem(STORAGE_TAG, clean);
      } catch {}
      setErrKey(null);
    } catch {
      setErrKey("player.error.generic");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  function forget() {
    setInfo(null);
    setTag("");
    setOwnedSet(new Set());
    setOwnedOnly(false);
    try {
      localStorage.removeItem(STORAGE_TAG);
      localStorage.removeItem(STORAGE_OWNED);
    } catch {}
  }

  function toggleOwned(v: boolean) {
    setOwnedOnly(v);
    try {
      localStorage.setItem(STORAGE_OWNED, v ? "true" : "false");
    } catch {}
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(tag);
  }

  return (
    <section className="card">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm uppercase tracking-wide text-muted">
          {t("player.title")}
        </h2>
      </div>
      <p className="text-[11px] text-muted mb-3 leading-relaxed">
        {t("player.subtitle")}
      </p>

      {!info && (
        <>
          <form onSubmit={onSubmit} className="flex gap-2 items-start">
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={t("player.tagPlaceholder")}
              className="input flex-1"
              autoComplete="off"
              spellCheck={false}
              maxLength={15}
            />
            <button
              type="submit"
              disabled={loading || !tag.trim()}
              className="btn-primary text-xs px-3 py-2 shrink-0 disabled:opacity-50"
            >
              {loading ? t("player.loading") : t("player.load")}
            </button>
          </form>
          <p className="text-[10px] text-muted mt-1.5">{t("player.help")}</p>
        </>
      )}

      {info && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-good" />
            <span className="text-xs text-muted">
              {t("player.connected")}:
            </span>
            <span className="text-sm font-semibold">{info.name}</span>
            <span className="text-[11px] text-muted">
              {info.tag} · {info.ownedLevel11.length} {t("player.brawlers11")}
            </span>
          </div>
          <button
            onClick={forget}
            className="ml-auto text-[11px] text-muted hover:text-bad underline-offset-2 hover:underline"
          >
            {t("player.forget")}
          </button>
        </div>
      )}

      {errKey && (
        <div className="text-xs text-bad mt-2">{t(errKey)}</div>
      )}

      {info && ownedSet.size > 0 && (
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => toggleOwned(e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          <span className="text-sm">{t("player.ownedOnly")}</span>
        </label>
      )}
    </section>
  );
}
