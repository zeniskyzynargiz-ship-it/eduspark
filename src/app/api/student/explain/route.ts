import { getStudent } from "@/lib/student-session";
import { ownAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, fail } from "@/lib/api";
import { AIError, aiConfig, callAI, extractJson } from "@/lib/ai/provider";
import { publicTask, type Task, type Theory } from "@/lib/lesson";
import type { AssignmentContent } from "@/lib/assignment";

export const maxDuration = 60;
const DAILY_LIMIT = 25;

/** The student's earlier questions for this lesson. */
export async function GET(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  const a = await ownAssignment(st.id, new URL(req.url).searchParams.get("assignment") ?? "");
  if (!a) return fail("not_found", 404);
  const { data } = await supabaseAdmin().from("explain_questions").select("question, answer").eq("assignment_id", a.id).order("created_at").limit(30);
  return json({ turns: (data ?? []).map((r) => ({ q: r.question, a: r.answer })) });
}

/**
 * "Explain it to me": a short tutor answer about the lesson's rule, told through the student's interest.
 * Only the lesson content and the question go to the AI: no student name, and no answer keys.
 */
export async function POST(req: Request) {
  const st = await getStudent();
  if (!st) return fail("auth", 401);
  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  const lang = body.lang === "en" ? "en" : "kk";
  if (question.length < 2) return fail("empty");
  const a = await ownAssignment(st.id, String(body.assignmentId ?? ""));
  if (!a) return fail("not_found", 404);
  if (!aiConfig()) return fail("not_configured", 503);

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("explain_questions").select("id", { count: "exact", head: true }).eq("student_id", st.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return fail("limit", 429);

  const c = a.content as AssignmentContent & { theory?: Theory | null };
  const { data: history } = await db.from("explain_questions").select("question, answer").eq("assignment_id", a.id).order("created_at", { ascending: false }).limit(4);
  const context = {
    lesson_topic: c.topic,
    learning_objective: c.objective,
    student_interest: String(c.interest ?? "").replace(/^\+/, ""),
    explanation_shown_to_student: c.theory ?? null,
    // Tasks without answer keys, so the tutor can hint but not give answers away.
    tasks: (c.tasks as Task[]).map((t) => {
      const p = publicTask(t, { revealKey: false }) as Record<string, unknown>;
      return { type: p.type, instruction: p.instruction, prompt: p.prompt, options: p.options, text: p.text };
    }),
    earlier_questions: (history ?? []).reverse().map((h) => ({ q: h.question, a: h.answer })),
  };
  const system = `You are a kind, patient English tutor for a Grade 7 student in Kazakhstan.
Answer the student's question about this lesson in ${lang === "kk" ? "Kazakh" : "simple English"}, in 2-6 short sentences, at A2 level.
Explain with examples from the student's interest (${context.student_interest || "everyday life"}). Put English example sentences in quotes and translate them.
If the question is about a task, give a hint or a similar example, never the exact answer to the task.
If the question is not about learning, gently bring the student back to the lesson. Never ask for personal information.
Return ONE JSON object: {"answer": "..."}`;
  try {
    const raw = await callAI(system, JSON.stringify({ context, question }), 1200, Date.now() + 50_000);
    const obj = extractJson(raw) as { answer?: unknown };
    const answer = String(obj.answer ?? "").trim().slice(0, 2000);
    if (!answer) throw new AIError("invalid_output", "empty");
    await db.from("explain_questions").insert({ assignment_id: a.id, student_id: st.id, question, answer });
    return json({ answer });
  } catch (e) {
    const code = e instanceof AIError ? e.code : "provider_error";
    return fail(code === "rate_limit" ? "busy" : "ai_error", 502);
  }
}
