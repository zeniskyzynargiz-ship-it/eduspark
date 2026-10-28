import type { ClassProfile } from "../profile";

export type LessonInput = {
  topic: string;
  objective: string;
  duration: number;
  gradeLevel: string;
  sourceMaterial: string;
  requirements: string;
};

export const SCHEMA_TEXT = `
Return ONE JSON object, no prose, exactly in this shape (Bi = {"kk": "...Kazakh...", "en": "...English..."}):
{
  "expected_outcomes": [Bi, ...],
  "addie_rationale": {"analyze": Bi, "design": Bi, "develop": Bi, "implement": Bi, "evaluate": Bi},
  "stages": [{"title": Bi, "minutes": int, "teacher_activity": Bi, "student_activity": Bi, "resources": "string", "evidence": Bi}],
  "criteria": [{"id": "c1", "name": Bi, "descriptors": [{"text": Bi, "points": int}]}],
  "variants": [{"interest": "one key from the listed interests, copied exactly (a key that starts with + is a teacher-added interest)", "context": Bi, "theory": Theory, "tasks": [Task, ...]}],
  "common_tasks": [Task, ...],
  "support": {"vocabulary": [{"en": "word", "kk": "сөз"}], "sentence_frames": ["I think ... because ..."], "explanation": Bi},
  "reflection_questions": [Bi, ...],
  "homework": Bi
}
Theory = {"explanation": Bi, "steps": [{"note": Bi, "example": "English sentence", "translation": "Kazakh translation", "highlight": ["part of the example"]}], "examples": ["English sentence", ...]}: a full explanation of the lesson's key rule told through this interest (see the variant rules).
Task is one of (every task also has "id" (unique, short), "instruction": Bi, "prompt": "English text", "points": int, "criterion_id": "c1", optional "hint": Bi):
  {"type": "choice", "options": ["..."], "correct": [index, ...]}
  {"type": "match", "pairs": [{"left": "...", "right": "..."}]}
  {"type": "gap", "text": "Sentence with ___ for each blank", "answers": [["accepted", "also accepted"], ...]}
  {"type": "short", "sample_answer": "..."}
  {"type": "voice", "sample_answer": "..."}
  {"type": "pair", "roles": ["Student A: ...", "Student B: ..."]}
`;

export const RULES = `
Rules (all are checked by software; a reply that breaks one is rejected):
1. Keep the teacher's learning objective word for word in meaning. Do not invent curriculum codes.
2. Stage minutes must add up EXACTLY to the lesson duration. Every stage has teacher activity, student activity, resources and assessment evidence.
3. Make one variant per listed interest. Variants change only the context (texts, examples, names of things). Every variant must have the same number of points for each criterion, so the core assessment stays the same.
4. For every criterion the descriptor points must add up to the points of the tasks that use that criterion (in one variant, including common_tasks). Choose points that fit the tasks; do not default to 10.
5. common_tasks must contain one "pair" task (pair or group work) and one shared final task for the whole class. They are added to every variant.
6. The individual work for each student must fit inside the lesson time.
7. English is the subject: task texts, dialogues and grammar items stay in English. Instructions, hints, stage descriptions and criteria are given in BOTH Kazakh and English.
8. Every text is read by teachers and students. Never mention JSON, ids, keys or field names (such as t1, common_tasks, past_trip_pair, S1) in any text; describe tasks and students in plain words.
8. Gap tasks: the number of ___ blanks equals the number of answer lists. List every acceptable answer.
9. Offer support (word list, sentence frames, short explanation) that matches the difficulties reported. Support can fade gradually; never lower a student's level because of one mistake.
10. Use only the class data given. If data is missing, say so in addie_rationale.analyze instead of guessing. Correlation is not causation; do not claim the lesson will raise motivation.
11. Student identities are anonymous references (S1, S2...). Never invent names of real students.
`;

export function lessonSystemPrompt() {
  return `You are an experienced English teacher and instructional designer using the ADDIE model. You design one lesson for a Kazakhstan school class. ${RULES}\n${SCHEMA_TEXT}`;
}

export function lessonUserPrompt(input: LessonInput, profile: ClassProfile, interests: string[]) {
  return JSON.stringify(
    {
      lesson: {
        topic: input.topic,
        learning_objective: input.objective,
        duration_minutes: input.duration,
        grade_level: input.gradeLevel,
        source_material: input.sourceMaterial.slice(0, 6000),
        extra_requirements: input.requirements.slice(0, 2000),
      },
      make_variants_for_interests: interests,
      class_data: profile.forAI,
    },
    null,
    1,
  );
}

export function partSystemPrompt(part: string) {
  return `You are editing one part of an existing English lesson plan. Return ONE JSON object containing only the key "${part}" with its new value, in the same format as before. Keep everything consistent with the rest of the lesson (criteria ids, points per criterion, total minutes). ${RULES}\n${SCHEMA_TEXT}`;
}

export function writingSystemPrompt() {
  return `You help an English teacher pre-assess a short student answer. You only suggest; the teacher decides. Judge only against the given criterion descriptors and the task. Be kind and specific. Return ONE JSON object: {"score": number, "feedback": {"kk": "...", "en": "..."}} where score is between 0 and max_points (half points allowed).`;
}

// ---------- Generation in parts ----------

export function planSystemPrompt() {
  return `You are an experienced English teacher and instructional designer using the ADDIE model. You design one lesson for a Kazakhstan school class.
In THIS step you write the lesson plan and a task plan. The interest-based variants are written later from your task plan.
${RULES}
Return ONE JSON object, no prose (Bi = {"kk": "...Kazakh...", "en": "...English..."}):
{
  "expected_outcomes": [Bi, ...],
  "addie_rationale": {"analyze": Bi, "design": Bi, "develop": Bi, "implement": Bi, "evaluate": Bi},
  "stages": [{"title": Bi, "minutes": int, "teacher_activity": Bi, "student_activity": Bi, "resources": "string", "evidence": Bi}],
  "criteria": [{"id": "c1", "name": Bi, "descriptors": [{"text": Bi, "points": int}]}],
  "task_plan": [{"id": "t1", "type": "choice|match|gap|short|voice", "criterion_id": "c1", "points": int, "focus": "what this task practises"}],
  "common_tasks": [Task, ...],
  "support": {"vocabulary": [{"en": "word", "kk": "сөз"}], "sentence_frames": ["..."], "explanation": Bi},
  "reflection_questions": [Bi, ...],
  "homework": Bi
}
task_plan: 3 to 5 individual tasks that EVERY interest variant will have, in this order. Mix closed tasks (choice, match, gap) with at least one open task (short or voice).
For every criterion: descriptor points = points of task_plan tasks + common_tasks that use that criterion.
Task (for common_tasks) is one of (each also has "id", "instruction": Bi, "prompt": "English text", "points": int, "criterion_id"):
  {"type": "pair", "roles": ["Student A: ...", "Student B: ..."]}
  {"type": "voice", "sample_answer": "..."}
  {"type": "short", "sample_answer": "..."}
Keep texts short and clear.`;
}

export function planUserPrompt(input: LessonInput, profile: ClassProfile, interests: string[]) {
  return lessonUserPrompt(input, profile, interests);
}

export function variantSystemPrompt() {
  return `You write the individual tasks of ONE interest variant of an English lesson for a Kazakhstan school class.
Follow the task_plan exactly: same number of tasks, same order, same id, type, criterion_id and points. Only the context (texts, examples, names of things) follows the student's interest.
English is the subject: prompts, texts and options are in English. Instructions and hints are in BOTH Kazakh and English. Never invent names of real students.
Return ONE JSON object, no prose (Bi = {"kk": "...", "en": "..."}):
{"context": Bi, "theory": {"explanation": Bi, "steps": [{"note": Bi, "example": "English sentence", "translation": "Kazakh", "highlight": ["exact part"], "emoji": "⚽🏃"}], "examples": ["English sentence", ...]}, "tasks": [Task, ...]}
"theory" is a FULL explanation of the lesson's key rule or idea (the same rule for every variant), told through this interest, so a Grade 7 student can learn it before the tasks:
- "explanation": 2-4 simple sentences that connect the interest to the rule (e.g. "A footballer trains every day and plays matches. These are repeated actions. In English we talk about habits with Present Simple.").
- "steps": 3-5 steps from simple to harder. Each step has "note" (the rule in very simple words, Kazakh and English), "example" (one English sentence from this interest), "translation" (Kazakh translation of the example) and "highlight" (1-3 exact parts of the example that show the rule, e.g. ["plays"] or ["did", "go"]; each must appear in the example exactly) and "emoji" (1-3 emoji that picture the example, e.g. "⚽🏃").
- "examples": 3-4 more English sentences from this interest.
Task (each also has "id", "instruction": Bi, "prompt": "English text", "points": int, "criterion_id", optional "hint": Bi):
  {"type": "choice", "options": ["..."], "correct": [index, ...]}
  {"type": "match", "pairs": [{"left": "...", "right": "..."}]}   (3-5 pairs)
  {"type": "gap", "text": "Sentence with ___ for each blank", "answers": [["accepted", "also accepted"], ...]}   (number of ___ = number of answer lists)
  {"type": "short", "sample_answer": "..."}
  {"type": "voice", "sample_answer": "..."}`;
}

export function variantUserPrompt(input: LessonInput, plan: Record<string, unknown>, slots: unknown[], interest: string) {
  return JSON.stringify({
    lesson: { topic: input.topic, learning_objective: input.objective, grade_level: input.gradeLevel, source_material: input.sourceMaterial.slice(0, 3000) },
    interest: interest.replace(/^\+/, ""),
    criteria: plan.criteria,
    support: plan.support,
    task_plan: slots,
  });
}
