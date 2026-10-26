import { z } from "zod";
import { INTERESTS, CUSTOM_INTEREST } from "./lesson";

/** Teacher-built survey settings for one class (classes.survey_config). */
export const QUESTION_TYPES = ["single", "multi", "scale", "text"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

const clean = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

const QuestionSchema = z.object({
  id: z.string().regex(/^q[a-z0-9]{1,12}$/),
  type: z.enum(QUESTION_TYPES),
  text: z.string().transform((s) => clean(s, 300)).pipe(z.string().min(1)),
  options: z.array(z.string().transform((s) => clean(s, 80))).default([]).transform((xs) => [...new Set(xs.filter(Boolean))].slice(0, 10)),
  required: z.boolean().default(false),
});
export type SurveyQuestion = z.infer<typeof QuestionSchema>;

export const SurveyConfigSchema = z.object({
  /** Labels of the teacher's own interest options. */
  interests: z.array(z.string().transform((s) => clean(s.replace(/^\++/, ""), 40))).default([]).transform((xs) => [...new Set(xs.filter(Boolean))].slice(0, 12)),
  /** Standard interests the teacher turned off. */
  hidden: z.array(z.enum(INTERESTS)).default([]),
  blocks: z.object({ difficulties: z.boolean().default(true), scales: z.boolean().default(true), support: z.boolean().default(true) }).prefault({}),
  questions: z.array(QuestionSchema).default([]).transform((qs) => qs.filter((q) => (q.type === "single" || q.type === "multi" ? q.options.length >= 2 : true)).slice(0, 15)),
});
export type SurveyConfig = z.infer<typeof SurveyConfigSchema>;

export function parseSurveyConfig(raw: unknown): SurveyConfig {
  const r = SurveyConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : SurveyConfigSchema.parse({});
}

export const customKey = (label: string) => `+${label}`;

/** Interest keys shown to students, standard ones first. At least one option always stays. */
export function surveyInterestKeys(cfg: SurveyConfig): string[] {
  const keys = [...INTERESTS.filter((k) => !cfg.hidden.includes(k)), ...cfg.interests.map(customKey).filter((k) => CUSTOM_INTEREST.test(k))];
  return keys.length ? keys : ["other"];
}

/** Display name of an interest key: dictionary label for standard keys, the teacher's text for own ones. */
export function interestLabel(d: { interests: Record<string, string> }, key: string): string {
  return d.interests[key] ?? key.replace(/^\+/, "");
}

export type CustomAnswer = { q: string; type: QuestionType; a: string | string[] | number };
export type CustomAnswers = Record<string, CustomAnswer>;

/** Reads the student's answers to the teacher's questions from a submitted form. */
export function readCustomAnswers(cfg: SurveyConfig, get: (name: string) => string[]): { answers: CustomAnswers; missing: boolean } {
  const answers: CustomAnswers = {};
  let missing = false;
  for (const q of cfg.questions) {
    const vals = get(`cq_${q.id}`).map((v) => v.trim()).filter(Boolean);
    let a: CustomAnswer["a"] | null = null;
    if (q.type === "single") a = vals.find((v) => q.options.includes(v)) ?? null;
    else if (q.type === "multi") {
      const xs = [...new Set(vals.filter((v) => q.options.includes(v)))];
      a = xs.length ? xs : null;
    } else if (q.type === "scale") {
      const n = Number(vals[0]);
      a = Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    } else a = vals[0] ? vals[0].slice(0, 1000) : null;
    if (a === null) {
      if (q.required) missing = true;
      continue;
    }
    answers[q.id] = { q: q.text, type: q.type, a };
  }
  return { answers, missing };
}

/** Class summary of the teacher's questions. Text answers stay out of it (they may hold personal details). */
export function summarizeCustom(cfg: SurveyConfig, rows: CustomAnswers[]) {
  return cfg.questions.map((q) => {
    const given = rows.map((r) => r?.[q.id]).filter((x): x is CustomAnswer => !!x);
    const counts: Record<string, number> = {};
    if (q.type === "single" || q.type === "multi") {
      for (const o of q.options) counts[o] = 0;
      for (const g of given) for (const v of Array.isArray(g.a) ? g.a : [g.a]) if (typeof v === "string" && v in counts) counts[v] += 1;
    }
    const nums = given.map((g) => g.a).filter((x): x is number => typeof x === "number");
    const avg = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
    return { q, answered: given.length, counts, avg, texts: q.type === "text" ? given.map((g) => String(g.a)) : [] };
  });
}
