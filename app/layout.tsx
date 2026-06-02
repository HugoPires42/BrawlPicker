import "./globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import I18nProvider from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "BrawlPick — Draft assistant for Brawl Stars Ranked",
  description:
    "Find the best picks against any comp on any ranked map. Powered by a Matrix-Factorization model trained on recent meta data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
