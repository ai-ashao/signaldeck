import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalDeck — AI Content Radar",
  description: "Zero-key AI content opportunity radar",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">SignalDeck</Link>
          <nav>
            <Link href="/">Radar</Link>
            <Link href="/settings/sources">Sources</Link>
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
