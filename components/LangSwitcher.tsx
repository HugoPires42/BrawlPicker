"use client";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

const FLAGS: Record<Locale, string> = { fr: "FR", en: "EN" };

export default function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center bg-panel2 rounded-md border border-border overflow-hidden">
      {LOCALES.map((l, i) => {
        const active = locale === l;
        return (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={
              "px-2 py-1 text-xs font-semibold transition " +
              (active
                ? "bg-accent text-black"
                : "text-muted hover:text-white") +
              (i === 0 ? " border-r border-border" : "")
            }
            aria-pressed={active}
          >
            {FLAGS[l]}
          </button>
        );
      })}
    </div>
  );
}
