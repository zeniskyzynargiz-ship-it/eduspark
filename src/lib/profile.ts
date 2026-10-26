import type { SupabaseClient } from "@supabase/supabase-js";
import { INTERESTS, DIFFICULTIES } from "./lesson";
import { parseSurveyConfig, summarizeCustom, type SurveyConfig, type CustomAnswers } from "./survey";

export type StudentRow = { id: string; first_name: string; last_name: string; active: boolean };
export type SurveyRow = {
  id: string;
  student_id: string;
  version: number;
  interests: string[];
  other_interest: string;
  difficulties: string[];
  interest_scale: number | null;
  confidence_scale: number | null;
  meaning_scale: number | null;
  support: string[];
  support_other: string;
  custom_answers?: CustomAnswers | null;
  created_at: string;
};
export type BaselineRow = { student_id: string; score: number; max_score: number; results: Record<string, unknown>; answers: Record<string, unknown>; created_at: string };

export type ClassProfile = {
  studentCount: number;
  surveyCount: number;
  baselineCount: number;
  interestCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  supportCounts: Record<string, number>;
  avg: { interest: number | null; confidence: number | null; meaning: number | null };
  baselineAvgPct: number | null;
  missing: ("no_students" | "no_survey" | "partial_survey" | "no_baseline" | "partial_baseline")[];
  /** Latest survey per student. */
  latest: Map<string, SurveyRow>;
  baseline: Map<string, BaselineRow>;
  survey: SurveyConfig;
  custom: ReturnType<typeof summarizeCustom>;
  /** Anonymous data that may be sent to an AI provider. No names. */
  forAI: Record<string, unknown>;
};

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

export async function loadClassProfile(sb: SupabaseClient, classId: string): Promise<ClassProfile & { students: StudentRow[] }> {
  const { data: students } = await sb.from("students").select("id, first_name, last_name, active").eq("class_id", classId).eq("active", true).order("first_name");
  const ids = (students ?? []).map((s) => s.id);
  const [{ data: surveys }, { data: baselines }, { data: cls }] = await Promise.all([
    ids.length ? sb.from("survey_responses").select("*").in("student_id", ids).order("version", { ascending: false }) : Promise.resolve({ data: [] as SurveyRow[] }),
    ids.length ? sb.from("baseline_attempts").select("student_id, score, max_score, results, answers, created_at").in("student_id", ids) : Promise.resolve({ data: [] as BaselineRow[] }),
    sb.from("classes").select("survey_config").eq("id", classId).maybeSingle(),
  ]);
  const latest = new Map<string, SurveyRow>();
  for (const s of (surveys ?? []) as SurveyRow[]) if (!latest.has(s.student_id)) latest.set(s.student_id, s);
  const baseline = new Map<string, BaselineRow>();
  for (const b of (baselines ?? []) as BaselineRow[]) baseline.set(b.student_id, b);
  return { ...buildProfile(students ?? [], latest, baseline, parseSurveyConfig(cls?.survey_config)), students: students ?? [] };
}

export function buildProfile(students: StudentRow[], latest: Map<string, SurveyRow>, baseline: Map<string, BaselineRow>, survey: SurveyConfig = parseSurveyConfig({})): ClassProfile {
  const interestCounts: Record<string, number> = Object.fromEntries(INTERESTS.map((k) => [k, 0]));
  const difficultyCounts: Record<string, number> = Object.fromEntries(DIFFICULTIES.map((k) => [k, 0]));
  const supportCounts: Record<string, number> = {};
  for (const s of latest.values()) {
    s.interests.forEach((i) => (interestCounts[i] = (interestCounts[i] ?? 0) + 1));
    s.difficulties.forEach((i) => (difficultyCounts[i] = (difficultyCounts[i] ?? 0) + 1));
    s.support.forEach((i) => (supportCounts[i] = (supportCounts[i] ?? 0) + 1));
  }
  const surveys = [...latest.values()];
  const bl = [...baseline.values()].filter((b) => Number(b.max_score) > 0);
  const baselineAvgPct = bl.length ? Math.round((bl.reduce((a, b) => a + Number(b.score) / Number(b.max_score), 0) / bl.length) * 100) : null;

  const missing: ClassProfile["missing"] = [];
  if (!students.length) missing.push("no_students");
  else {
    if (!latest.size) missing.push("no_survey");
    else if (latest.size < students.length) missing.push("partial_survey");
    if (!baseline.size) missing.push("no_baseline");
    else if (baseline.size < students.length) missing.push("partial_baseline");
  }

  const custom = summarizeCustom(survey, [...latest.values()].map((s) => s.custom_answers ?? {}));
  const avgScales = { interest: avg(surveys.map((s) => s.interest_scale)), confidence: avg(surveys.map((s) => s.confidence_scale)), meaning: avg(surveys.map((s) => s.meaning_scale)) };
  const forAI = {
    students_total: students.length,
    surveys_completed: latest.size,
    baseline_completed: baseline.size,
    interest_counts: interestCounts,
    difficulty_counts: difficultyCounts,
    support_requested: supportCounts,
    average_self_report_1_to_5: { interest: avgScales.interest, confidence: avgScales.confidence, personal_meaning: avgScales.meaning },
    baseline_average_percent: baselineAvgPct,
    missing_data: missing,
    teacher_questions: custom.filter((c) => c.q.type !== "text").map((c) => ({ question: c.q.text, answered: c.answered, option_counts: c.q.type === "scale" ? undefined : c.counts, average_1_to_5: c.q.type === "scale" ? c.avg : undefined })),
    anonymous_students: students.map((st, i) => {
      const s = latest.get(st.id);
      const b = baseline.get(st.id);
      return {
        ref: `S${i + 1}`,
        interests: s?.interests ?? null,
        difficulties: s?.difficulties ?? null,
        support: s?.support ?? null,
        baseline_percent: b && Number(b.max_score) > 0 ? Math.round((Number(b.score) / Number(b.max_score)) * 100) : null,
      };
    }),
    note: "Survey answers are self-reports, not a diagnostic test.",
  };

  return {
    studentCount: students.length,
    surveyCount: latest.size,
    baselineCount: baseline.size,
    interestCounts,
    difficultyCounts,
    supportCounts,
    avg: avgScales,
    baselineAvgPct,
    missing,
    latest,
    baseline,
    survey,
    custom,
    forAI,
  };
}

/** Interests to build variants for: those chosen in the class, otherwise the four main directions. */
export function variantInterests(p: ClassProfile, max = 4): string[] {
  const chosen = Object.entries(p.interestCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, max);
  return chosen.length ? chosen : ["sport", "music", "travel", "technology"];
}

/** Variant for one student: first of their latest interests that has a variant. */
export function pickVariant(interests: string[] | undefined, available: string[]) {
  for (const i of interests ?? []) if (available.includes(i)) return i;
  return available[0];
}
