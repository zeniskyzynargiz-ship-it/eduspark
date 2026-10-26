"use client";
import { useLang } from "@/lib/i18n/client";

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const item = (l: "kk" | "en", label: string) => (
    <button
      type="button"
      onClick={() => l !== lang && setLang(l)}
      aria-pressed={lang === l}
      className={`px-2.5 py-1 rounded-full text-sm font-bold transition ${lang === l ? "text-leaf-800 bg-leaf-100" : "text-muted hover:text-leaf-800"}`}
    >
      {label}
    </button>
  );
  return (
    <div className={`inline-flex items-center rounded-full border border-leaf-200 bg-white/90 ${compact ? "p-0.5" : "p-1"}`} role="group" aria-label="Language">
      {item("kk", "ҚАЗ")}
      <span className="text-leaf-200 px-0.5">|</span>
      {item("en", "ENG")}
    </div>
  );
}
