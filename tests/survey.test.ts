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
