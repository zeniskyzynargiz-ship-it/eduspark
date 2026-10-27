import "server-only";
import { type LessonContent, type Task, type Criterion } from "../lesson";
import { repairLesson } from "../lesson-fix";
import type { ClassProfile } from "../profile";
import { AIError, aiConfig, callAI, extractJson } from "./provider";
import { partSystemPrompt, planSystemPrompt, planUserPrompt, variantSystemPrompt, variantUserPrompt, writingSystemPrompt, type LessonInput } from "./prompts";
import { demoLesson } from "./demo";

export type GenResult = { content: LessonContent; isDemo: boolean; provider: string | null; model: string | null; fallback?: string; fallbackDetail?: string };

/** Normalises and auto-fixes the AI answer, then runs the business checks. */
function check(raw: unknown, duration: number): { ok: true; content: LessonContent } | { ok: false; errors: string[] } {
  return repairLesson(raw, duration);
}

function tryJson(text: string): unknown {
  try {
    return extractJson(text);
  } catch {
    return null;
  }
}

type PlanSlot = { id: string; type: Task["type"]; criterion_id: string; points: number; focus?: string };

/** Asks for one JSON answer; on a broken answer asks once more. */
async function askJson(system: string, user: string, maxTokens: number, accept: (j: unknown) => string | null, deadline: number): Promise<unknown> {
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? user : `${user}\n\nYour previous answer was rejected: ${lastErr}\nReturn the full corrected JSON.`;
    const json = tryJson(await callAI(system, prompt, maxTokens, deadline));
    const problem = json ? accept(json) : "The answer was not complete JSON.";
    if (!problem) return json;
    lastErr = problem;
  }
  throw new AIError("invalid_output", lastErr);
}

/**
 * Generates a lesson in small parts, which is faster and far less error-prone than one huge answer:
 * 1) the lesson plan (stages, criteria, shared tasks, support) with a fixed "task plan";
 * 2) one call per interest, run in parallel, that writes only that variant's tasks to the task plan.
 * The site then fixes small number slips itself (lib/lesson-fix). With no provider configured,
 * or if the AI still fails, a labelled template is returned for the teacher to fill in by hand.
 */
export async function generateLesson(input: LessonInput, profile: ClassProfile, interests: string[]): Promise<GenResult> {
  const cfg = aiConfig();
  if (!cfg) return { content: demoLesson(input, profile, interests), isDemo: true, provider: null, model: null };
  const list = interests.length ? interests : ["sport", "music", "travel", "technology"];
  const t0 = Date.now();
  try {
    const plan = (await askJson(planSystemPrompt(), planUserPrompt(input, profile, list), 16000, (j) => {
      const o = j as { task_plan?: PlanSlot[]; stages?: unknown[]; criteria?: unknown[] };
      if (!Array.isArray(o.task_plan) || o.task_plan.length < 2) return "task_plan must list 2-6 tasks.";
      if (!Array.isArray(o.stages) || !Array.isArray(o.criteria)) return "stages and criteria are required.";
      return null;
    }, t0 + 150_000)) as Record<string, unknown> & { task_plan: PlanSlot[] };
    const slots = plan.task_plan.slice(0, 6).map((t, i) => ({ ...t, id: String(t.id || `t${i + 1}`), points: Math.max(1, Math.min(20, Math.round(Number(t.points) || 2))) }));
    const { task_plan: _tp, ...planRest } = plan;

    const variants = (
      await Promise.all(
        list.map((interest) =>
          askJson(variantSystemPrompt(), variantUserPrompt(input, planRest, slots, interest), 8000, (j) => {
            const v = j as { tasks?: unknown[] };
            return Array.isArray(v.tasks) && v.tasks.length === slots.length ? null : `tasks must contain exactly ${slots.length} tasks in the task_plan order.`;
          }, t0 + 270_000)
            .then((j) => {
              const v = j as { context?: unknown; tasks: Record<string, unknown>[] };
              // The task plan decides ids, criteria and points, so every variant is assessed the same way.
              return { interest, context: v.context, theory: (v as { theory?: unknown }).theory, tasks: v.tasks.map((t, i) => ({ ...t, id: slots[i].id, criterion_id: slots[i].criterion_id, points: slots[i].points, type: t.type ?? slots[i].type })) };
            })
            .catch(() => null),
        ),
      )
    ).filter(Boolean);
    if (!variants.length) throw new AIError("invalid_output", "No variant could be written.");

    const result = check({ ...planRest, variants }, input.duration);
    if (!result.ok) throw new AIError("invalid_output", result.errors.join(" "));
    return { content: result.content, isDemo: false, provider: cfg.label, model: cfg.model };
  } catch (e) {
    // Never leave the teacher with nothing: hand over the labelled template to fill in by hand.
    const reason = e instanceof AIError ? e.code : "provider_error";
    return { content: demoLesson(input, profile, list), isDemo: true, provider: null, model: null, fallback: reason, fallbackDetail: e instanceof Error ? e.message : "" };
  }
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
