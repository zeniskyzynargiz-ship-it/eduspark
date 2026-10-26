import "server-only";
import { z } from "zod";
import { AIError, aiConfig, callAI, extractJson } from "./provider";
import { allowedNumbers, type SummaryFacts } from "../summary-facts";

const BiText = (max: number) => z.object({ kk: z.string().trim().min(1).max(max), en: z.string().trim().min(1).max(max) });
const ScriptSchema = z.object({
  title: BiText(70),
  slides: z.array(z.object({ label: BiText(40), text: BiText(170) })).min(4).max(6),
});
export type SummaryScript = z.infer<typeof ScriptSchema>;

function systemPrompt(scope: SummaryFacts["scope"]) {
  const who =
    scope === "student"
      ? "one student's own learning summary after an English lesson. Speak to the student as \"you\" (Kazakh: сен), warm and encouraging, age-appropriate."
      : "a teacher's class summary after an English lesson. Neutral, professional, useful for planning the next lesson.";
  return `You write the on-screen captions for a short (about 45 seconds) silent summary video: ${who}

Use ONLY the facts in the JSON you receive. Never invent scores, numbers, names, quotes, progress over time, or achievements that are not in the facts.
- A criterion with "percent": null is NOT graded yet: say it will be visible after the teacher grades, never guess a result.
- If scores_released is false, do not describe results as good or bad; talk about the work done and the next step.
- "strongest"/"weakest" may be null: then do not name a strongest/weakest area.
- Any number you write must appear in the facts.
- One lesson does not prove long-term growth: do not claim improvement over time.
- No student names. No emojis.

Return ONE JSON object, no prose:
{"title": {"kk": "...", "en": "..."},
 "slides": [ {"label": {"kk": "...", "en": "..."}, "text": {"kk": "...", "en": "..."}} ]}
Exactly 5 slides in this order: 1) what the lesson / chosen direction was, 2) work completed, 3) what went well, 4) what needs more support, 5) a concrete next step.
label: at most 4 words. text: one or two short sentences, at most 150 characters. "kk" is natural Kazakh (Cyrillic), "en" is simple English.`;
}

/** Throws if the script mentions a number that is not in the facts. */
function checkNumbers(script: SummaryScript, facts: SummaryFacts) {
  const ok = allowedNumbers(facts);
  const all = [script.title.kk, script.title.en, ...script.slides.flatMap((s) => [s.label.kk, s.label.en, s.text.kk, s.text.en])].join(" ");
  for (const m of all.match(/\d+(?:[.,]\d+)?/g) ?? []) {
    if (!ok.has(String(Number(m.replace(",", "."))))) throw new AIError("invalid_output", `Unexpected number ${m}`);
  }
}

export async function generateSummaryScript(facts: SummaryFacts): Promise<SummaryScript> {
  if (!aiConfig()) throw new AIError("not_configured", "AI provider is not configured");
  const text = await callAI(systemPrompt(facts.scope), JSON.stringify({ facts }), 3000);
  const parsed = ScriptSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new AIError("invalid_output", parsed.error.issues[0]?.message ?? "bad script");
  checkNumbers(parsed.data, facts);
  return parsed.data;
}
