"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { slugify } from "@/lib/wikiData";
import type { GameMap } from "@/lib/types";

export default function MapsIndex() {
  const { t } = useI18n();
  const [maps, setMaps] = useState<GameMap[]>([]);

  useEffect(() => {
    fetch("/api/maps?ranked=true")
      .then((r) => r.json())
      .then((d) => setMaps(d.maps));
  }, []);

  const byMode = useMemo(() => {
    const m = new Map<string, GameMap[]>();
    for (const x of maps) {
      const list = m.get(x.modeName) ?? [];
      list.push(x);
      m.set(x.modeName, list);
    }
    return m;
  }, [maps]);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">{t("wiki.maps.title")}</h1>
        <p className="text-muted text-sm mt-1">{t("wiki.maps.subtitle")}</p>
      </header>

      {[...byMode.entries()].map(([modeName, list]) => (
        <section key={modeName}>
          <h2
            className="text-xs uppercase tracking-wide font-bold mb-3"
            style={{ color: list[0].modeColor }}
          >
            {modeName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {list.map((m) => (
              <Link
                key={m.id}
                href={`/wiki/maps/${m.modeCube}/${slugify(m.cubeName)}`}
                className="group rounded-2xl border-2 border-border bg-panel overflow-hidden hover:border-accent transition"
              >
                <div className="relative aspect-[4/5] bg-panel2">
                  <Image
                    src={m.imageUrl}
                    alt={m.name}
                    fill
                    sizes="(max-width: 768px) 45vw, 240px"
                    className="object-contain group-hover:scale-105 transition"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
