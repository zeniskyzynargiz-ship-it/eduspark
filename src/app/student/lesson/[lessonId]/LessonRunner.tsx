"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, CloudOff, Check, Loader2, Send, Timer, Target, Sparkles, AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { fmt, pick } from "@/lib/i18n";
import { TaskInput, type PublicTask } from "@/components/student/TaskInput";
import type { Task, Criterion } from "@/lib/lesson";
import { saveReflectionAction } from "../../actions";
import { Notice } from "@/components/Shared";

export type RunnerResponse = { answer: unknown; voiceUrl: string | null; score: number | null; comment: string | null };
type Bi = { kk: string; en: string };
type SaveState = "saved" | "saving" | "failed" | "dirty";

type Props = {
  lessonId: string;
  assignmentId: string;
  topic: string;
  objective: string;
  lessonStatus: string;
  initialStatus: string;
  released: boolean;
  context: Bi;
  criteria: Criterion[];
  support: { vocabulary: { en: string; kk: string }[]; sentence_frames: string[]; explanation: Bi };
  reflectionQuestions: Bi[];
  homework: Bi;
  tasks: (PublicTask & Partial<Task>)[];
  responses: Record<string, RunnerResponse>;
  reflection: { interest: number | null; confidence: number | null; learned: string; difficult: string } | null;
};

export function LessonRunner(p: Props) {
  const { d, lang } = useLang();
  const pendingKey = `es_pending_${p.assignmentId}`;
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => Object.fromEntries(Object.entries(p.responses).map(([k, v]) => [k, v.answer])));
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [status, setStatus] = useState(p.initialStatus);
  const [help, setHelp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState<{ left: number; title: Bi } | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const locked = status === "submitted" || status === "graded" || p.lessonStatus !== "published";

  // Answers not yet confirmed by the server are kept on the device, so nothing is lost offline.
  const readPending = useCallback((): Record<string, unknown> => {
    try {
      return JSON.parse(localStorage.getItem(pendingKey) ?? "{}");
    } catch {
      return {};
    }
  }, [pendingKey]);
  const writePending = useCallback(
    (m: Record<string, unknown>) => {
      try {
        localStorage.setItem(pendingKey, JSON.stringify(m));
      } catch {}
    },
    [pendingKey],
  );

  const save = useCallback(
    async (taskId: string, answer: unknown) => {
      setSaveState((s) => ({ ...s, [taskId]: "saving" }));
      try {
        const res = await fetch("/api/student/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assignmentId: p.assignmentId, taskId, answer }),
        });
        if (res.status === 409) {
          setStatus("submitted");
          throw new Error("locked");
        }
        if (!res.ok) throw new Error(String(res.status));
        const pend = readPending();
        if (JSON.stringify(pend[taskId]) === JSON.stringify(answer)) {
          delete pend[taskId];
          writePending(pend);
        }
        setSaveState((s) => ({ ...s, [taskId]: "saved" }));
        return true;
      } catch {
        setSaveState((s) => ({ ...s, [taskId]: "failed" }));
        return false;
      }
    },
    [p.assignmentId, readPending, writePending],
  );

  const flush = useCallback(async () => {
    const pend = readPending();
    const results = await Promise.all(Object.entries(pend).map(([k, v]) => save(k, v)));
    return results.every(Boolean);
  }, [readPending, save]);

  // Restore unsent answers from this device after a reload, then try to send them.
  useEffect(() => {
    if (locked) return;
    const pend = readPending();
    if (Object.keys(pend).length) {
      setAnswers((a) => ({ ...a, ...pend }));
      setSaveState((s) => ({ ...s, ...Object.fromEntries(Object.keys(pend).map((k) => [k, "failed" as SaveState])) }));
      flush();
    }
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(taskId: string, v: unknown) {
    setAnswers((a) => ({ ...a, [taskId]: v }));
    setSaveState((s) => ({ ...s, [taskId]: "dirty" }));
    writePending({ ...readPending(), [taskId]: v });
    clearTimeout(timers.current[taskId]);
    timers.current[taskId] = setTimeout(() => save(taskId, v), 900);
  }

  async function uploadVoice(taskId: string, blob: Blob, mime: string) {
    setSaveState((s) => ({ ...s, [taskId]: "saving" }));
    const fd = new FormData();
    fd.set("assignmentId", p.assignmentId);
    fd.set("taskId", taskId);
    fd.set("file", new File([blob], `voice.${mime.split("/")[1]}`, { type: mime }));
    const res = await fetch("/api/student/voice", { method: "POST", body: fd }).catch(() => null);
    if (res?.ok) {
      setAnswers((a) => ({ ...a, [taskId]: { uploaded: true } }));
      setSaveState((s) => ({ ...s, [taskId]: "saved" }));
    } else setSaveState((s) => ({ ...s, [taskId]: "failed" }));
  }

  async function submit() {
    if (!window.confirm(d.student.submitConfirm)) return;
    setSubmitting(true);
    setSubmitError(null);
    Object.values(timers.current).forEach(clearTimeout);
    const ok = await flush();
    if (!ok) {
      setSubmitError(d.common.errorNetwork);
      setSubmitting(false);
      return;
    }
    const res = await fetch("/api/student/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assignmentId: p.assignmentId }) }).catch(() => null);
    setSubmitting(false);
    if (res?.ok) setStatus("submitted");
    else setSubmitError(d.common.errorNetwork);
  }

  // Stage timer: a guide only. Running out never locks or deletes work.
  useEffect(() => {
    if (p.lessonStatus !== "published") return;
    let stop = false;
    let base: { endsAt: number; title: Bi; skew: number } | null = null;
    const poll = async () => {
      const r = await fetch(`/api/student/state?assignment=${p.assignmentId}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (!r || stop) return;
      if (r.stage?.startedAt) {
        base = { endsAt: new Date(r.stage.startedAt).getTime() + r.stage.minutes * 60_000, title: r.stage.title, skew: Date.now() - new Date(r.now).getTime() };
      } else base = null;
    };
    poll();
    const pollT = setInterval(poll, 30_000);
    const tick = setInterval(() => {
      if (!base) return setTimer(null);
      setTimer({ left: Math.round((base.endsAt - (Date.now() - base.skew)) / 1000), title: base.title });
    }, 1000);
    return () => {
      stop = true;
      clearInterval(pollT);
      clearInterval(tick);
    };
  }, [p.assignmentId, p.lessonStatus]);

  const failed = Object.values(saveState).some((s) => s === "failed");
  const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold" lang="en">{p.topic}</h1>
        <p className="text-sm text-muted">{pick(p.context, lang)}</p>
      </div>

      <section className="card p-4 space-y-2">
        <p className="flex gap-2"><Target className="w-5 h-5 text-leaf-700 shrink-0" /><span><b>{d.student.goal}:</b> {p.objective}</span></p>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-leaf-700">{d.student.criteria}</summary>
          <ul className="mt-2 text-sm space-y-1">
            {p.criteria.map((c) => (
              <li key={c.id}><b>{pick(c.name, lang)}:</b> {c.descriptors.map((x) => `${pick(x.text, lang)} (${x.points})`).join("; ")}</li>
            ))}
          </ul>
        </details>
      </section>

      {timer && !locked && (
        <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 ${timer.left > 0 ? "bg-leaf-50 text-leaf-800" : "bg-amber-50 text-amber-900"}`} role="timer">
          <Timer className="w-4 h-4" /> {pick(timer.title, lang)} · {timer.left > 0 ? fmt(d.student.timeLeft, { t: mmss(timer.left) }) : d.student.timeOver}
        </div>
      )}

      {failed && (
        <div className="sticky top-16 z-20 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-center gap-2">
          <CloudOff className="w-5 h-5 shrink-0" />
          <span className="flex-1">{d.student.notSaved}</span>
          <button className="btn btn-outline btn-sm" onClick={() => flush()}>{d.student.resend}</button>
        </div>
      )}

      {(status === "submitted" || status === "graded") && <Notice tone="ok">{d.student.submittedMsg}</Notice>}
      {locked && !p.released && <Notice>{d.student.feedbackWait}</Notice>}

      {p.tasks.map((t, i) => (
        <section key={t.id} className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-leaf-700">{fmt(d.student.task, { n: i + 1 })} · {t.points} {d.common.points}</span>
            {!locked && t.type !== "pair" && <SaveBadge state={saveState[t.id]} />}
          </div>
          {p.released ? (
            <FeedbackView task={t as unknown as Task} r={p.responses[t.id]} />
          ) : (
            <TaskInput task={t} value={answers[t.id]} onChange={(v) => change(t.id, v)} disabled={locked} onVoice={(b, m) => uploadVoice(t.id, b, m)} voiceUrl={p.responses[t.id]?.voiceUrl} />
          )}
          {help && t.hint && !p.released && <p className="mt-3 text-sm rounded-lg bg-sky-50 text-sky-900 px-3 py-2">💡 <b>{d.student.hint}:</b> {pick(t.hint, lang)}</p>}
        </section>
      ))}

      {help && !p.released && (
        <section className="card p-5 space-y-3" aria-live="polite">
          <h2 className="font-bold flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-leaf-700" /> {d.student.help}</h2>
          {p.support.vocabulary.length > 0 && (
            <div>
              <div className="text-sm font-semibold">{d.student.wordList}</div>
              <ul className="grid grid-cols-2 gap-1 text-sm mt-1">{p.support.vocabulary.map((v, i) => <li key={i}><b lang="en">{v.en}</b> — {v.kk}</li>)}</ul>
            </div>
          )}
          {p.support.sentence_frames.length > 0 && (
            <div>
              <div className="text-sm font-semibold">{d.student.frames}</div>
              <ul className="list-disc pl-5 text-sm mt-1" lang="en">{p.support.sentence_frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}
          <p className="text-sm">{pick(p.support.explanation, lang)}</p>
        </section>
      )}

      {submitError && <Notice tone="error">{submitError}</Notice>}

      {(status === "submitted" || status === "graded" || p.lessonStatus === "completed") && (
        <ReflectionForm assignmentId={p.assignmentId} initial={p.reflection} />
      )}

      {(status === "submitted" || status === "graded") && (
        <section className="card p-4 text-sm">
          <b>{d.teacher.homework}:</b> {pick(p.homework, lang)}
        </section>
      )}

      <Link href={`/student/summary/${p.lessonId}`} className="btn btn-ghost w-full">
        <Sparkles className="w-4 h-4" /> {d.student.summaryBtn}
      </Link>

      {!locked && !p.released && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-leaf-100 no-print">
          <div className="mx-auto max-w-3xl px-4 py-3 flex gap-2">
            <button className="btn btn-outline flex-1" onClick={() => setHelp((h) => !h)} aria-pressed={help}>
              <LifeBuoy className="w-5 h-5" /> {help ? d.student.hideHelp : d.student.help}
            </button>
            <button className="btn btn-primary flex-[1.4]" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {d.student.submitAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveBadge({ state }: { state?: SaveState }) {
  const { d } = useLang();
  if (!state) return null;
  if (state === "saving" || state === "dirty") return <span className="text-xs text-muted flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {d.student.saving}</span>;
  if (state === "failed") return <span className="text-xs text-warn flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {d.student.saveFailed}</span>;
  return <span className="text-xs text-leaf-700 flex items-center gap-1"><Check className="w-3 h-3" /> {d.student.autosaved}</span>;
}

function FeedbackView({ task, r }: { task: Task; r?: RunnerResponse }) {
  const { d, lang } = useLang();
  const a = r?.answer;
  let mine: string = d.teacher.noAnswer;
  let key = "";
  if (task.type === "choice") {
    const picked = Array.isArray(a) ? (a as number[]) : [];
    if (picked.length) mine = picked.map((i) => task.options[i]).join(", ");
    key = task.correct.map((i) => task.options[i]).join(", ");
  } else if (task.type === "match") {
    const g = Array.isArray(a) ? (a as string[]) : [];
    if (g.some(Boolean)) mine = task.pairs.map((p, i) => `${p.left} → ${g[i] ?? "—"}`).join("; ");
    key = task.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  } else if (task.type === "gap") {
    const g = Array.isArray(a) ? (a as string[]) : [];
    if (g.some(Boolean)) mine = g.join(" / ");
    key = task.answers.map((x) => x[0]).join(" / ");
  } else if (task.type === "short") {
    if (typeof a === "string" && a) mine = a;
  } else if (task.type === "voice") {
    if (a) mine = d.student.recorded;
  } else mine = "";
  return (
    <div className="space-y-2">
      <p className="font-semibold">{pick(task.instruction, lang)}</p>
      {task.prompt && <p className="text-sm whitespace-pre-line text-ink/80" lang="en">{task.prompt}</p>}
      {mine && <p className="text-sm"><b>{d.student.yourAnswer}:</b> <span lang="en">{mine}</span></p>}
      {r?.voiceUrl && <audio src={r.voiceUrl} controls className="w-full" />}
      {key && <p className="text-sm text-leaf-700"><b>{d.student.correctAnswer}:</b> <span lang="en">{key}</span></p>}
      <p className="text-sm"><b>{d.student.yourScore}:</b> {r?.score ?? "—"} / {task.points}</p>
      {r?.comment && <p className="text-sm rounded-lg bg-leaf-50 px-3 py-2"><b>{d.student.teacherComment}:</b> {r.comment}</p>}
    </div>
  );
}

function ReflectionForm({ assignmentId, initial }: { assignmentId: string; initial: Props["reflection"] }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(saveReflectionAction, null);
  const Scale = ({ name, label, value }: { name: string; label: string; value: number | null | undefined }) => (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex-1">
            <input type="radio" name={name} value={n} defaultChecked={value === n} className="peer sr-only" />
            <span className="block text-center rounded-xl border border-leaf-200 bg-white py-2.5 font-bold cursor-pointer peer-checked:bg-leaf-700 peer-checked:text-white">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <form action={action} className="card p-5 space-y-3">
      <h2 className="font-bold">{d.student.reflectionTitle}</h2>
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Scale name="interest" label={d.student.refInterest} value={initial?.interest} />
      <Scale name="confidence" label={d.student.refConfidence} value={initial?.confidence} />
      <div>
        <label className="label" htmlFor="learned">{d.student.refLearned}</label>
        <textarea id="learned" name="learned" defaultValue={initial?.learned ?? ""} className="input" rows={2} maxLength={1000} />
      </div>
      <div>
        <label className="label" htmlFor="difficult">{d.student.refDifficult}</label>
        <textarea id="difficult" name="difficult" defaultValue={initial?.difficult ?? ""} className="input" rows={2} maxLength={1000} />
      </div>
      {state?.ok && <Notice tone="ok">{d.student.refSaved}</Notice>}
      {state?.error && <Notice tone="error">{d.common.errorGeneric}</Notice>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.saving : d.common.save}</button>
    </form>
  );
}
