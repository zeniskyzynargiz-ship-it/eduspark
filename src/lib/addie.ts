import type { ClassProfile } from "./profile";
import type { LessonContent } from "./lesson";
import { dicts } from "./i18n";

export const ADDIE_KEYS = ["analyze", "design", "develop", "implement", "evaluate"] as const;
export type AddieRecord = Record<(typeof ADDIE_KEYS)[number], { kk: string; en: string }>;

const top = (m: Record<string, number>, labels: Record<string, string>, n = 3) =>
  Object.entries(m)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${labels[k] ?? k} (${v})`)
    .join(", ");

/**
 * ADDIE record built only from data that exists. Missing data is written out
 * plainly (for example "Baseline tasks have not been completed yet") instead of guessed.
 */
export function buildAddie(p: ClassProfile, input: { objective: string; duration: number }, c: LessonContent): AddieRecord {
  const out = {} as AddieRecord;
  for (const lang of ["kk", "en"] as const) {
    const d = dicts[lang];
    const L = (kk: string, en: string) => (lang === "kk" ? kk : en);
    const missing = p.missing.map((m) => d.teacher.missing[m]).join(" ");
    const analyze = [
      L(`Оқушы саны: ${p.studentCount}. Сауалнама: ${p.surveyCount}. Бастапқы тапсырма: ${p.baselineCount}.`, `Students: ${p.studentCount}. Surveys: ${p.surveyCount}. Baseline tasks: ${p.baselineCount}.`),
      p.surveyCount ? `${d.teacher.interestDist}: ${top(p.interestCounts, d.interests)}.` : "",
      p.surveyCount ? `${d.teacher.difficultyDist}: ${top(p.difficultyCounts, d.difficulties) || "—"}.` : "",
      p.baselineAvgPct !== null ? `${d.teacher.baselineAvg}: ${p.baselineAvgPct}%.` : "",
      missing ? `${d.teacher.addieMissing}: ${missing}` : "",
      L("Телефон мен интернет мүмкіндігі туралы дерек жүйеде жоқ: мұғалім өзі толықтырады.", "There is no data on phone and internet access in the system: please add it yourself."),
      c.addie_rationale.analyze[lang],
    ];
    const total = c.criteria.reduce((s, x) => s + x.descriptors.reduce((a, b) => a + b.points, 0), 0);
    out.analyze = { ...out.analyze, [lang]: analyze.filter(Boolean).join("\n") } as never;
    out.design = {
      ...out.design,
      [lang]: [
        `${d.teacher.objective}: ${input.objective}`,
        `${d.teacher.outcomes}: ${c.expected_outcomes.map((o) => o[lang]).join("; ")}`,
        `${d.teacher.criteria}: ${c.criteria.map((x) => x.name[lang]).join(", ")} (${d.teacher.total}: ${total} ${d.common.points})`,
        `${d.teacher.plan}: ${c.stages.map((s) => `${s.title[lang]} ${s.minutes}′`).join(" → ")} = ${input.duration} ${d.common.min}`,
        c.addie_rationale.design[lang],
      ].join("\n"),
    } as never;
    out.develop = {
      ...out.develop,
      [lang]: [
        `${d.teacher.variants}: ${c.variants.map((v) => d.interests[v.interest]).join(", ")}`,
        `${d.teacher.vocabulary}: ${c.support.vocabulary.map((v) => v.en).join(", ") || "—"}`,
        `${d.teacher.frames}: ${c.support.sentence_frames.join(" | ") || "—"}`,
        c.addie_rationale.develop[lang],
      ].join("\n"),
    } as never;
    out.implement = { ...out.implement, [lang]: [c.addie_rationale.implement[lang], L("Орындау түрі: телефон немесе қағаз; жеке, жұптық және ортақ тапсырма.", "Mode: phone or paper; individual, pair and shared tasks.")].join("\n") } as never;
    out.evaluate = {
      ...out.evaluate,
      [lang]: [c.addie_rationale.evaluate[lang], L("Сабақтан кейін: нәтижелер бетіндегі деректер бойынша толықтырыңыз.", "After the lesson: complete this from the Results page.")].join("\n"),
    } as never;
  }
  return out;
}
