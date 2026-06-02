"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import LangSwitcher from "./LangSwitcher";
import Logo from "./Logo";
import { useI18n } from "./I18nProvider";

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="border-b border-border sticky top-0 bg-bg/80 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/draft" className="flex items-center gap-2 font-bold text-lg">
            <Logo size={32} />
            <span className="hidden sm:inline">BrawlPick</span>
          </Link>
          <nav className="flex items-center gap-1 ml-2 text-sm">
            <Link
              href="/draft"
              className={
                "px-3 py-1.5 rounded-lg transition " +
                (isActive("/draft")
                  ? "bg-accent text-black font-medium"
                  : "text-muted hover:text-white hover:bg-panel2")
              }
            >
              {t("nav.draft")}
            </Link>
            <Link
              href="/how-it-works"
              className={
                "px-3 py-1.5 rounded-lg transition " +
                (isActive("/how-it-works")
                  ? "bg-accent text-black font-medium"
                  : "text-muted hover:text-white hover:bg-panel2")
              }
            >
              {t("nav.how")}
            </Link>
          </nav>
          <div className="ml-auto">
            <LangSwitcher />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-muted">
        {t("footer.attribution")}
      </footer>
    </>
  );
}
