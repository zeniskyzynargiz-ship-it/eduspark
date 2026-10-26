"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";
import { interestLabel } from "@/lib/survey";

const PARTS = ["variants", "stages", "criteria", "common_tasks", "support", "reflection_questions", "homework"] as const;

export function RegenPanel({ lessonId, interests }: { lessonId: string; interests: string[] }) {
  const { d } = useLang();
  const router = useRouter();
  const [part, setPart] = useState<(typeof PARTS)[number]>("variants");
  const [interest, setInterest] = useState(interests[0] ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef("");
  const labels: Record<string, string> = {
    variants: d.teacher.variants, stages: d.teacher.plan, criteria: d.teacher.criteria, common_tasks: d.teacher.commonTasks,
    support: d.teacher.support, reflection_questions: d.teacher.reflection, homework: d.teacher.homework,
  };

  async function run() {
    if (busy) return;
    if (!key.current) key.current = crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lessons/regenerate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, part, interest: part === "variants" ? interest : undefined, note, idempotencyKey: key.current }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && !body.error) {
        key.current = "";
        setNote("");
        router.refresh();
      } else {
        setError(body.error ?? "provider_error");
        if (res.status !== 202) key.current = "";
      }
    } catch {
      setError("provider_error");
      key.current = "";
    } finally {
      setBusy(false);
    }
  }

  const errText = error ? (error === "regenBlocked" ? d.teacher.regenBlocked : (d.teacher.aiErrors as Record<string, string>)[error] ?? d.common.errorGeneric) : null;
  return (
    <div className="card p-4 space-y-3">
      <div className="font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> {d.teacher.regenerate}</div>
      {errText && <Notice tone="error">{errText}</Notice>}
      <div className="grid sm:grid-cols-2 gap-2">
        <select className="input text-sm" value={part} onChange={(e) => setPart(e.target.value as typeof part)} aria-label={d.teacher.regenerate}>
          {PARTS.map((p) => <option key={p} value={p}>{labels[p]}</option>)}
        </select>
        {part === "variants" && (
          <select className="input text-sm" value={interest} onChange={(e) => setInterest(e.target.value)} aria-label={d.teacher.variants}>
            {interests.map((i) => <option key={i} value={i}>{interestLabel(d, i)}</option>)}
          </select>
        )}
      </div>
      <input className="input text-sm" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder={d.teacher.regenNote} aria-label={d.teacher.regenNote} />
      <button className="btn btn-outline btn-sm" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {busy ? d.common.loading : d.teacher.regenerate}
      </button>
    </div>
  );
}
