"use client";
import Link from "next/link";
import { useEffect } from "react";
import BrawlerDetail from "./BrawlerDetail";
import { useI18n } from "./I18nProvider";

type Props = {
  slug: string | null;
  onClose: () => void;
  /** Called when the user clicks a brawler inside the modal (e.g. a synergy
   *  link) — lets the parent swap the modal slug without closing it, keeping
   *  the draft state intact. */
  onSwap?: (cubeName: string) => void;
};

export default function BrawlerModal({ slug, onClose, onSwap }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [slug, onClose]);

  if (!slug) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-bg border border-border rounded-2xl shadow-2xl w-full max-w-5xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg/95 backdrop-blur rounded-t-2xl">
          <span className="text-xs uppercase tracking-wide text-muted">
            {t("wiki.brawlers.title")}
          </span>
          <Link
            href={`/wiki/brawlers/${slug}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-[11px] text-muted hover:text-accent underline-offset-2 hover:underline"
            title="Open as full page"
          >
            ⤢
          </Link>
          <button
            onClick={onClose}
            className="text-muted hover:text-white text-2xl leading-none px-2"
            aria-label={t("aria.close")}
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-5">
          <BrawlerDetail
            slug={slug}
            showBackLink={false}
            onPickBrawler={onSwap}
          />
        </div>
      </div>
    </div>
  );
}
