import { z } from "zod";

export const INTERESTS = ["sport", "music", "travel", "technology", "games", "animals", "art", "other"] as const;
export const DIFFICULTIES = ["vocabulary", "grammar", "reading", "speaking_fear", "task_meaning"] as const;
export const SUPPORTS = ["examples", "word_list", "sentence_frames", "pair_help", "teacher_help", "pictures", "more_time"] as const;
export type Interest = (typeof INTERESTS)[number];
/** A teacher's own interest option is stored as "+" and its label, e.g. "+Кино". */
export const CUSTOM_INTEREST = /^\+[^\s+][^\n]{0,39}$/;
export const isInterestKey = (k: string) => (INTERESTS as readonly string[]).includes(k) || CUSTOM_INTEREST.test(k);

export const Bi = z.object({ kk: z.string().min(1), en: z.string().min(1) });
export type Bi = z.infer<typeof Bi>;

const base = {
  id: z.string().min(1).max(40),
  instruction: Bi,
  prompt: z.string().default(""),
  points: z.number().int().min(1).max(20),
  criterion_id: z.string().min(1),
  hint: Bi.optional(),
};

export const TaskSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("choice"),
    options: z.array(z.string().min(1)).min(2).max(6),
    correct: z.array(z.number().int().min(0)).min(1),
  }),
  z.object({
    ...base,
    type: z.literal("match"),
    pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2).max(6),
  }),
  z.object({
    ...base,
    type: z.literal("gap"),
    // Text uses ___ for each blank. answers[i] lists every accepted answer for blank i.
    text: z.string().min(1),
    answers: z.array(z.array(z.string().min(1)).min(1)).min(1),
  }),
  z.object({ ...base, type: z.literal("short"), sample_answer: z.string().default("") }),
  z.object({ ...base, type: z.literal("voice"), sample_answer: z.string().default("") }),
  z.object({ ...base, type: z.literal("pair"), roles: z.array(z.string()).default([]) }),
]);
export type Task = z.infer<typeof TaskSchema>;
export type TaskType = Task["type"];
export const CLOSED_TYPES: TaskType[] = ["choice", "match", "gap"];

export const CriterionSchema = z.object({
  id: z.string().min(1),
  name: Bi,
  descriptors: z.array(z.object({ text: Bi, points: z.number().int().min(1) })).min(1),
});
export type Criterion = z.infer<typeof CriterionSchema>;

export const StageSchema = z.object({
  title: Bi,
  minutes: z.number().int().min(1),
  teacher_activity: Bi,
  student_activity: Bi,
  resources: z.string().default(""),
  evidence: Bi,
});
export type Stage = z.infer<typeof StageSchema>;

/** Short theory for one interest: the lesson's rule or idea explained with examples from that interest. */
const LooseBi = z.object({ kk: z.string(), en: z.string() });
/** One step of the explanation: a rule in simple words, an example from the interest, and the part to highlight. */
export const TheoryStepSchema = z.object({
  note: LooseBi,
  example: z.string().default(""),
  translation: z.string().default(""),
  highlight: z.array(z.string()).default([]),
  /** 1-3 emoji that picture the example (e.g. "⚽🏃"). */
  emoji: z.string().default(""),
});
export type TheoryStep = z.infer<typeof TheoryStepSchema>;
export const TheorySchema = z.object({
  explanation: LooseBi,
  steps: z.array(TheoryStepSchema).default([]),
  examples: z.array(z.string()).default([]),
});
export type Theory = z.infer<typeof TheorySchema>;

export const VariantSchema = z.object({
  interest: z.string().refine(isInterestKey, "Unknown interest"),
  context: Bi,
  theory: TheorySchema.optional(),
  tasks: z.array(TaskSchema).min(1).max(8),
});
export type Variant = z.infer<typeof VariantSchema>;

export const LessonContentSchema = z.object({
  expected_outcomes: z.array(Bi).min(1),
  addie_rationale: z.object({ analyze: Bi, design: Bi, develop: Bi, implement: Bi, evaluate: Bi }),
  stages: z.array(StageSchema).min(2),
  criteria: z.array(CriterionSchema).min(1),
  variants: z.array(VariantSchema).min(1),
  common_tasks: z.array(TaskSchema).default([]),
  support: z.object({
    vocabulary: z.array(z.object({ en: z.string(), kk: z.string() })).default([]),
    sentence_frames: z.array(z.string()).default([]),
    explanation: Bi,
  }),
  reflection_questions: z.array(Bi).min(1),
  homework: Bi,
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

export type LessonStatus = "draft" | "approved" | "published" | "completed";

/** Points for one criterion inside a set of tasks. */
function pointsByCriterion(tasks: Task[]) {
  const m = new Map<string, number>();
  for (const t of tasks) m.set(t.criterion_id, (m.get(t.criterion_id) ?? 0) + t.points);
  return m;
}

export function variantTasks(c: LessonContent, v: Variant): Task[] {
  return [...v.tasks, ...c.common_tasks];
}

export function totalPoints(tasks: Task[]) {
  return tasks.reduce((s, t) => s + t.points, 0);
}

/**
 * Business checks the schema cannot express. Returns a list of problems (empty = valid).
 * - lesson stages add up exactly to the chosen duration
 * - every variant keeps the same criteria and points (context changes, assessment does not)
 * - descriptor points add up to each criterion's points
 * - closed tasks have a usable answer key
 */
export function validateLesson(c: LessonContent, durationMin: number): string[] {
  const errors: string[] = [];
  const minutes = c.stages.reduce((s, x) => s + x.minutes, 0);
  if (minutes !== durationMin) errors.push(`Stage minutes add up to ${minutes}, expected ${durationMin}.`);

  const critIds = new Set(c.criteria.map((x) => x.id));
  if (critIds.size !== c.criteria.length) errors.push("Criterion ids must be unique.");

  const interests = new Set<string>();
  let reference: Map<string, number> | null = null;
  for (const v of c.variants) {
    if (interests.has(v.interest)) errors.push(`Variant ${v.interest} appears twice.`);
    interests.add(v.interest);
    const tasks = variantTasks(c, v);
    const ids = new Set<string>();
    for (const t of tasks) {
      if (ids.has(t.id)) errors.push(`Task id ${t.id} repeats in variant ${v.interest}.`);
      ids.add(t.id);
      if (!critIds.has(t.criterion_id)) errors.push(`Task ${t.id} uses unknown criterion ${t.criterion_id}.`);
      if (t.type === "choice") {
        if (t.correct.some((i) => i >= t.options.length)) errors.push(`Task ${t.id}: correct option out of range.`);
      }
      if (t.type === "gap") {
        const blanks = (t.text.match(/_{3,}/g) ?? []).length;
        if (blanks !== t.answers.length) errors.push(`Task ${t.id}: ${blanks} blanks but ${t.answers.length} answers.`);
      }
    }
    const byCrit = pointsByCriterion(tasks);
    if (!reference) reference = byCrit;
    else {
      for (const id of critIds) {
        if ((byCrit.get(id) ?? 0) !== (reference.get(id) ?? 0))
          errors.push(`Variant ${v.interest} gives criterion ${id} ${byCrit.get(id) ?? 0} points, other variants ${reference.get(id) ?? 0}.`);
      }
    }
  }

  if (reference) {
    for (const cr of c.criteria) {
      const desc = cr.descriptors.reduce((s, d) => s + d.points, 0);
      const tasksPts = reference.get(cr.id) ?? 0;
      if (tasksPts === 0) errors.push(`Criterion ${cr.id} has no tasks.`);
      else if (desc !== tasksPts) errors.push(`Criterion ${cr.id}: descriptors give ${desc} points, tasks give ${tasksPts}.`);
    }
  }
  return errors;
}

/** Remove answer keys before sending a task to a student. */
export function publicTask(t: Task, opts: { revealKey: boolean }) {
  if (opts.revealKey) return t;
  switch (t.type) {
    case "choice": {
      const { correct: _c, ...rest } = t;
      return { ...rest, multi: t.correct.length > 1 };
    }
    case "match": {
      // Left column stays in order; right column is shuffled deterministically so the key is not visible.
      const rights = t.pairs.map((p) => p.right);
      const shuffled = seededShuffle(rights, t.id);
      return { ...t, pairs: undefined, left: t.pairs.map((p) => p.left), right: shuffled };
    }
    case "gap": {
      const { answers, ...rest } = t;
      return { ...rest, blanks: answers.length };
    }
    case "short":
    case "voice": {
      const { sample_answer: _s, ...rest } = t;
      return rest;
    }
    default:
      return t;
  }
}

export function seededShuffle<T>(arr: T[], seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Avoid showing the key in original order when possible.
  if (out.length > 1 && out.every((x, i) => x === arr[i])) out.push(out.shift() as T);
  return out;
}
