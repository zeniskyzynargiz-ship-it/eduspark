import { getStudent } from "@/lib/student-session";
import { ownAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LessonContent } from "@/lib/lesson";
import { json, fail } from "@/lib/api";

/** Light polling endpoint: timer and whether feedback is open. */
export async function GET(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  const id = new URL(req.url).searchParams.get("assignment") ?? "";
  const a = await ownAssignment(st.id, id);
  if (!a) return fail("not_found", 404);
  const { data: l } = await supabaseAdmin().from("lessons").select("status, feedback_released, current_stage, stage_started_at, stage_extra_min, content").eq("id", a.lesson_id).single();
  if (!l) return fail("not_found", 404);
  const stages = (l.content as LessonContent).stages;
  const cur = stages[l.current_stage];
  return json({
    status: l.status,
    feedbackReleased: l.feedback_released || !!(a as { feedback_released?: boolean }).feedback_released,
    stage: cur ? { index: l.current_stage, title: cur.title, minutes: cur.minutes + l.stage_extra_min, startedAt: l.stage_started_at } : null,
    now: new Date().toISOString(),
  });
}
