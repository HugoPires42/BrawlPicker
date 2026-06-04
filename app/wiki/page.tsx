"use client";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

export default function WikiLanding() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <header className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          {t("wiki.title")}
        </h1>
        <p className="text-muted mt-2 max-w-xl mx-auto text-sm">
          {t("wiki.subtitle")}
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/wiki/brawlers"
          className="card hover:border-accent transition group block"
        >
          <div className="aspect-[16/6] rounded-lg bg-gradient-to-br from-accent/30 to-accent2/15 mb-3 flex items-center justify-center">
            <span className="text-5xl">🥊</span>
          </div>
          <h2 className="text-xl font-bold group-hover:text-accent transition">
            {t("wiki.card.brawlers.title")}
          </h2>
          <p className="text-sm text-muted mt-1">
            {t("wiki.card.brawlers.desc")}
          </p>
        </Link>

        <Link
          href="/wiki/maps"
          className="card hover:border-accent transition group block"
        >
          <div className="aspect-[16/6] rounded-lg bg-gradient-to-br from-good/30 to-good/10 mb-3 flex items-center justify-center">
            <span className="text-5xl">🗺️</span>
          </div>
          <h2 className="text-xl font-bold group-hover:text-accent transition">
            {t("wiki.card.maps.title")}
          </h2>
          <p className="text-sm text-muted mt-1">
            {t("wiki.card.maps.desc")}
          </p>
        </Link>
      </div>
    </div>
  );
}
