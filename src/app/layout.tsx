import type { Metadata, Viewport } from "next";
import { Noto_Serif, Noto_Sans } from "next/font/google";
import { LangProvider } from "@/lib/i18n/client";
import { getDict } from "@/lib/i18n/server";
import "./globals.css";

// Noto covers every Kazakh letter (Ә Ғ Қ Ң Ө Ұ Ү Һ І).
const serif = Noto_Serif({ subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["600", "700", "800"], variable: "--font-noto-serif", display: "swap" });
const sans = Noto_Sans({ subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["400", "500", "600", "700"], variable: "--font-noto-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getDict();
  return { title: d.meta.title, description: d.meta.description, icons: { icon: "/favicon.svg" } };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17652f" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getDict();
  return (
    <html lang={lang} className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <LangProvider initial={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
