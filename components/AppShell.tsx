"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import LangSwitcher from "./LangSwitcher";
import Logo from "./Logo";
import { useI18n } from "./I18nProvider";

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <header className="border-b border-border sticky top-0 bg-bg/80 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/draft" className="flex items-center gap-2 font-bold text-lg">
            <Logo size={32} />
            <span>BrawlPick</span>
          </Link>
          <LangSwitcher />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-muted">
        {t("footer.attribution")}
      </footer>
    </>
  );
}
