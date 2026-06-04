"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { slugify } from "@/lib/wikiData";
import type { Brawler } from "@/lib/types";

export default function BrawlersIndex() {
  const { t } = useI18n();
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string>("__all__");

  useEffect(() => {
    fetch("/api/brawlers")
      .then((r) => r.json())
      .then((d) => setBrawlers(d.brawlers));
  }, []);

  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const b of brawlers) if (b.className) set.add(b.className);
    return ["__all__", ...[...set].sort()];
  }, [brawlers]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return brawlers.filter((b) => {
      if (cls !== "__all__" && b.className !== cls) return false;
      if (ql && !b.name.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [brawlers, q, cls]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("wiki.brawlers.title")}</h1>
          <p className="text-xs text-muted mt-1">
            {filtered.length} / {brawlers.length}
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("wiki.brawlers.filter")}
          className="input"
        />
        <div className="flex flex-wrap gap-1.5">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setCls(c)}
              className={
                "px-2.5 py-1 rounded-full text-xs transition border " +
                (cls === c
                  ? "bg-accent text-black border-accent"
                  : "bg-panel2 border-border hover:border-muted text-muted")
              }
            >
              {c === "__all__" ? t("picker.all") : c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {filtered.map((b) => (
          <Link
            key={b.id}
            href={`/wiki/brawlers/${slugify(b.cubeName)}`}
            className="group flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-accent hover:bg-panel2 transition"
          >
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-panel2 ring-1 ring-border group-hover:ring-accent">
              <Image
                src={b.imageUrl}
                alt={b.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="text-[11px] font-medium truncate w-full text-center">
              {b.name}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
