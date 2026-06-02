import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "BrawlPick — Draft assistant pour Brawl Stars Ranked",
  description:
    "Trouve les meilleurs picks face à n'importe quelle compo, sur n'importe quelle map ranked.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="border-b border-border sticky top-0 bg-bg/80 backdrop-blur z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/draft"
              className="flex items-center gap-2 font-bold text-lg"
            >
              <Logo size={32} />
              <span>BrawlPick</span>
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-muted">
          Données : brawltime.ninja (cube) + brawlify.com. Non affilié à Supercell.
        </footer>
      </body>
    </html>
  );
}
