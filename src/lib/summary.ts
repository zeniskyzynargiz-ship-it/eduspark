import type { Dict, Lang } from "./i18n";
import { fmt, pick } from "./i18n";
import type { Criterion } from "./lesson";
import type { Slide, ChartRow, TableRow } from "@/components/SummaryVideo";

type CritScore = Record<string, { got: number; gradedMax: number; graded: number }>;

/** Strongest and weakest criterion by percentage, only among graded tasks. */
export function strongWeak(byCrit: CritScore, criteria: Criterion[], lang: Lang) {
  const rows = Object.entries(byCrit)
    .filter(([, v]) => v.graded > 0 && v.gradedMax > 0)
    .map(([id, v]) => ({ id, pct: v.got / v.gradedMax, name: pick(criteria.find((c) => c.id === id)?.name, lang) || id }));
  if (!rows.length) return { strong: null, weak: null };
  rows.sort((a, b) => b.pct - a.pct);
  const strong = rows[0];
  const weak = rows.length > 1 && rows[rows.length - 1].pct < strong.pct ? rows[rows.length - 1] : null;
  return { strong, weak };
}

/** Percent per criterion for the animated chart; null = not graded yet. */
export function critChart(byCrit: CritScore, criteria: Criterion[], lang: Lang): ChartRow[] {
  return criteria.map((c) => {
    const v = byCrit[c.id];
    return { label: pick(c.name, lang), value: v && v.graded > 0 && v.gradedMax > 0 ? Math.round((v.got / v.gradedMax) * 100) : null };
  });
}

export type TaskResult = { type: string; got: number | null; max: number; answered: boolean };

/** Emoji mark for one task result. */
export function taskMark(t: TaskResult): TableRow["mark"] {
  if (!t.answered) return "none";
  if (t.got === null) return "wait";
  if (t.got >= t.max) return "ok";
  return t.got > 0 ? "part" : "bad";
}

/** Rule-based student summary slides built from real data only. */
export function studentSlides(
  d: Dict,
  lang: Lang,
  input: { interest: string; done: number; total: number; byCrit: CritScore; criteria: Criterion[]; image?: string; tasks?: TaskResult[]; released?: boolean },
): Slide[] {
  const { strong, weak } = strongWeak(input.byCrit, input.criteria, lang);
  const tasks = input.tasks ?? [];
  const type = (t: string) => (d.teacher.taskTypes as Record<string, string>)[t] ?? t;
  const table: TableRow[] = tasks.map((t, i) => ({ label: `${i + 1}. ${type(t.type)}`, mark: taskMark(t), score: t.got === null ? "—" : `${t.got}/${t.max}` }));
  const lost = tasks.map((t, i) => ({ t, n: i + 1 })).filter(({ t }) => t.got !== null && t.got < t.max);
  const graded = tasks.filter((t) => t.got !== null).length;
  const mistakesText = !graded
    ? d.summary.mistakesWait
    : lost.length
      ? fmt(d.summary.mistakesText, { list: lost.map(({ t, n }) => `${n} (${type(t.type)})`).join(", ") }) + (weak ? " " + fmt(d.summary.struggleText, { name: weak.name }) : "")
      : d.summary.mistakesNone;
  const pct = graded ? tasks.reduce((s, t) => s + (t.got ?? 0), 0) / Math.max(1, tasks.filter((t) => t.got !== null).reduce((s, t) => s + t.max, 0)) : null;
  const motivation = pct === null ? d.summary.motivation.start : pct >= 0.85 ? d.summary.motivation.high : pct >= 0.5 ? d.summary.motivation.mid : d.summary.motivation.low;
  return [
    { icon: "🎯", label: d.summary.chosen, text: d.interests[input.interest as keyof Dict["interests"]] ?? input.interest, image: input.image },
    { icon: "✅", label: d.summary.work, text: fmt(d.summary.workText, { done: input.done, total: input.total }), chart: [{ label: d.summary.work, value: input.total ? Math.round((input.done / input.total) * 100) : 0 }] },
    { icon: "📋", label: d.summary.tasksTitle, text: graded ? d.summary.tasksText : d.summary.tasksWait, table },
    { icon: "⭐", label: d.summary.success, text: strong ? fmt(d.summary.successText, { name: strong.name }) : d.summary.successNone, chart: critChart(input.byCrit, input.criteria, lang) },
    { icon: "💪", label: d.summary.mistakes, text: mistakesText, image: input.image },
    { icon: "🚀", label: d.summary.nextStep, text: `${weak ? fmt(d.summary.nextText, { name: weak.name }) : d.summary.nextNone} ${motivation}`, image: "/images/hero-book-composition.webp" },
  ];
}

export const INTEREST_IMG: Record<string, string> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};
