import type { Dict, Lang } from "./i18n";
import { fmt, pick } from "./i18n";
import type { Criterion } from "./lesson";
import type { Slide, ChartRow } from "@/components/SummaryVideo";

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

/** Rule-based student summary slides built from real data only. */
export function studentSlides(d: Dict, lang: Lang, input: { interest: string; done: number; total: number; byCrit: CritScore; criteria: Criterion[]; image?: string }): Slide[] {
  const { strong, weak } = strongWeak(input.byCrit, input.criteria, lang);
  return [
    { icon: "🎯", label: d.summary.chosen, text: d.interests[input.interest as keyof Dict["interests"]] ?? input.interest, image: input.image },
    { icon: "✅", label: d.summary.work, text: fmt(d.summary.workText, { done: input.done, total: input.total }), chart: [{ label: d.summary.work, value: input.total ? Math.round((input.done / input.total) * 100) : 0 }] },
    { icon: "⭐", label: d.summary.success, text: strong ? fmt(d.summary.successText, { name: strong.name }) : d.summary.successNone, chart: critChart(input.byCrit, input.criteria, lang) },
    { icon: "💪", label: d.summary.struggle, text: weak ? fmt(d.summary.struggleText, { name: weak.name }) : d.summary.struggleNone, image: input.image },
    { icon: "🚀", label: d.summary.nextStep, text: weak ? fmt(d.summary.nextText, { name: weak.name }) : d.summary.nextNone, image: "/images/hero-book-composition.webp" },
  ];
}

export const INTEREST_IMG: Record<string, string> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};
