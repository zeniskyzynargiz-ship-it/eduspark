"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Loader2 } from "lucide-react";
import { gradeAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";

type Props = {
  assignmentId: string;
  taskId: string;
  max: number;
  teacherScore: number | null;
  comment: string | null;
  autoScore: number | null;
  aiScore: number | null;
  aiFeedback: { kk?: string; en?: string } | null;
  canAskAi: boolean;
};

/** Teacher's score for one task. AI suggestions are shown separately and only count once accepted. */
export function GradeRow(p: Props) {
  const { d, lang } = useLang();
  const router = useRouter();
  const [state, action, pending] = useActionState(gradeAction, null);
  const [score, setScore] = useState(p.teacherScore === null ? "" : String(p.teacherScore));
  const [asking, setAsking] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  async function askAi() {
    setAsking(true);
    setAiErr(null);
    const res = await fetch("/api/grading/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assignmentId: p.assignmentId, taskId: p.taskId }) }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    setAsking(false);
    if (res?.ok) router.refresh();
    else setAiErr((d.teacher.aiErrors as Record<string, string>)[body?.error] ?? d.common.errorGeneric);
  }

  return (
    <form action={action} className="mt-2 rounded-xl bg-leaf-50/60 p-3 space-y-2">
      <input type="hidden" name="assignment_id" value={p.assignmentId} />
      <input type="hidden" name="task_id" value={p.taskId} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {p.autoScore !== null && <span className="chip !bg-white">{d.teacher.autoScore}: {p.autoScore}/{p.max}</span>}
        {p.aiScore !== null && (
          <span className="chip !bg-sky-100 !text-sky-900"><Bot className="w-3.5 h-3.5" /> {d.teacher.aiSuggest}: {p.aiScore}/{p.max}</span>
        )}
        {p.aiScore !== null && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setScore(String(p.aiScore))}>{d.teacher.accept}</button>
        )}
        {p.canAskAi && p.aiScore === null && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={askAi} disabled={asking}>
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} {d.teacher.askAi}
          </button>
        )}
      </div>
      {p.aiFeedback && (p.aiFeedback[lang] || p.aiFeedback.en) && <p className="text-xs text-sky-900">{p.aiFeedback[lang] || p.aiFeedback.en}</p>}
      {aiErr && <p className="text-xs text-danger">{aiErr}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor={`s-${p.assignmentId}-${p.taskId}`}>{d.teacher.teacherScore}</label>
        <input id={`s-${p.assignmentId}-${p.taskId}`} name="score" inputMode="decimal" className="input !w-20 !min-h-9 !py-1 text-center" value={score} onChange={(e) => setScore(e.target.value)} placeholder="—" />
        <span className="text-sm">/ {p.max}</span>
        <input name="comment" defaultValue={p.comment ?? ""} className="input !min-h-9 !py-1 text-sm flex-1 min-w-40" placeholder={d.teacher.comment} aria-label={d.teacher.comment} maxLength={1000} />
        <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {d.common.save}</button>
      </div>
      {state?.ok && <p className="text-xs text-leaf-700">{d.common.saved}</p>}
      {state?.error && <p className="text-xs text-danger">{state.error === "range" ? `0–${state.message}` : d.common.errorGeneric}</p>}
    </form>
  );
}
