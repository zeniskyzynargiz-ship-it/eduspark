"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStudent } from "@/lib/student-session";
import { INTERESTS, DIFFICULTIES, SUPPORTS } from "@/lib/lesson";
import { BASELINE_TASKS } from "@/lib/baseline";
import { autoGrade } from "@/lib/grading";
import { ownAssignment } from "@/lib/student-data";

export type SState = { ok?: boolean; error?: string } | null;

const scale = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};
const only = <T extends string>(vals: FormDataEntryValue[], allowed: readonly T[]) => [...new Set(vals.map(String))].filter((v): v is T => (allowed as readonly string[]).includes(v));

/** Every submission is a new version; old answers and dates are kept. Never graded. */
export async function submitSurveyAction(_: SState, fd: FormData): Promise<SState> {
  const st = await getStudent();
  if (!st) return { error: "auth" };
  const interests = only(fd.getAll("interests"), INTERESTS);
  if (!interests.length) return { error: "pickOne" };
  const db = supabaseAdmin();
  const { data: last } = await db.from("survey_responses").select("version").eq("student_id", st.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("survey_responses").insert({
    student_id: st.id,
    version: (last?.version ?? 0) + 1,
    interests,
    other_interest: String(fd.get("other_interest") ?? "").slice(0, 200),
    difficulties: only(fd.getAll("difficulties"), DIFFICULTIES),
    interest_scale: scale(fd.get("interest_scale")),
    confidence_scale: scale(fd.get("confidence_scale")),
    meaning_scale: scale(fd.get("meaning_scale")),
    support: only(fd.getAll("support"), SUPPORTS),
    support_other: String(fd.get("support_other") ?? "").slice(0, 200),
  });
  // A double tap can race on the version number; the unique key rejects the duplicate.
  if (error && error.code !== "23505") return { error: "generic" };
  revalidatePath("/student");
  return { ok: true };
}

export async function submitBaselineAction(_: SState, fd: FormData): Promise<SState> {
  const st = await getStudent();
  if (!st) return { error: "auth" };
  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(String(fd.get("answers") ?? "{}"));
  } catch {
    return { error: "generic" };
  }
  const results: Record<string, unknown> = {};
  let score = 0;
  let max = 0;
  for (const t of BASELINE_TASKS) {
    const r = autoGrade(t, answers[t.id]);
    if (r) {
      results[t.id] = r;
      score += r.score;
      max += r.max;
    }
  }
  const clean = Object.fromEntries(BASELINE_TASKS.map((t) => [t.id, answers[t.id] ?? null]));
  // One attempt per student; a resend is ignored instead of creating a second result.
  const { error } = await supabaseAdmin().from("baseline_attempts").upsert({ student_id: st.id, answers: clean, results, score, max_score: max }, { onConflict: "student_id", ignoreDuplicates: true });
  if (error) return { error: "generic" };
  revalidatePath("/student");
  return { ok: true };
}

export async function saveReflectionAction(_: SState, fd: FormData): Promise<SState> {
  const st = await getStudent();
  if (!st) return { error: "auth" };
  const a = await ownAssignment(st.id, String(fd.get("assignment_id") ?? ""));
  if (!a) return { error: "generic" };
  const { error } = await supabaseAdmin().from("reflections").upsert(
    {
      assignment_id: a.id,
      interest: scale(fd.get("interest")),
      confidence: scale(fd.get("confidence")),
      learned: String(fd.get("learned") ?? "").slice(0, 1000),
      difficult: String(fd.get("difficult") ?? "").slice(0, 1000),
    },
    { onConflict: "assignment_id" },
  );
  if (error) return { error: "generic" };
  return { ok: true };
}
