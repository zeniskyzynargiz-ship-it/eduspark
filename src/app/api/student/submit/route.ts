import { getStudent } from "@/lib/student-session";
import { ownAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, fail } from "@/lib/api";

/** Marks the work as submitted. Sending again changes nothing. */
export async function POST(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  const body = await req.json().catch(() => ({}));
  const a = await ownAssignment(st.id, String(body.assignmentId ?? ""));
  if (!a) return fail("not_found", 404);
  if (a.status === "submitted" || a.status === "graded") return json({ ok: true, already: true });
  if (a.lessons.status !== "published") return fail("closed", 409);
  await supabaseAdmin().from("assignments").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", a.id).in("status", ["assigned", "in_progress"]);
  return json({ ok: true });
}
