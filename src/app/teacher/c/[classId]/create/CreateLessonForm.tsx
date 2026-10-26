"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, PenLine } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

type Draft = { topic: string; objective: string; duration: number; source: string; requirements: string };
const empty: Draft = { topic: "", objective: "", duration: 45, source: "", requirements: "" };

export function CreateLessonForm({ classId }: { classId: string }) {
  const { d } = useLang();
  const router = useRouter();
  const storeKey = `es_lesson_draft_${classId}`;
  const [f, setF] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per attempt: double clicks reuse it, so only one paid request runs.
  const key = useRef<string>("");
  useEffect(() => {
    key.current = crypto.randomUUID();
    try {
      const s = localStorage.getItem(storeKey);
      if (s) setF({ ...empty, ...JSON.parse(s) });
    } catch {}
  }, [storeKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(f));
    } catch {}
  }, [f, storeKey]);

  async function submit(e: React.FormEvent, manual = false) {
    e.preventDefault();
    if (busy) return;
    const form = (e.target as HTMLElement).closest("form");
    if (form && !form.reportValidity()) return;
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < 60; i++) {
        const res = await fetch("/api/lessons/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ classId, ...f, idempotencyKey: key.current, manual }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.lessonId) {
          try {
            localStorage.removeItem(storeKey);
          } catch {}
          const notice = manual ? "?notice=manual" : body.fallback ? "?notice=template" : "";
          router.push(`/teacher/c/${classId}/lessons/${body.lessonId}${notice}`);
          return;
        }
        if (res.status === 202) {
          // Same request is still running (e.g. a second tab): wait and ask again with the same key.
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        setError(body.error ?? "provider_error");
        key.current = crypto.randomUUID(); // a new attempt after an error
        break;
      }
    } catch {
      setError("provider_error");
      key.current = crypto.randomUUID();
    } finally {
      setBusy(false);
    }
  }

  const errText = error ? (d.teacher.aiErrors as Record<string, string>)[error] ?? d.common.errorGeneric : null;
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: k === "duration" ? Number(e.target.value) : e.target.value }));

  return (
    <form onSubmit={submit} className="card p-5 space-y-4 max-w-3xl">
      {errText && <Notice tone="error">{errText}</Notice>}
      <div>
        <label className="label" htmlFor="topic">{d.teacher.topic}</label>
        <input id="topic" required minLength={2} maxLength={200} className="input" placeholder={d.teacher.topicPh} value={f.topic} onChange={set("topic")} />
      </div>
      <div>
        <label className="label" htmlFor="objective">{d.teacher.objective}</label>
        <textarea id="objective" required minLength={5} maxLength={1000} rows={3} className="input" placeholder={d.teacher.objectivePh} value={f.objective} onChange={set("objective")} />
      </div>
      <div className="max-w-xs">
        <label className="label" htmlFor="duration">{d.teacher.duration}</label>
        <input id="duration" type="number" min={10} max={180} step={5} required className="input" value={f.duration} onChange={set("duration")} />
      </div>
      <div>
        <label className="label" htmlFor="source">{d.teacher.source} <span className="font-normal text-muted">({d.common.optional})</span></label>
        <textarea id="source" maxLength={6000} rows={4} className="input" placeholder={d.teacher.sourcePh} value={f.source} onChange={set("source")} />
      </div>
      <div>
        <label className="label" htmlFor="requirements">{d.teacher.requirements} <span className="font-normal text-muted">({d.common.optional})</span></label>
        <textarea id="requirements" maxLength={2000} rows={2} className="input" placeholder={d.teacher.requirementsPh} value={f.requirements} onChange={set("requirements")} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} {busy ? d.common.loading : d.teacher.generate}
        </button>
        <button type="button" className="btn btn-outline w-full sm:w-auto" disabled={busy} onClick={(e) => submit(e, true)}>
          <PenLine className="w-5 h-5" /> {d.teacher.createManual}
        </button>
      </div>
      <p className="text-xs text-muted">{d.teacher.createManualHint}</p>
      {busy && <p className="text-sm text-muted" aria-live="polite">{d.teacher.generating}</p>}
    </form>
  );
}
