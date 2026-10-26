import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, Criterion } from "./lesson";
import { finalScore } from "./grading";

export type RespRow = {
  assignment_id: string;
  task_id: string;
  answer: unknown;
  auto_score: number | null;
  ai_suggested_score: number | null;
  ai_feedback: { kk?: string; en?: string } | null;
  ai_flagged: boolean;
  teacher_score: number | null;
  teacher_comment: string | null;
};

export type AssignmentFull = {
  id: string;
  student_id: string;
  variant_key: string;
  status: string;
  mode: string;
  submitted_at: string | null;
  feedback_released?: boolean;
  content: { tasks: Task[]; criteria: Criterion[]; interest: string };
  students: { first_name: string; last_name: string } | null;
  responses: RespRow[];
  reflection: { interest: number | null; confidence: number | null; learned: string; difficult: string } | null;
};

export async function loadLessonWork(sb: SupabaseClient, lessonId: string): Promise<AssignmentFull[]> {
  const { data: as } = await sb.from("assignments").select("id, student_id, variant_key, status, mode, submitted_at, feedback_released, content, students(first_name, last_name)").eq("lesson_id", lessonId);
  const list = (as ?? []) as unknown as Omit<AssignmentFull, "responses" | "reflection">[];
  const ids = list.map((a) => a.id);
  const [{ data: rs }, { data: refl }] = await Promise.all([
    ids.length ? sb.from("responses").select("*").in("assignment_id", ids) : Promise.resolve({ data: [] as RespRow[] }),
    ids.length ? sb.from("reflections").select("*").in("assignment_id", ids) : Promise.resolve({ data: [] as never[] }),
  ]);
  return list
    .map((a) => ({
      ...a,
      responses: ((rs ?? []) as RespRow[]).filter((r) => r.assignment_id === a.id),
      reflection: ((refl ?? []) as (AssignmentFull["reflection"] & { assignment_id: string })[]).find((r) => r?.assignment_id === a.id) ?? null,
    }))
    .sort((x, y) => (x.students?.first_name ?? "").localeCompare(y.students?.first_name ?? ""));
}

/** Per-criterion score for one assignment. Unscored tasks are counted as "not yet graded", not as zero. */
export function scoreAssignment(a: Pick<AssignmentFull, "content" | "responses">) {
  const byCrit: Record<string, { got: number; max: number; gradedMax: number; graded: number; tasks: number }> = {};
  let got = 0;
  let max = 0;
  let graded = 0;
  let answered = 0;
  const perTask: { id: string; type: Task["type"]; got: number | null; max: number; answered: boolean }[] = [];
  for (const t of a.content.tasks) {
    const r = a.responses.find((x) => x.task_id === t.id);
    const s = r ? finalScore(r) : null;
    const c = (byCrit[t.criterion_id] ??= { got: 0, max: 0, gradedMax: 0, graded: 0, tasks: 0 });
    c.max += t.points;
    c.tasks += 1;
    max += t.points;
    const isAnswered = !!r && r.answer !== null && r.answer !== undefined;
    if (isAnswered) answered += 1;
    perTask.push({ id: t.id, type: t.type, got: s, max: t.points, answered: isAnswered });
    if (s !== null) {
      c.got += s;
      c.gradedMax += t.points;
      c.graded += 1;
      got += s;
      graded += 1;
    }
  }
  return { got, max, graded, total: a.content.tasks.length, answered, byCrit, perTask, complete: graded === a.content.tasks.length };
}
