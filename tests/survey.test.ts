import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSurveyConfig, surveyInterestKeys, readCustomAnswers, summarizeCustom, interestLabel } from "../src/lib/survey";
import { VariantSchema } from "../src/lib/lesson";
import { normalizeRaw } from "../src/lib/lesson-fix";

{
  const cfg = parseSurveyConfig({
    interests: ["  Кино ", "Кино", "+Футбол", ""],
    hidden: ["games", "art"],
    blocks: { support: false },
    questions: [
      { id: "qa1", type: "single", text: "Why English?", options: ["Travel", "Work", "Travel"], required: true },
      { id: "qa2", type: "multi", text: "Only one option", options: ["A"] },
      { id: "qa3", type: "scale", text: "How much do you like reading?" },
      { id: "qa4", type: "text", text: "Anything else?" },
    ],
  });
  test("cleans the config", () => {
    assert.deepEqual(cfg.interests, ["Кино", "Футбол"]);
    assert.deepEqual(cfg.blocks, { difficulties: true, scales: true, support: false });
    assert.deepEqual(cfg.questions.map((q) => q.id), ["qa1", "qa3", "qa4"]);
    assert.deepEqual(cfg.questions[0].options, ["Travel", "Work"]);
    assert.deepEqual(surveyInterestKeys(cfg), ["sport", "music", "travel", "technology", "animals", "other", "+Кино", "+Футбол"]);
    assert.deepEqual(parseSurveyConfig("broken").questions, []);
  });
  test("reads answers and enforces required questions", () => {
    const form: Record<string, string[]> = { cq_qa1: ["Work"], cq_qa3: ["4"], cq_qa4: ["I like films"] };
    const r = readCustomAnswers(cfg, (n) => form[n] ?? []);
    assert.equal(r.missing, false);
    assert.equal(r.answers.qa1.a, "Work");
    assert.equal(r.answers.qa3.a, 4);
    assert.equal(readCustomAnswers(cfg, () => []).missing, true);
    const sum = summarizeCustom(cfg, [r.answers, {}]);
    assert.deepEqual(sum[0].counts, { Travel: 0, Work: 1 });
    assert.equal(sum[1].avg, 4);
  });
  test("accepts teacher interests in lesson variants", () => {
    const v = { interest: "+Кино", context: { kk: "a", en: "a" }, tasks: [{ id: "t1", type: "short", instruction: { kk: "a", en: "a" }, points: 2, criterion_id: "c1" }] };
    assert.equal(VariantSchema.safeParse(v).success, true);
    assert.equal(VariantSchema.safeParse({ ...v, interest: "cinema" }).success, false);
    const n = normalizeRaw({ variants: [v] }) as { variants: { interest: string }[] };
    assert.equal(n.variants[0].interest, "+Кино");
    assert.equal(interestLabel({ interests: { sport: "Спорт" } }, "+Кино"), "Кино");
  });
}

test("every student gets a variant from their own interests", async () => {
  const { buildProfile, variantInterests, pickVariant } = await import("../src/lib/profile");
  const st = (id: string) => ({ id, first_name: id, last_name: "", active: true });
  const sv = (id: string, interests: string[]) => ({ id, student_id: id, version: 1, interests, other_interest: "", difficulties: [], interest_scale: null, confidence_scale: null, meaning_scale: null, support: [], support_other: "", created_at: "" });
  const people: [string, string[]][] = [["a", ["sport"]], ["b", ["sport"]], ["c", ["music"]], ["d", ["technology"]], ["e", ["animals"]], ["f", ["travel", "games"]], ["g", ["art"]]];
  const p = buildProfile(people.map(([i]) => st(i)), new Map(people.map(([i, xs]) => [i, sv(i, xs)])), new Map());
  const v = variantInterests(p);
  assert.ok(v.length <= 6);
  for (const [, xs] of people.slice(0, 6)) assert.ok(xs.some((x) => v.includes(x)), `${xs} not covered by ${v}`);
  assert.equal(pickVariant(["travel", "games"], ["sport", "travel"]), "travel");
  assert.equal(pickVariant(["art"], ["sport", "other"]), "other");
});

test("every variant carries a short theory before the tasks", async () => {
  const { demoLesson } = await import("../src/lib/ai/demo");
  const { buildProfile } = await import("../src/lib/profile");
  const { LessonContentSchema } = await import("../src/lib/lesson");
  const { buildAssignmentContent } = await import("../src/lib/assignment");
  const c = demoLesson({ topic: "Travel", objective: "Past Simple", duration: 45, gradeLevel: "7", sourceMaterial: "", requirements: "" } as never, buildProfile([], new Map(), new Map()), ["travel", "+Кино"]);
  assert.ok(LessonContentSchema.safeParse(c).success);
  for (const v of c.variants) assert.ok(v.theory && v.theory.explanation.kk && v.theory.examples.length);
  assert.ok(buildAssignmentContent(c, "travel", { topic: "t", objective: "o" }).theory);
  const n = normalizeRaw({ variants: [{ interest: "music", context: "x", theory: { explanation: "Past Simple: add -ed", examples: ["I played the guitar.", { en: "She sang." }] }, tasks: [{ id: "t1", type: "short", instruction: "a", points: 2, criterion_id: "c1" }] }] }) as { variants: { theory: { explanation: { kk: string }; examples: string[] } }[] };
  assert.equal(n.variants[0].theory.explanation.kk, "Past Simple: add -ed");
  assert.deepEqual(n.variants[0].theory.examples, ["I played the guitar.", "She sang."]);
});

test("theory steps keep only highlights found in the example", async () => {
  const { demoLesson } = await import("../src/lib/ai/demo");
  const { buildProfile } = await import("../src/lib/profile");
  const c = demoLesson({ topic: "Sport", objective: "Present Simple", duration: 45, gradeLevel: "7", sourceMaterial: "", requirements: "" } as never, buildProfile([], new Map(), new Map()), ["sport"]);
  const steps = c.variants[0].theory!.steps;
  assert.ok(steps.length >= 2);
  assert.ok(steps.every((st) => !st.example.includes("___")));
  for (const st of steps) for (const h of st.highlight) assert.ok(st.example.includes(h));
  const n = normalizeRaw({ variants: [{ interest: "sport", context: "x", theory: { explanation: "x", steps: [{ note: "He/She/It + -s", example: "He plays football every day.", highlight: ["plays", "goes"], emoji: "⚽" }] }, tasks: [{ id: "t1", type: "short", instruction: "a", points: 2, criterion_id: "c1" }] }] }) as { variants: { theory: { steps: { note: { kk: string }; highlight: string[]; emoji: string }[] } }[] };
  const s0 = n.variants[0].theory.steps[0];
  assert.equal(s0.note.kk, "He/She/It + -s");
  assert.deepEqual(s0.highlight, ["plays"]);
  assert.equal(s0.emoji, "⚽");
});

test("technical ids are removed from readable lesson text", () => {
  const n = normalizeRaw({ stages: [{ title: "Pair work", minutes: 10, teacher_activity: { kk: "Жұптық тапсырманы түсіндіреді (past_trip_pair).", en: "Explains the task (t1, t2, t3)." }, student_activity: "x", evidence: "Answers (whole_class_voice)", resources: "Cards (common_tasks), timer" }] }) as { stages: { teacher_activity: { kk: string; en: string }; evidence: { kk: string }; resources: string }[] };
  assert.equal(n.stages[0].teacher_activity.kk, "Жұптық тапсырманы түсіндіреді.");
  assert.equal(n.stages[0].teacher_activity.en, "Explains the task.");
  assert.equal(n.stages[0].evidence.kk, "Answers");
  assert.equal(n.stages[0].resources, "Cards, timer");
});
