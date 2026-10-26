import { getStudent } from "@/lib/student-session";
import { ownAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autoGrade } from "@/lib/grading";
import type { Task } from "@/lib/lesson";
import { json, fail } from "@/lib/api";

/** Autosave of one answer. Idempotent: the same answer sent twice leaves one row. */
export async function POST(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  let body: { assignmentId?: string; taskId?: string; answer?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("bad_json");
  }
  const a = await ownAssignment(st.id, String(body.assignmentId ?? ""));
  if (!a) return fail("not_found", 404);
  if (a.lessons.status !== "published") return fail("closed", 409);
  if (a.status === "submitted" || a.status === "graded") return fail("locked", 409);
  const task = (a.content.tasks as Task[]).find((t) => t.id === body.taskId);
  if (!task || task.type === "voice" || task.type === "pair") return fail("bad_task");
  const raw = JSON.stringify(body.answer ?? null);
  if (raw.length > 8000) return fail("too_large", 413);

  const auto = autoGrade(task, body.answer);
  const db = supabaseAdmin();
  const { error } = await db.from("responses").upsert(
    { assignment_id: a.id, task_id: task.id, answer: body.answer ?? null, auto_score: auto ? auto.score : null, ai_flagged: auto?.flagged ?? false, updated_at: new Date().toISOString() },
    { onConflict: "assignment_id,task_id" },
  );
  if (error) return fail("db", 500);
  if (a.status === "assigned") await db.from("assignments").update({ status: "in_progress" }).eq("id", a.id).eq("status", "assigned");
  return json({ ok: true, savedAt: new Date().toISOString() });
}
