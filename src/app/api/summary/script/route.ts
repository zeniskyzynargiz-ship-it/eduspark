import { getTeacher } from "@/lib/supabase/server";
import { getStudent } from "@/lib/student-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { classFacts, factsHash, pupilFacts, studentFacts, type SummaryFacts } from "@/lib/summary-facts";
import { generateSummaryScript } from "@/lib/ai/summary";
import { AIError, aiConfig } from "@/lib/ai/provider";
import { json, fail } from "@/lib/api";

export const maxDuration = 120;

// Facts change as grading goes on; cap paid calls per summary so reloading cannot run up costs.
const MAX_SCRIPTS_PER_SUMMARY = 6;

/**
 * Returns AI-written captions for a summary video, built only from the real results.
 * The client keeps showing the rule-based captions when this returns { script: null }.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lessonId = url.searchParams.get("lesson") ?? "";
  const scope = url.searchParams.get("scope");
  let facts: SummaryFacts | null = null;
  let cacheLessonId = lessonId;
  let studentId: string | null = null;

  if (scope === "student") {
    const st = await getStudent();
    if (!st) return fail("auth", 401);
    const r = await studentFacts(st, lessonId);
    if (!r) return fail("not_found", 404);
    if (r.sc.answered === 0) return json({ script: null, reason: "no_data" });
    facts = r.facts;
    studentId = st.id;
  } else if (scope === "pupil") {
    // A teacher looking at one student's summary.
    const { sb, user } = await getTeacher();
    if (!user) return fail("auth", 401);
    const r = await pupilFacts(sb, url.searchParams.get("assignment") ?? "");
    if (!r) return fail("not_found", 404);
    if (r.sc.answered === 0) return json({ script: null, reason: "no_data" });
    facts = r.facts;
    studentId = r.assignment.student_id;
    cacheLessonId = r.lesson.id;
  } else if (scope === "class") {
    const { sb, user } = await getTeacher();
    if (!user) return fail("auth", 401);
    const r = await classFacts(sb, lessonId);
    if (!r) return fail("not_found", 404);
    if (r.facts.scope === "class" && r.facts.students_total === 0) return json({ script: null, reason: "no_data" });
    facts = r.facts;
  } else return fail("invalid_input");

  if (!aiConfig()) return json({ script: null, reason: "not_configured" });

  const db = supabaseAdmin();
  const hash = factsHash(facts);
  const base = () => {
    const q = db.from("summary_scripts").select("script, facts_hash").eq("lesson_id", cacheLessonId);
    return studentId ? q.eq("student_id", studentId) : q.is("student_id", null);
  };
  const { data: rows } = await base().order("created_at", { ascending: false });
  const hit = rows?.find((r) => r.facts_hash === hash);
  if (hit) return json({ script: hit.script });
  // An older script may describe outdated numbers, so past the cap fall back to the rule-based captions.
  if ((rows?.length ?? 0) >= MAX_SCRIPTS_PER_SUMMARY) return json({ script: null, reason: "cap" });

  try {
    const script = await generateSummaryScript(facts);
    const cfg = aiConfig();
    await db.from("summary_scripts").insert({ lesson_id: cacheLessonId, student_id: studentId, facts_hash: hash, script, provider: cfg?.label, model: cfg?.model });
    return json({ script });
  } catch (e) {
    return json({ script: null, reason: e instanceof AIError ? e.code : "provider_error" });
  }
}
