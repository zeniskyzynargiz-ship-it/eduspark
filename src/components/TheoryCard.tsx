"use client";
import Image from "next/image";
import { useState } from "react";
import { BookOpen, ChevronRight, ListOrdered } from "lucide-react";
import { pick, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import type { Theory } from "@/lib/lesson";

export const INTEREST_IMG: Record<string, string> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};
const INTEREST_EMOJI: Record<string, string> = { games: "🎮", animals: "🐾", art: "🎨", other: "✨" };

/** Splits a sentence so the given parts can be highlighted. */
function Highlighted({ text, parts, play }: { text: string; parts: string[]; play: number }) {
  const ps = parts.map((p) => p.trim()).filter((p) => p && text.includes(p));
  if (!ps.length) return <>{text}</>;
  const re = new RegExp(`(${ps.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return (
    <>
      {text.split(re).map((seg, i) =>
        ps.includes(seg) ? (
          <mark key={`${play}-${i}`} className="es-mark" style={{ animationDelay: `${0.3 + (i / 2) * 0.5}s` }}>{seg}</mark>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </>
  );
}

/**
 * The lesson's rule explained through the student's interest: an intro, then steps one by one
 * (rule, example with the key part highlighted, translation, picture), then more examples.
 */
export function TheoryCard({ theory, title, lang, interest, compact = false }: { theory?: Theory | null; title: string; lang: Lang; interest?: string; compact?: boolean }) {
  const { d } = useLang();
  const intro = theory ? pick(theory.explanation, lang).trim() : "";
  const steps = (theory?.steps ?? []).filter((s) => pick(s.note, lang).trim() || s.example.trim());
  const examples = (theory?.examples ?? []).map((e) => e.trim()).filter(Boolean);
  const [shown, setShown] = useState(compact ? steps.length : Math.min(1, steps.length));
  if (!theory || (!intro && !steps.length && !examples.length)) return null;
  const img = interest ? INTEREST_IMG[interest] : undefined;
  const allShown = shown >= steps.length;

  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50/70 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold flex items-center gap-2 text-amber-900"><BookOpen className="w-5 h-5" /> {title}</h3>
          {intro && <p className={`mt-2 whitespace-pre-line ${compact ? "text-sm" : "text-[15px]"}`}>{intro}</p>}
        </div>
        {!compact && (img ? (
          <span className="relative w-20 h-16 sm:w-28 sm:h-20 shrink-0"><Image src={img} alt="" fill sizes="112px" className="object-contain" /></span>
        ) : interest ? (
          <span className="text-5xl shrink-0" aria-hidden>{INTEREST_EMOJI[interest] ?? "⭐"}</span>
        ) : null)}
      </div>

      {steps.length > 0 && (
        <ol className="mt-3 space-y-2.5">
          {steps.slice(0, shown).map((s, i) => (
            <li key={i} className="rounded-xl bg-white border border-amber-100 p-3 flex gap-3">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white grid place-items-center text-sm font-bold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                {pick(s.note, lang).trim() && <p className="text-sm">{pick(s.note, lang)}</p>}
                {s.example.trim() && (
                  <p className="mt-1.5 text-[17px] leading-relaxed" lang="en">
                    <Highlighted text={s.example} parts={s.highlight} play={shown} />
                  </p>
                )}
                {s.translation.trim() && <p className="text-sm text-muted">— {s.translation}</p>}
              </div>
              {s.emoji && <span className="text-3xl shrink-0" aria-hidden>{s.emoji}</span>}
            </li>
          ))}
        </ol>
      )}
      {!compact && !allShown && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShown((n) => n + 1)}>
            {d.student.nextStep} <ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(steps.length)}>
            <ListOrdered className="w-4 h-4" /> {d.student.showAll}
          </button>
        </div>
      )}

      {(allShown || compact) && examples.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-900">{d.student.moreExamples}</div>
          <ul className="mt-1 space-y-1" lang="en">
            {examples.map((e, i) => <li key={i} className="text-sm rounded-lg bg-white/80 px-3 py-1.5 border border-amber-100">{e}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
