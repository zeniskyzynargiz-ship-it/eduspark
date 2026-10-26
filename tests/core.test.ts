import { test } from "node:test";
import assert from "node:assert/strict";
import { demoLesson } from "../src/lib/ai/demo";
import { buildProfile } from "../src/lib/profile";
import { validateLesson, publicTask, LessonContentSchema, variantTasks, totalPoints } from "../src/lib/lesson";
import { autoGrade, normalize, finalScore } from "../src/lib/grading";
import { BASELINE_TASKS } from "../src/lib/baseline";
import { kk } from "../src/lib/i18n/kk";
import { en } from "../src/lib/i18n/en";

const empty = buildProfile([], new Map(), new Map());

test("demo lesson is valid and minutes match every duration", () => {
  for (const duration of [10, 25, 40, 45, 80, 90, 180]) {
    const c = demoLesson({ topic: "Hobbies", objective: "Use present simple", duration, gradeLevel: "7", sourceMaterial: "", requirements: "" }, empty, ["sport", "music", "games", "art"]);
    assert.ok(LessonContentSchema.safeParse(c).success, "schema");
    assert.deepEqual(validateLesson(c, duration), [], `duration ${duration}`);
    assert.equal(c.stages.reduce((s, x) => s + x.minutes, 0), duration);
  }
});

test("validation catches wrong minutes, unequal variants and descriptor sums", () => {
  const c = demoLesson({ topic: "x", objective: "objective", duration: 45, gradeLevel: "", sourceMaterial: "", requirements: "" }, empty, ["sport", "music"]);
  const bad = structuredClone(c);
  bad.stages[0].minutes += 1;
  bad.variants[1].tasks[0].points += 1;
  bad.criteria[0].descriptors[0].points += 3;
  const errs = validateLesson(bad, 45);
  assert.ok(errs.some((e) => e.includes("Stage minutes")));
  assert.ok(errs.some((e) => e.includes("Variant music")));
  assert.ok(errs.some((e) => e.includes("descriptors")));
});

test("points are not a fixed 10", () => {
  const c = demoLesson({ topic: "x", objective: "objective", duration: 45, gradeLevel: "", sourceMaterial: "", requirements: "" }, empty, ["sport"]);
  assert.notEqual(totalPoints(variantTasks(c, c.variants[0])), 10);
});

test("public task never contains the answer key", () => {
  const c = demoLesson({ topic: "x", objective: "objective", duration: 45, gradeLevel: "", sourceMaterial: "", requirements: "" }, empty, ["sport"]);
  for (const t of variantTasks(c, c.variants[0])) {
    const p = JSON.stringify(publicTask(t, { revealKey: false }));
    assert.ok(!p.includes('"correct"'), t.id);
    assert.ok(!p.includes('"answers"'), t.id);
    assert.ok(!p.includes('"pairs"'), t.id);
    assert.ok(!p.includes('"sample_answer"'), t.id);
  }
});

test("closed task grading: alternatives, case, punctuation, contractions, near-miss flagged", () => {
  const gap = { id: "g", type: "gap", criterion_id: "c", points: 2, prompt: "", instruction: { kk: "a", en: "a" }, text: "He ___ . I ___ .", answers: [["plays"], ["do not like", "don't like"]] } as const;
  assert.equal(autoGrade(gap as never, ["Plays.", "don’t like"])!.score, 2);
  assert.equal(autoGrade(gap as never, ["play", "do not like"])!.score, 1);
  const near = autoGrade(gap as never, ["plaays", ""])!;
  assert.equal(near.score, 0);
  assert.equal(near.flagged, true);
  const choice = { id: "c", type: "choice", criterion_id: "c", points: 1, prompt: "", instruction: { kk: "a", en: "a" }, options: ["a", "b", "c"], correct: [0, 2] } as const;
  assert.equal(autoGrade(choice as never, [2, 0])!.score, 1);
  assert.equal(autoGrade(choice as never, [0])!.score, 0);
  assert.equal(normalize("  I'M  Happy! "), "i am happy");
});

test("teacher score wins over auto score; AI suggestion alone never counts", () => {
  assert.equal(finalScore({ teacher_score: 1, auto_score: 2 }), 1);
  assert.equal(finalScore({ teacher_score: null, auto_score: 2 }), 2);
  assert.equal(finalScore({ teacher_score: null, auto_score: null }), null);
});

test("baseline tasks are well formed", () => {
  const b2 = BASELINE_TASKS.find((t) => t.id === "b2")!;
  assert.equal(autoGrade(b2, ["plays", "go"])!.score, 2);
});

function keysOf(o: unknown, prefix = ""): string[] {
  if (!o || typeof o !== "object" || Array.isArray(o)) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
}
test("Kazakh and English dictionaries have the same keys and no empty strings", () => {
  assert.deepEqual(keysOf(kk).sort(), keysOf(en).sort());
  const empties = (o: unknown): boolean => (typeof o === "string" ? o.trim() === "" : Array.isArray(o) ? o.some(empties) : o && typeof o === "object" ? Object.values(o).some(empties) : false);
  assert.equal(empties(kk), false);
  assert.equal(empties(en), false);
});

test("lesson auto-fix repairs typical AI slips", async () => {
  const { repairLesson, fixLesson } = await import("../src/lib/lesson-fix");
  const c = demoLesson({ topic: "x", objective: "objective", duration: 45, gradeLevel: "", sourceMaterial: "", requirements: "" }, empty, ["sport", "music", "games"]);
  const bad = structuredClone(c) as unknown as Record<string, any>;
  bad.stages[0].minutes += 7; // minutes do not add up
  bad.variants[1].tasks[0].points += 2; // uneven variants
  bad.criteria[0].descriptors[0].points += 3; // descriptor sum off
  bad.variants[2].tasks[0].criterion_id = "nope"; // unknown criterion
  bad.homework = "Write about your hobby"; // plain string instead of {kk, en}
  bad.variants[0].tasks[1].instruction = { kk: "", en: "Match" }; // missing Kazakh
  bad.variants[0].interest = "Sport"; // wrong case
  const r = repairLesson(bad, 45);
  assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
  // Teacher edit: deleting a task from one variant still saves.
  const edited = structuredClone(c);
  edited.variants[1].tasks.splice(0, 1);
  const fixed = fixLesson(edited, 45);
  assert.ok(validateLesson(fixed, 45).length <= 1);
});
