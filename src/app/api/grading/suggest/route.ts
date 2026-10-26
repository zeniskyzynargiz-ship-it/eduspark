import { z } from "zod";
import { getTeacher } from "@/lib/supabase/server";
import { suggestWritingScore } from "@/lib/ai/generate";
import { AIError, aiConfig } from "@/lib/ai/provider";
import type { Task, Criterion } from "@/lib/lesson";
import { json, fail } from "@/lib/api";

export const maxDuration = 60;

const Body = z.object({ assignmentId: z.string().uuid(), taskId: z.string().min(1).max(40) });

/** AI pre-assessment for one free writing answer. Stored as a suggestion only; it is never counted until the teacher accepts it. */
export async function POST(req: Request) {
  const { sb, user } = await getTeacher();
  if (!user) return fail("auth", 401);
  if (!aiConfig()) return fail("not_configured", 503);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input");
  const { assignmentId, taskId } = parsed.data;
  // RLS: only the teacher who owns the lesson can read this assignment.
  const { data: a } = await sb.from("assignments").select("id, content").eq("id", assignmentId).maybeSingle();
  if (!a) return fail("not_found", 404);
  const task = (a.content.tasks as Task[]).find((t) => t.id === taskId);
  if (!task || task.type !== "short") return fail("bad_task");
  const { data: r } = await sb.from("responses").select("answer, ai_suggested_score, ai_feedback").eq("assignment_id", assignmentId).eq("task_id", taskId).maybeSingle();
  if (!r || typeof r.answer !== "string" || !r.answer.trim()) return fail("no_answer");
  // Already suggested: return it instead of paying again.
  if (r.ai_suggested_score !== null) return json({ score: r.ai_suggested_score, feedback: r.ai_feedback });
  // One paid call per answer, even if the button is pressed twice.
  const admin = sb; // RLS: teachers only see and write their own request rows
  const key = `suggest:${assignmentId}:${taskId}`;
  const ins = await admin.from("ai_requests").insert({ teacher_id: user.id, idempotency_key: key, kind: "suggest" }).select("id").single();
  if (ins.error) {
    const { data: prev } = await admin.from("ai_requests").select("status").eq("idempotency_key", key).maybeSingle();
    if (prev?.status === "pending") return json({ error: "in_progress" }, 202);
    // A failed earlier attempt may be retried.
    await admin.from("ai_requests").update({ status: "pending", error: null }).eq("idempotency_key", key).eq("status", "error");
  }
  try {
    const crit = (a.content.criteria as Criterion[]).find((c) => c.id === task.criterion_id);
    // Only the task and the answer are sent; no student name or id.
    const s = await suggestWritingScore(task, crit, r.answer);
    if (!s) return fail("not_configured", 503);
    await sb.from("responses").update({ ai_suggested_score: s.score, ai_feedback: s.feedback }).eq("assignment_id", assignmentId).eq("task_id", taskId);
    await admin.from("ai_requests").update({ status: "done" }).eq("idempotency_key", key);
    return json(s);
  } catch (e) {
    const code = e instanceof AIError ? e.code : "provider_error";
    await admin.from("ai_requests").update({ status: "error", error: code }).eq("idempotency_key", key);
    return fail(code, code === "rate_limit" ? 429 : code === "timeout" ? 504 : 502);
  }
}
