"use client";
import { useActionState, useState } from "react";
import { Pencil, Save, Trash2, Plus } from "lucide-react";
import { saveLessonContentAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";
import type { LessonContent } from "@/lib/lesson";

type J = unknown;
// Labels for the nested editor, set from the current language when the editor renders.
let labels = { del: "Delete", confirm: "Delete this item?", add: "Add" };
const DELETE_LABEL = () => labels.del;
const ADD_LABEL = () => labels.add;

/** Copy of the last item with a new unique id, as a starting point for a new task, stage, etc. */
function cloneItem(item: J, all: J[]): J {
  const copy = structuredClone(item) as Record<string, J>;
  if (copy && typeof copy === "object" && "id" in copy) {
    const ids = new Set(all.map((x) => (x as Record<string, J>)?.id));
    let n = all.length + 1;
    const base = String(copy.id).replace(/_\d+$/, "");
    while (ids.has(`${base}_${n}`)) n++;
    copy.id = `${base}_${n}`;
  }
  return copy;
}
const DELETE_CONFIRM = () => labels.confirm;
const LOCKED = new Set(["type", "id", "criterion_id", "interest"]);

/** Simple form editor over the lesson content. Structure (ids, types) stays fixed; texts, points and minutes can change. */
export function LessonEditor({ lessonId, content }: { lessonId: string; content: LessonContent }) {
  const { d } = useLang();
  labels = { del: d.common.delete, confirm: d.teacher.deleteConfirm, add: d.teacher.addItem };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<J>(content);
  const [state, action, pending] = useActionState(saveLessonContentAction, null);

  if (!open)
    return (
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        <Pencil className="w-4 h-4" /> {d.teacher.editJson}
      </button>
    );
  return (
    <form action={action} className="card p-5 space-y-3">
      <p className="text-sm text-muted">{d.teacher.editHelp}</p>
      {state?.ok && <Notice tone="ok">{d.common.saved}</Notice>}
      {state?.error && (
        <Notice tone="error">
          {state.error === "regenBlocked" ? d.teacher.regenBlocked : d.teacher.validationFailed}
          {state.detail && <ul className="list-disc pl-5 mt-1">{state.detail.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </Notice>
      )}
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="content" value={JSON.stringify(draft)} />
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <Field value={draft} onChange={setDraft} path="" />
      </div>
      <div className="flex gap-2 sticky bottom-0 bg-white pt-2">
        <button className="btn btn-primary" disabled={pending}><Save className="w-4 h-4" /> {pending ? d.common.saving : d.common.save}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setDraft(content); setOpen(false); }}>{d.common.cancel}</button>
      </div>
    </form>
  );
}

function label(k: string) {
  if (k === "kk") return "ҚАЗ";
  if (k === "en") return "ENG";
  return k.replace(/_/g, " ");
}

function Field({ value, onChange, path, name }: { value: J; onChange: (v: J) => void; path: string; name?: string }) {
  if (typeof value === "string") {
    const long = value.length > 60 || /prompt|text|activity|explanation|context|sample/.test(path);
    return long ? (
      <textarea className="input text-sm" rows={Math.min(6, Math.ceil(value.length / 70) + 1)} value={value} onChange={(e) => onChange(e.target.value)} aria-label={name ?? path} />
    ) : (
      <input className="input text-sm !min-h-9 !py-1.5" value={value} onChange={(e) => onChange(e.target.value)} aria-label={name ?? path} />
    );
  }
  if (typeof value === "number") {
    return <input type="number" className="input text-sm !min-h-9 !py-1.5 max-w-28" value={value} min={0} onChange={(e) => onChange(Number(e.target.value))} aria-label={name ?? path} />;
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className={typeof item === "object" ? "rounded-xl border border-leaf-100 p-3" : ""}>
            {typeof item === "object" && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-muted">#{i + 1}</span>
                {value.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-danger inline-flex items-center gap-1 hover:underline"
                    onClick={() => confirm(DELETE_CONFIRM()) && onChange(value.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {DELETE_LABEL()}
                  </button>
                )}
              </div>
            )}
            <Field value={item} path={`${path}.${i}`} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
        {value.length > 0 && typeof value[value.length - 1] === "object" && value.length < 12 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...value, cloneItem(value[value.length - 1], value)])}>
            <Plus className="w-4 h-4" /> {ADD_LABEL()}
          </button>
        )}
      </div>
    );
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, J>;
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className={typeof v === "object" && v && !isBi(v) ? "pt-1" : "grid sm:grid-cols-[140px_1fr] gap-x-3 gap-y-1 items-start"}>
            <div className="text-xs font-bold uppercase tracking-wide text-leaf-800 pt-2">{label(k)}</div>
            {LOCKED.has(k) ? (
              <div className="text-sm pt-2 font-mono">{String(v)}</div>
            ) : (
              <Field value={v} name={k} path={`${path}.${k}`} onChange={(nv) => onChange({ ...obj, [k]: nv })} />
            )}
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-muted">—</span>;
}

function isBi(v: J) {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).every((k) => k === "kk" || k === "en");
}
