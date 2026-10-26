import { z } from "zod";
import { getTeacher } from "@/lib/supabase/server";
import { loadClassProfile, variantInterests } from "@/lib/profile";
import { generateLesson } from "@/lib/ai/generate";
import { AIError } from "@/lib/ai/provider";
import { buildAddie } from "@/lib/addie";
import { json, fail } from "@/lib/api";

export const maxDuration = 300;

const Body = z.object({
  classId: z.string().uuid(),
  topic: z.string().trim().min(2).max(200),
  objective: z.string().trim().min(5).max(1000),
  duration: z.number().int().min(10).max(180),
  source: z.string().max(6000).default(""),
  requirements: z.string().max(2000).default(""),
  idempotencyKey: z.string().min(16).max(80),
});

const STATUS: Record<string, number> = { timeout: 504, rate_limit: 429, provider_error: 502, invalid_output: 502, not_configured: 503 };

export async function POST(req: Request) {
  const { sb, user } = await getTeacher();
  if (!user) return fail("auth", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input");
  const b = parsed.data;
  const { data: cls } = await sb.from("classes").select("id, grade_level").eq("id", b.classId).maybeSingle();
  if (!cls) return fail("not_found", 404);

  // Idempotency: the same key never starts a second (paid) generation.
  const admin = sb; // RLS: teachers only see and write their own request rows
  const ins = await admin.from("ai_requests").insert({ teacher_id: user.id, idempotency_key: b.idempotencyKey, kind: "generate" }).select("id").single();
  if (ins.error) {
    const { data: prev } = await admin.from("ai_requests").select("status, lesson_id, error, teacher_id").eq("idempotency_key", b.idempotencyKey).maybeSingle();
    if (!prev || prev.teacher_id !== user.id) return fail("conflict", 409);
    if (prev.status === "done" && prev.lesson_id) return json({ lessonId: prev.lesson_id });
    if (prev.status === "pending") return json({ error: "in_progress" }, 202);
    return json({ error: prev.error ?? "provider_error" }, 409);
  }
  const reqId = ins.data.id;

  try {
    const profile = await loadClassProfile(sb, b.classId);
    const interests = variantInterests(profile);
    const input = { topic: b.topic, objective: b.objective, duration: b.duration, gradeLevel: cls.grade_level, sourceMaterial: b.source, requirements: b.requirements };
    const gen = await generateLesson(input, profile, interests);
    const { data: lesson, error } = await sb
      .from("lessons")
      .insert({
        class_id: b.classId,
        teacher_id: user.id,
        topic: b.topic,
        objective: b.objective,
        duration_min: b.duration,
        source_material: b.source,
        requirements: b.requirements,
        content: gen.content,
        addie: buildAddie(profile, input, gen.content),
        is_demo: gen.isDemo,
        ai_provider: gen.provider,
        ai_model: gen.model,
      })
      .select("id")
      .single();
    if (error || !lesson) throw new AIError("provider_error", "save failed");
    await sb.from("lesson_versions").insert({ lesson_id: lesson.id, version: 1, content: gen.content, note: gen.isDemo ? "demo" : "ai" });
    await admin.from("ai_requests").update({ status: "done", lesson_id: lesson.id }).eq("id", reqId);
    return json({ lessonId: lesson.id, demo: gen.isDemo });
  } catch (e) {
    const code = e instanceof AIError ? e.code : "provider_error";
    await admin.from("ai_requests").update({ status: "error", error: code }).eq("id", reqId);
    return json({ error: code }, STATUS[code] ?? 500);
  }
}
