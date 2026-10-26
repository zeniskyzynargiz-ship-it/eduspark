import { isInterestKey, LessonContentSchema, TaskSchema, validateLesson, variantTasks, type LessonContent, type Task } from "./lesson";

/**
 * Deterministic clean-up of an AI lesson, so small slips (minutes that do not add up,
 * uneven points, missing translations) are fixed by the site instead of failing the generation.
 * The teacher still reviews and approves the draft.
 */

type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => !!v && typeof v === "object" && !Array.isArray(v);

/** Fills a missing kk/en side from the other one, everywhere in the object. */
function fillBi(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(fillBi);
  if (!isObj(v)) return v;
  const out: J = {};
  for (const [k, x] of Object.entries(v)) out[k] = fillBi(x);
  if ("kk" in out || "en" in out) {
    const kk = typeof out.kk === "string" ? out.kk.trim() : "";
    const en = typeof out.en === "string" ? out.en.trim() : "";
    if (kk || en) {
      out.kk = kk || en;
      out.en = en || kk;
    }
  }
  return out;
}

const BI_KEYS = new Set(["instruction", "hint", "title", "teacher_activity", "student_activity", "evidence", "name", "text", "context", "explanation", "homework", "analyze", "design", "develop", "implement", "evaluate"]);

/** A plain string where a bilingual value is expected becomes {kk, en}. */
function stringsToBi(v: unknown, key = ""): unknown {
  if (Array.isArray(v)) return v.map((x) => (key === "expected_outcomes" || key === "reflection_questions") && typeof x === "string" ? { kk: x, en: x } : stringsToBi(x));
  if (!isObj(v)) return v;
  const out: J = {};
  for (const [k, x] of Object.entries(v)) {
    // "text" of a gap task is a plain English string, not bilingual.
    if (typeof x === "string" && BI_KEYS.has(k) && !(k === "text" && "answers" in v)) out[k] = { kk: x, en: x };
    else out[k] = stringsToBi(x, k);
  }
  return out;
}

function cleanTask(t: unknown, i: number): Task | null {
  if (!isObj(t)) return null;
  const x: J = { ...t };
  x.id = String(x.id ?? `t${i + 1}`).slice(0, 40) || `t${i + 1}`;
  const pts = Math.round(Number(x.points));
  x.points = Number.isFinite(pts) ? Math.min(20, Math.max(1, pts)) : 2;
  if (typeof x.type === "string") x.type = x.type.toLowerCase().trim();
  if (typeof x.prompt !== "string") x.prompt = x.prompt == null ? "" : String(x.prompt);
  if (x.type === "choice" && Array.isArray(x.correct)) x.correct = x.correct.map(Number).filter((n) => Number.isInteger(n));
  if (x.type === "choice" && typeof x.correct === "number") x.correct = [x.correct];
  if (x.type === "gap" && Array.isArray(x.answers)) x.answers = x.answers.map((a) => (Array.isArray(a) ? a.map(String) : [String(a)]));
  const r = TaskSchema.safeParse(x);
  if (r.success) return r.data;
  // A task that is broken beyond repair becomes an open writing task with the same points.
  const instruction = isObj(x.instruction) && typeof x.instruction.kk === "string" ? x.instruction : { kk: "Тапсырманы орында.", en: "Do the task." };
  const fallback = TaskSchema.safeParse({ id: x.id, type: "short", instruction, prompt: String(x.prompt || ""), points: x.points, criterion_id: String(x.criterion_id ?? "c1"), sample_answer: "" });
  return fallback.success ? fallback.data : null;
}

/** Light clean-up of the raw JSON before the schema check. */
export function normalizeRaw(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  let x = stringsToBi(raw) as J;
  x = fillBi(x) as J;
  if (Array.isArray(x.stages))
    x.stages = (x.stages as J[]).map((s) => ({ resources: "", ...s, minutes: Math.max(1, Math.round(Number(s?.minutes) || 1)) }));
  if (Array.isArray(x.criteria))
    x.criteria = (x.criteria as J[]).map((c, i) => ({
      ...c,
      id: String(c?.id ?? `c${i + 1}`),
      descriptors: Array.isArray(c?.descriptors)
        ? (c.descriptors as J[]).map((d) => ({ ...d, points: Math.max(1, Math.round(Number(d?.points) || 1)) }))
        : c?.descriptors,
    }));
  if (Array.isArray(x.variants)) {
    const seen = new Set<string>();
    x.variants = (x.variants as J[])
      .map((v) => {
        const rawKey = String(v?.interest ?? "other").trim();
        let interest = rawKey.startsWith("+") ? rawKey : rawKey.toLowerCase();
        if (!isInterestKey(interest)) interest = "other";
        const tasks = Array.isArray(v?.tasks) ? (v.tasks as unknown[]).map(cleanTask).filter(Boolean).slice(0, 8) : [];
        return { ...v, interest, tasks };
      })
      .filter((v) => (seen.has(v.interest) || !v.tasks.length ? false : (seen.add(v.interest), true)));
  }
  if (Array.isArray(x.common_tasks)) x.common_tasks = (x.common_tasks as unknown[]).map((t, i) => cleanTask(t, 100 + i)).filter(Boolean);
  if (isObj(x.support)) {
    const s = x.support;
    if (!Array.isArray(s.vocabulary)) s.vocabulary = [];
    if (!Array.isArray(s.sentence_frames)) s.sentence_frames = [];
    if (!isObj(s.explanation)) s.explanation = { kk: "—", en: "—" };
  }
  return x;
}

/** Splits `total` into whole numbers proportional to `weights`, each at least `min`. */
export function distribute(total: number, weights: number[], min = 1): number[] {
  const n = weights.length;
  if (!n) return [];
  if (total < n * min) return weights.map(() => min);
  const sum = weights.reduce((a, b) => a + Math.max(b, 0.0001), 0);
  const raw = weights.map((w) => (Math.max(w, 0.0001) / sum) * total);
  const out = raw.map((r) => Math.max(min, Math.floor(r)));
  let diff = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; diff > 0; k++, diff--) out[order[k % n].i] += 1;
  for (let k = 0; diff < 0 && k < n * 50; k++) {
    const i = out.indexOf(Math.max(...out));
    if (out[i] > min) {
      out[i] -= 1;
      diff++;
    }
  }
  return out;
}

/** Fixes the business rules that can be fixed without changing the meaning of the lesson. */
export function fixLesson(input: LessonContent, duration: number): LessonContent {
  const c: LessonContent = structuredClone(input);

  // 1. Stage minutes add up to the lesson duration.
  const mins = distribute(duration, c.stages.map((s) => s.minutes));
  c.stages.forEach((s, i) => (s.minutes = mins[i]));

  // 2. Unique criterion ids; every task points at a real criterion.
  const seenC = new Set<string>();
  c.criteria.forEach((cr, i) => {
    if (seenC.has(cr.id)) cr.id = `${cr.id}_${i + 1}`;
    seenC.add(cr.id);
  });
  const critIds = c.criteria.map((x) => x.id);
  const fixTask = (t: Task) => {
    if (!critIds.includes(t.criterion_id)) t.criterion_id = critIds[0];
    if (t.type === "choice") {
      t.correct = [...new Set(t.correct.filter((i) => i >= 0 && i < t.options.length))];
      if (!t.correct.length) t.correct = [0];
    }
  };
  const gapFix = (t: Task): Task => {
    if (t.type !== "gap") return t;
    const blanks = (t.text.match(/_{3,}/g) ?? []).length;
    if (blanks === t.answers.length) return t;
    if (blanks > 0 && t.answers.length > blanks) return { ...t, answers: t.answers.slice(0, blanks) };
    // Not enough answers for the blanks: keep it as an open task so nothing is graded wrongly.
    const { text, answers, ...rest } = t;
    return { ...rest, type: "short", prompt: [t.prompt, text].filter(Boolean).join("\n"), sample_answer: answers.map((a) => a[0]).join(" / ") } as Task;
  };
  c.common_tasks = c.common_tasks.map(gapFix);
  c.common_tasks.forEach(fixTask);
  for (const v of c.variants) {
    v.tasks = v.tasks.map(gapFix);
    v.tasks.forEach(fixTask);
    // 3. Task ids unique inside a variant (common tasks included).
    const ids = new Set(c.common_tasks.map((t) => t.id));
    v.tasks.forEach((t, i) => {
      if (ids.has(t.id)) t.id = `${t.id}_${i + 1}`;
      ids.add(t.id);
    });
  }

  // 4. Criteria with no tasks at all are removed (if another criterion is left).
  const used = new Set([...c.common_tasks, ...c.variants.flatMap((v) => v.tasks)].map((t) => t.criterion_id));
  if (c.criteria.some((cr) => used.has(cr.id))) c.criteria = c.criteria.filter((cr) => used.has(cr.id));

  // 5. Every variant gives each criterion the same points as the first variant.
  const ref = new Map<string, number>();
  if (c.variants[0]) for (const t of variantTasks(c, c.variants[0])) ref.set(t.criterion_id, (ref.get(t.criterion_id) ?? 0) + t.points);
  for (const v of c.variants.slice(1)) {
    for (const cr of c.criteria) {
      const target = (ref.get(cr.id) ?? 0) - c.common_tasks.filter((t) => t.criterion_id === cr.id).reduce((s, t) => s + t.points, 0);
      const own = v.tasks.filter((t) => t.criterion_id === cr.id);
      if (!own.length || target < own.length) continue;
      const pts = distribute(target, own.map((t) => t.points));
      own.forEach((t, i) => (t.points = Math.min(20, pts[i])));
    }
  }

  // 6. Descriptor points add up to the criterion's task points.
  for (const cr of c.criteria) {
    const total = ref.get(cr.id) ?? 0;
    if (!total) continue;
    if (cr.descriptors.length > total) cr.descriptors = cr.descriptors.slice(0, total);
    const pts = distribute(total, cr.descriptors.map((d) => d.points));
    cr.descriptors.forEach((d, i) => (d.points = pts[i]));
  }
  return c;
}

/** Full pipeline for an AI answer: normalise, schema check, fix, business check. */
export function repairLesson(raw: unknown, duration: number): { ok: true; content: LessonContent } | { ok: false; errors: string[] } {
  const parsed = LessonContentSchema.safeParse(normalizeRaw(raw));
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 15).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const fixed = fixLesson(parsed.data, duration);
  const errors = validateLesson(fixed, duration);
  return errors.length ? { ok: false, errors } : { ok: true, content: fixed };
}
