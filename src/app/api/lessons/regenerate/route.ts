import { z } from "zod";
import { getTeacher } from "@/lib/supabase/server";
import { regeneratePart, REGEN_PARTS } from "@/lib/ai/generate";
import { AIError } from "@/lib/ai/provider";
import type { LessonContent } from "@/lib/lesson";
import { json, fail } from "@/lib/api";

export const maxDuration = 300;

const Body = z.object({
  lessonId: z.string().uuid(),
  part: z.enum(REGEN_PARTS),
  interest: z.string().max(20).optional(),
  note: z.string().max(1000).default(""),
  idempotencyKey: z.string().min(16).max(80),
});

/** Regenerates one part of a draft. Published or completed lessons are never changed, so student work stays as it is. */
export async function POST(req: Request) {
  const { sb, user } = await getTeacher();
  if (!user) return fail("auth", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input");
  const b = parsed.data;
  const { data: l } = await sb.from("lessons").select("*").eq("id", b.lessonId).maybeSingle();
  if (!l) return fail("not_found", 404);
  if (l.status === "published" || l.status === "completed") return fail("regenBlocked", 409);

  const admin = sb; // RLS: teachers only see and write their own request rows
  const ins = await admin.from("ai_requests").insert({ teacher_id: user.id, idempotency_key: b.idempotencyKey, kind: `regen:${b.part}`, lesson_id: l.id }).select("id").single();
  if (ins.error) {
    const { data: prev } = await admin.from("ai_requests").select("status, error, teacher_id").eq("idempotency_key", b.idempotencyKey).maybeSingle();
    if (!prev || prev.teacher_id !== user.id) return fail("conflict", 409);
    if (prev.status === "done") return json({ ok: true });
    if (prev.status === "pending") return json({ error: "in_progress" }, 202);
    return json({ error: prev.error ?? "provider_error" }, 409);
  }
  try {
    const content = await regeneratePart(
      l.content as LessonContent,
      b.part,
      { topic: l.topic, objective: l.objective, duration: l.duration_min, gradeLevel: "", sourceMaterial: l.source_material, requirements: l.requirements },
      b.note,
      b.interest,
    );
    const version = l.version + 1;
    await sb.from("lesson_versions").insert({ lesson_id: l.id, version, content, note: `regen ${b.part}${b.interest ? ":" + b.interest : ""}` });
    await sb.from("lessons").update({ content, version, status: "draft", is_demo: false, updated_at: new Date().toISOString() }).eq("id", l.id);
    await admin.from("ai_requests").update({ status: "done" }).eq("id", ins.data.id);
    return json({ ok: true });
  } catch (e) {
    const code = e instanceof AIError ? e.code : "provider_error";
    await admin.from("ai_requests").update({ status: "error", error: code }).eq("id", ins.data.id);
    return json({ error: code }, code === "rate_limit" ? 429 : code === "timeout" ? 504 : code === "not_configured" ? 503 : 502);
  }
}
