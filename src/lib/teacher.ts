import "server-only";
import { redirect, notFound } from "next/navigation";
import { getTeacher } from "./supabase/server";

/** Signed-in teacher or redirect to login. */
export async function requireTeacher() {
  const { sb, user } = await getTeacher();
  if (!user) redirect("/auth/login");
  return { sb, user };
}

/** Class owned by the current teacher (RLS also enforces this). */
export async function requireClass(classId: string) {
  const { sb, user } = await requireTeacher();
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound();
  const { data: cls } = await sb.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!cls) notFound();
  return { sb, user, cls: cls as { id: string; name: string; grade_level: string; join_code: string; created_at: string } };
}

export async function requireLesson(classId: string, lessonId: string) {
  const ctx = await requireClass(classId);
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const { data: lesson } = await ctx.sb.from("lessons").select("*").eq("id", lessonId).eq("class_id", classId).maybeSingle();
  if (!lesson) notFound();
  return { ...ctx, lesson: lesson as LessonRow };
}

export type LessonRow = {
  id: string;
  class_id: string;
  topic: string;
  objective: string;
  duration_min: number;
  source_material: string;
  requirements: string;
  status: "draft" | "approved" | "published" | "completed";
  content: import("./lesson").LessonContent | null;
  addie: Record<string, { kk?: string; en?: string }> | null;
  is_demo: boolean;
  ai_provider: string | null;
  ai_model: string | null;
  version: number;
  feedback_released: boolean;
  current_stage: number;
  stage_started_at: string | null;
  stage_extra_min: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
