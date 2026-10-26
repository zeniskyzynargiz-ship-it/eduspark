import "server-only";
import { LessonContentSchema, validateLesson, type LessonContent, type Task, type Criterion } from "../lesson";
import type { ClassProfile } from "../profile";
import { AIError, aiConfig, callAI, extractJson } from "./provider";
import { lessonSystemPrompt, lessonUserPrompt, partSystemPrompt, writingSystemPrompt, type LessonInput } from "./prompts";
import { demoLesson } from "./demo";

export type GenResult = { content: LessonContent; isDemo: boolean; provider: string | null; model: string | null };

function check(raw: unknown, duration: number): { ok: true; content: LessonContent } | { ok: false; errors: string[] } {
  const parsed = LessonContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 15).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const errors = validateLesson(parsed.data, duration);
  return errors.length ? { ok: false, errors } : { ok: true, content: parsed.data };
}

/**
 * Generates a lesson. With no provider configured, returns the labelled demo template.
 * With a provider: one call, and at most one repair call if the structure fails the checks.
 */
export async function generateLesson(input: LessonInput, profile: ClassProfile, interests: string[]): Promise<GenResult> {
  const cfg = aiConfig();
  if (!cfg) return { content: demoLesson(input, profile, interests), isDemo: true, provider: null, model: null };

  const system = lessonSystemPrompt();
  const user = lessonUserPrompt(input, profile, interests);
  const first = await callAI(system, user, 16000);
  let result = check(extractJson(first), input.duration);
  if (!result.ok) {
    const repair = await callAI(
      system,
      `${user}\n\nYour previous answer failed these checks:\n- ${result.errors.join("\n- ")}\n\nPrevious answer:\n${first.slice(0, 30000)}\n\nReturn the corrected full JSON.`,
      16000,
    );
    result = check(extractJson(repair), input.duration);
    if (!result.ok) throw new AIError("invalid_output", result.errors.join(" "));
  }
  return { content: result.content, isDemo: false, provider: cfg.provider, model: cfg.model };
}

export const REGEN_PARTS = ["stages", "variants", "criteria", "support", "homework", "reflection_questions", "common_tasks"] as const;
export type RegenPart = (typeof REGEN_PARTS)[number];

/** Regenerates one part (or one interest variant) and re-checks the whole lesson. */
export async function regeneratePart(
  current: LessonContent,
  part: RegenPart,
  input: LessonInput,
  note: string,
  variantInterest?: string,
): Promise<LessonContent> {
  if (!aiConfig()) throw new AIError("not_configured", "AI provider is not configured");
  const target = part === "variants" && variantInterest ? `variants (only the "${variantInterest}" variant may change; copy others unchanged)` : part;
  const user = JSON.stringify({ lesson: input, teacher_note: note.slice(0, 1000), part_to_rewrite: target, current_lesson: current });
  const text = await callAI(partSystemPrompt(part), user, 12000);
  const obj = extractJson(text) as Record<string, unknown>;
  if (!(part in obj)) throw new AIError("invalid_output", `Missing key ${part}`);
  const merged = { ...current, [part]: obj[part] };
  if (part === "variants" && variantInterest) {
    // Only the requested variant may change.
    const next = (obj.variants as LessonContent["variants"]).find((v) => v.interest === variantInterest);
    if (!next) throw new AIError("invalid_output", "Variant missing");
    merged.variants = current.variants.map((v) => (v.interest === variantInterest ? next : v));
  }
  const res = check(merged, input.duration);
  if (!res.ok) throw new AIError("invalid_output", res.errors.join(" "));
  return res.content;
}

/** AI pre-assessment for a free writing answer. Only a suggestion; the teacher confirms. */
export async function suggestWritingScore(task: Task, criterion: Criterion | undefined, answer: string) {
  if (!aiConfig()) return null;
  const text = await callAI(
    writingSystemPrompt(),
    JSON.stringify({
      task_prompt: task.prompt,
      instruction: task.instruction.en,
      max_points: task.points,
      criterion: criterion ? { name: criterion.name.en, descriptors: criterion.descriptors.map((d) => ({ text: d.text.en, points: d.points })) } : null,
      student_answer: answer.slice(0, 3000),
    }),
    800,
  );
  const obj = extractJson(text) as { score?: unknown; feedback?: { kk?: string; en?: string } };
  const score = Number(obj.score);
  if (!Number.isFinite(score)) throw new AIError("invalid_output", "No score");
  return { score: Math.max(0, Math.min(task.points, Math.round(score * 2) / 2)), feedback: { kk: obj.feedback?.kk ?? "", en: obj.feedback?.en ?? "" } };
}
