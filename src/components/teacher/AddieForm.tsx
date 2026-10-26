"use client";
import { useActionState } from "react";
import { saveAddieAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

const KEYS = ["analyze", "design", "develop", "implement", "evaluate"] as const;

export function AddieForm({ lessonId, values, facts }: { lessonId: string; values: Record<string, string>; facts: string }) {
  const { d, lang } = useLang();
  const [state, action, pending] = useActionState(saveAddieAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="lang" value={lang} />
      {KEYS.map((k, i) => (
        <section key={k} className="card p-4">
          <label htmlFor={k} className="flex items-center gap-3 font-bold">
            <span className="w-9 h-9 rounded-full bg-leaf-700 text-white font-display grid place-items-center">{"ADDIE"[i]}</span>
            {k[0].toUpperCase() + k.slice(1)} — {d.addie.stages[k].name}
          </label>
          <p className="text-xs text-muted mt-1">{d.addie.stages[k].full}</p>
          {k === "evaluate" && facts && <p className="text-sm mt-2 rounded-lg bg-leaf-50 px-3 py-2">{facts}</p>}
          <textarea id={k} name={k} defaultValue={values[k]} rows={k === "analyze" || k === "design" ? 7 : 4} className="input mt-2 text-sm" maxLength={4000} />
        </section>
      ))}
      {state?.ok && <Notice tone="ok">{d.common.saved}</Notice>}
      <button className="btn btn-primary" disabled={pending}>{pending ? d.common.saving : d.teacher.addieSave}</button>
    </form>
  );
}
