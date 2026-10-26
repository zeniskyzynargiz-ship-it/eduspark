import "server-only";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase/admin";
import { ensureAssignment } from "./student-data";
import type { StudentCtx } from "./student-session";
import { loadLessonWork, scoreAssignment, type AssignmentFull, type RespRow } from "./results";
import type { Criterion, LessonContent, Task } from "./lesson";

type Bi = { kk: string; en: string };
type CritScore = Record<string, { got: number; gradedMax: number; graded: number }>;
export type CritFact = { name: Bi; percent: number | null };

/**
 * The only data the summary-video script may use. No names, no free text written by students.
 * Percentages are rounded whole numbers; null means "not graded yet".
 */
export type SummaryFacts =
  | {
      scope: "student";
      topic: string;
      objective: string;
      interest: string;
      tasks_done: number;
      tasks_total: number;
      scores_released: boolean;
      criteria: CritFact[];
      strongest: Bi | null;
      weakest: Bi | null;
    }
  | {
      scope: "class";
      topic: string;
      objective: string;
      students_total: number;
      submitted: number;
      fully_graded: number;
      criteria: CritFact[];
      strongest: Bi | null;
      weakest: Bi | null;
      reflection: { avg_interest: number | null; avg_confidence: number | null; answers: number };
    };

function critFacts(byCrit: CritScore, criteria: Criterion[]) {
  const list: CritFact[] = criteria.map((c) => {
    const v = byCrit[c.id];
    return { name: { kk: c.name.kk, en: c.name.en }, percent: v && v.graded > 0 && v.gradedMax > 0 ? Math.round((v.got / v.gradedMax) * 100) : null };
  });
  const graded = list.filter((c) => c.percent !== null).sort((a, b) => b.percent! - a.percent!);
  const strongest = graded[0]?.name ?? null;
  const last = graded[graded.length - 1];
  const weakest = graded.length > 1 && last.percent! < graded[0].percent! ? last.name : null;
  return { list, strongest, weakest };
}

/** Sums per-criterion scores over many assignments (graded tasks only). */
export function classCritTotals(scores: { byCrit: CritScore }[]) {
  const crit: CritScore = {};
  for (const s of scores)
    for (const [id, v] of Object.entries(s.byCrit)) {
      const c = (crit[id] ??= { got: 0, gradedMax: 0, graded: 0 });
      c.got += v.got;
      c.gradedMax += v.gradedMax;
      c.graded += v.graded;
    }
  return crit;
}

const avg1 = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

export async function studentFacts(st: StudentCtx, lessonId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return null;
  const db = supabaseAdmin();
  const { data: lesson } = await db
    .from("lessons")
    .select("id, topic, objective, status, feedback_released, content")
    .eq("id", lessonId)
    .eq("class_id", st.classId)
    .in("status", ["published", "completed"])
    .maybeSingle();
  if (!lesson) return null;
  const a = await ensureAssignment(st.id, lesson as { id: string; topic: string; objective: string; content: LessonContent });
  const { data: rs } = await db.from("responses").select("*").eq("assignment_id", a.id);
  const content = a.content as unknown as { tasks: Task[]; criteria: Criterion[]; interest: string };
  // Scores only count once the teacher has released feedback.
  const responses = ((rs ?? []) as RespRow[]).map((r) => (lesson.feedback_released ? r : { ...r, auto_score: null, teacher_score: null }));
  const sc = scoreAssignment({ content, responses });
  const c = critFacts(sc.byCrit, content.criteria);
  const facts: SummaryFacts = {
    scope: "student",
    topic: lesson.topic,
    objective: lesson.objective,
    interest: a.variant_key,
    tasks_done: sc.answered,
    tasks_total: sc.total,
    scores_released: !!lesson.feedback_released,
    criteria: c.list,
    strongest: c.strongest,
    weakest: c.weakest,
  };
  return { lesson, assignment: a, content, sc, facts };
}

/**
 * Teacher view of one student's summary. `sb` is the teacher's RLS client, so only their own students load.
 * The teacher sees grades even before they are released to the student.
 */
export async function pupilFacts(sb: SupabaseClient, assignmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) return null;
  const { data: a } = await sb
    .from("assignments")
    .select("id, lesson_id, student_id, variant_key, content, students(first_name, last_name), lessons(id, topic, objective, status, class_id, feedback_released)")
    .eq("id", assignmentId)
    .maybeSingle();
  const lesson = a?.lessons as unknown as { id: string; topic: string; objective: string; status: string; class_id: string; feedback_released: boolean } | null;
  if (!a || !lesson || !["published", "completed"].includes(lesson.status)) return null;
  const { data: rs } = await sb.from("responses").select("*").eq("assignment_id", a.id);
  const content = a.content as unknown as { tasks: Task[]; criteria: Criterion[]; interest: string };
  const sc = scoreAssignment({ content, responses: (rs ?? []) as RespRow[] });
  const c = critFacts(sc.byCrit, content.criteria);
  const facts: SummaryFacts = {
    scope: "student",
    topic: lesson.topic,
    objective: lesson.objective,
    interest: a.variant_key,
    tasks_done: sc.answered,
    tasks_total: sc.total,
    scores_released: true,
    criteria: c.list,
    strongest: c.strongest,
    weakest: c.weakest,
  };
  const student = a.students as unknown as { first_name: string; last_name: string } | null;
  return { lesson, assignment: a, student, content, sc, facts };
}

export function classFactsFrom(lesson: { topic: string; objective: string; content: unknown }, work: AssignmentFull[]): SummaryFacts {
  const criteria = (lesson.content as LessonContent | undefined)?.criteria ?? [];
  const scores = work.map((a) => scoreAssignment(a));
  const c = critFacts(classCritTotals(scores), criteria);
  const refl = work.map((a) => a.reflection).filter(Boolean) as NonNullable<AssignmentFull["reflection"]>[];
  return {
    scope: "class",
    topic: lesson.topic,
    objective: lesson.objective,
    students_total: work.length,
    submitted: work.filter((a) => a.status === "submitted" || a.status === "graded").length,
    fully_graded: scores.filter((s) => s.complete).length,
    criteria: c.list,
    strongest: c.strongest,
    weakest: c.weakest,
    reflection: { avg_interest: avg1(refl.map((r) => r.interest)), avg_confidence: avg1(refl.map((r) => r.confidence)), answers: refl.length },
  };
}

/** Teacher view. `sb` is the teacher's RLS client, so only their own lessons load. */
export async function classFacts(sb: SupabaseClient, lessonId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return null;
  const { data: lesson } = await sb.from("lessons").select("id, topic, objective, content, status").eq("id", lessonId).in("status", ["published", "completed"]).maybeSingle();
  if (!lesson) return null;
  const work = await loadLessonWork(sb, lesson.id);
  return { lesson, facts: classFactsFrom(lesson, work) };
}

export function factsHash(f: SummaryFacts) {
  return createHash("sha256").update(JSON.stringify(f)).digest("hex").slice(0, 32);
}

/** Every number the script is allowed to mention. */
export function allowedNumbers(f: SummaryFacts): Set<string> {
  const nums: number[] = [1, 2, 3, 4, 5, 100];
  for (const c of f.criteria) if (c.percent !== null) nums.push(c.percent);
  if (f.scope === "student") nums.push(f.tasks_done, f.tasks_total);
  else {
    nums.push(f.students_total, f.submitted, f.fully_graded, f.reflection.answers);
    if (f.reflection.avg_interest !== null) nums.push(f.reflection.avg_interest);
    if (f.reflection.avg_confidence !== null) nums.push(f.reflection.avg_confidence);
  }
  // Numbers that appear in the lesson topic or objective (e.g. "Unit 5") are fine too.
  for (const m of `${f.topic} ${f.objective}`.match(/\d+(?:[.,]\d+)?/g) ?? []) nums.push(Number(m.replace(",", ".")));
  return new Set(nums.map((n) => String(n)));
}
