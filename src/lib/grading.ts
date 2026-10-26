import type { Task } from "./lesson";

const CONTRACTIONS: Record<string, string> = {
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not",
  "wasn't": "was not", "weren't": "were not", "can't": "cannot", "can not": "cannot", "won't": "will not",
  "i'm": "i am", "it's": "it is", "he's": "he is", "she's": "she is", "they're": "they are",
  "we're": "we are", "you're": "you are", "i've": "i have", "haven't": "have not", "hasn't": "has not",
};

/** Ignore case, extra spaces, curly quotes, final punctuation and standard contractions. */
export function normalize(s: string) {
  let x = s
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;:"]+$/g, "")
    .trim();
  for (const [k, v] of Object.entries(CONTRACTIONS)) x = x.replace(new RegExp(`\\b${k}(?=\\s|$)`, "g"), v);
  return x;
}

export function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type AutoResult = { score: number; max: number; flagged: boolean; detail: boolean[] };

const half = (n: number) => Math.round(n * 2) / 2;

/**
 * Grades closed tasks against the key. Open tasks return null (teacher or AI suggestion).
 * A one-letter slip is not auto-accepted, because in grammar tasks one letter can be the
 * whole point (go / goes). It is flagged so the teacher can decide.
 */
export function autoGrade(task: Task, answer: unknown): AutoResult | null {
  if (task.type === "choice") {
    const picked = Array.isArray(answer) ? (answer as number[]) : [];
    const ok = picked.length === task.correct.length && task.correct.every((c) => picked.includes(c));
    return { score: ok ? task.points : 0, max: task.points, flagged: false, detail: [ok] };
  }
  if (task.type === "match") {
    const given = Array.isArray(answer) ? (answer as (string | null)[]) : [];
    const detail = task.pairs.map((p, i) => given[i] === p.right);
    const correct = detail.filter(Boolean).length;
    return { score: half((task.points * correct) / task.pairs.length), max: task.points, flagged: false, detail };
  }
  if (task.type === "gap") {
    const given = Array.isArray(answer) ? (answer as string[]) : [];
    let flagged = false;
    const detail = task.answers.map((accepted, i) => {
      const g = normalize(given[i] ?? "");
      if (!g) return false;
      const keys = accepted.map(normalize);
      if (keys.includes(g)) return true;
      if (keys.some((k) => k.length >= 4 && levenshtein(k, g) === 1)) flagged = true;
      return false;
    });
    const correct = detail.filter(Boolean).length;
    return { score: half((task.points * correct) / task.answers.length), max: task.points, flagged, detail };
  }
  return null;
}

/** Final score for one response: teacher decision wins, then auto score. AI suggestions never count until a teacher confirms them. */
export function finalScore(r: { teacher_score: number | null; auto_score: number | null }) {
  if (r.teacher_score !== null && r.teacher_score !== undefined) return Number(r.teacher_score);
  if (r.auto_score !== null && r.auto_score !== undefined) return Number(r.auto_score);
  return null;
}
