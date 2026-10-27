import { BookOpen } from "lucide-react";
import { pick, type Lang } from "@/lib/i18n";
import type { Theory } from "@/lib/lesson";

/** Short theory of the lesson told through one interest, shown before the tasks. */
export function TheoryCard({ theory, title, lang, compact = false }: { theory?: Theory | null; title: string; lang: Lang; compact?: boolean }) {
  const text = theory ? pick(theory.explanation, lang).trim() : "";
  const examples = (theory?.examples ?? []).map((e) => e.trim()).filter(Boolean);
  if (!theory || (!text && !examples.length)) return null;
  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50/70 ${compact ? "p-3" : "p-4"}`}>
      <h3 className="font-bold flex items-center gap-2 text-amber-900"><BookOpen className="w-5 h-5" /> {title}</h3>
      {text && <p className="text-sm mt-2 whitespace-pre-line">{text}</p>}
      {examples.length > 0 && (
        <ul className="mt-2 space-y-1" lang="en">
          {examples.map((e, i) => <li key={i} className="text-sm rounded-lg bg-white/80 px-3 py-1.5 border border-amber-100">{e}</li>)}
        </ul>
      )}
    </section>
  );
}
