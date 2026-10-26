"use client";
import { useState } from "react";
import { Search, FileText, Settings, Play, BarChart3, ArrowRight, ChevronDown } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

const STAGES = [
  { key: "analyze", letter: "A", Icon: Search },
  { key: "design", letter: "D", Icon: FileText },
  { key: "develop", letter: "D", Icon: Settings },
  { key: "implement", letter: "I", Icon: Play },
  { key: "evaluate", letter: "E", Icon: BarChart3 },
] as const;

export function AddieCard() {
  const { d } = useLang();
  const [active, setActive] = useState<(typeof STAGES)[number]["key"] | null>(null);
  return (
    <section className="card p-5 sm:p-6 h-full" id="addie">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-leaf-100 grid place-items-center"><Settings className="w-5 h-5 text-leaf-700" /></span>
        <h2 className="text-2xl sm:text-3xl font-bold">{d.home.addieTitle}</h2>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2">
        {STAGES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setActive(active === s.key ? null : s.key)}
            aria-expanded={active === s.key}
            className={`relative rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 transition ${active === s.key ? "bg-leaf-100 ring-2 ring-leaf-500" : "bg-leaf-50 hover:bg-leaf-100"}`}
          >
            <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-leaf-700 text-white font-display font-bold text-lg sm:text-xl grid place-items-center">{s.letter}</span>
            <span className="text-[11px] sm:text-sm font-bold text-center leading-tight">{d.addie.stages[s.key].name}</span>
            <s.Icon className="w-5 h-5 sm:w-7 sm:h-7 text-leaf-700" strokeWidth={1.8} />
            {i < 4 && <ArrowRight className="hidden sm:block absolute -right-2.5 top-1/2 w-3.5 h-3.5 text-leaf-500" />}
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-3 rounded-2xl border border-leaf-200 bg-white p-4 text-sm">
          <div className="font-bold text-leaf-800">{d.addie.stages[active].name} — {d.addie.stages[active].short}</div>
          <p className="mt-1 text-ink/85">{d.addie.stages[active].full}</p>
        </div>
      )}
      <div className="mt-4 rounded-full bg-leaf-50 px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium">
        {d.home.addieChain.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-3">
            {c}
            {i < d.home.addieChain.length - 1 && <ArrowRight className="w-4 h-4 text-leaf-700" />}
          </span>
        ))}
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {STAGES.map((s) => (
          <li key={s.key} className="flex gap-2">
            <span className="font-bold text-leaf-800 min-w-24">{d.addie.stages[s.key].name}</span>
            <span className="text-ink/80">{d.addie.stages[s.key].full}</span>
          </li>
        ))}
      </ul>
      <a href="/addie" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-leaf-700 hover:underline">
        {d.home.addieMore} <ChevronDown className="w-4 h-4 -rotate-90" />
      </a>
    </section>
  );
}
