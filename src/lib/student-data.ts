import "server-only";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "./supabase/admin";
import { getStudent } from "./student-session";
import { buildAssignmentContent, type AssignmentContent } from "./assignment";
import { pickVariant } from "./profile";
import type { LessonContent } from "./lesson";

export async function requireStudent() {
  const st = await getStudent();
  if (!st) redirect("/join");
  return st;
}

export async function latestSurvey(studentId: string) {
  const { data } = await supabaseAdmin().from("survey_responses").select("*").eq("student_id", studentId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export type StudentLesson = {
  id: string;
  topic: string;
  objective: string;
  status: string;
  feedback_released: boolean;
  current_stage: number;
  stage_started_at: string | null;
  stage_extra_min: number;
  stages: { title: { kk: string; en: string }; minutes: number }[];
  published_at: string | null;
};

/** Published lessons of the student's own class, newest first. */
export async function studentLessons(classId: string): Promise<(StudentLesson & { content: LessonContent })[]> {
  const { data } = await supabaseAdmin()
    .from("lessons")
    .select("id, topic, objective, status, feedback_released, current_stage, stage_started_at, stage_extra_min, content, published_at")
    .eq("class_id", classId)
    .in("status", ["published", "completed"])
    .order("published_at", { ascending: false });
  return (data ?? []).map((l) => ({ ...l, stages: (l.content as LessonContent).stages.map((s) => ({ title: s.title, minutes: s.minutes })) })) as never;
}

/** The student's assignment for a lesson. Students added after publishing get theirs on first visit. */
export async function ensureAssignment(studentId: string, lesson: { id: string; topic: string; objective: string; content: LessonContent }) {
  const db = supabaseAdmin();
  const { data: existing } = await db.from("assignments").select("*").eq("lesson_id", lesson.id).eq("student_id", studentId).maybeSingle();
  const survey = await latestSurvey(studentId);
  const key = pickVariant(survey?.interests, lesson.content.variants.map((v) => v.interest));
  if (existing) {
    // Work not started yet (e.g. published before the survey was filled in): move it to the
    // variant that matches the student's current interests.
    if (existing.status === "assigned" && existing.variant_key !== key) {
      const content = buildAssignmentContent(lesson.content, key, lesson);
      const { data: moved } = await db.from("assignments").update({ variant_key: key, content }).eq("id", existing.id).eq("status", "assigned").select("*").maybeSingle();
      if (moved) return moved as AssignmentRow;
    }
    return existing as AssignmentRow;
  }
  await db
    .from("assignments")
    .upsert({ lesson_id: lesson.id, student_id: studentId, variant_key: key, content: buildAssignmentContent(lesson.content, key, lesson) }, { onConflict: "lesson_id,student_id", ignoreDuplicates: true });
  const { data } = await db.from("assignments").select("*").eq("lesson_id", lesson.id).eq("student_id", studentId).single();
  return data as AssignmentRow;
}

export type AssignmentRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  variant_key: string;
  content: AssignmentContent;
  mode: "phone" | "paper";
  status: "assigned" | "in_progress" | "submitted" | "graded";
  submitted_at: string | null;
};

/** Assignment owned by this student, or null. Every student API route uses this check. */
export async function ownAssignment(studentId: string, assignmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) return null;
  const { data } = await supabaseAdmin().from("assignments").select("*, lessons(status, feedback_released, class_id)").eq("id", assignmentId).eq("student_id", studentId).maybeSingle();
  return data as (AssignmentRow & { lessons: { status: string; feedback_released: boolean; class_id: string } }) | null;
}
