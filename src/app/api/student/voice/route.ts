import { getStudent } from "@/lib/student-session";
import { ownAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Task } from "@/lib/lesson";
import { json, fail } from "@/lib/api";

const EXT: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav" };

/** Voice answer upload into the private bucket. The teacher listens through a short-lived signed link. */
export async function POST(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  const fd = await req.formData();
  const a = await ownAssignment(st.id, String(fd.get("assignmentId") ?? ""));
  if (!a) return fail("not_found", 404);
  if (a.lessons.status !== "published") return fail("closed", 409);
  if (a.status === "submitted" || a.status === "graded") return fail("locked", 409);
  const taskId = String(fd.get("taskId") ?? "");
  const task = (a.content.tasks as Task[]).find((t) => t.id === taskId);
  if (!task || task.type !== "voice") return fail("bad_task");
  const file = fd.get("file");
  if (!(file instanceof Blob)) return fail("no_file");
  const mime = (file.type || "audio/webm").split(";")[0];
  if (!EXT[mime]) return fail("bad_type", 415);
  if (file.size > 10 * 1024 * 1024) return fail("too_large", 413);
  const path = `${a.id}/${taskId}-${Date.now()}.${EXT[mime]}`;
  const db = supabaseAdmin();
  const up = await db.storage.from("voice").upload(path, file, { contentType: mime, upsert: false });
  if (up.error) return fail("storage", 500);
  const { error } = await db
    .from("responses")
    .upsert({ assignment_id: a.id, task_id: taskId, answer: { path, mime }, updated_at: new Date().toISOString() }, { onConflict: "assignment_id,task_id" });
  if (error) return fail("db", 500);
  if (a.status === "assigned") await db.from("assignments").update({ status: "in_progress" }).eq("id", a.id).eq("status", "assigned");
  return json({ ok: true });
}
