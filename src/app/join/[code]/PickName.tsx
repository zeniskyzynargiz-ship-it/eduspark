"use client";
import { useActionState, useState } from "react";
import { UserRound } from "lucide-react";
import { studentLoginAction } from "../actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

export function PickName({ classCode, students }: { classCode: string; students: { id: string; label: string }[] }) {
  const { d } = useLang();
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [state, action, pending] = useActionState(studentLoginAction, null);
  if (!students.length) return <p className="text-muted">{d.join.noStudents}</p>;
  if (!picked)
    return (
      <div>
        <div className="font-semibold mb-2">{d.join.chooseName}</div>
        <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
          {students.map((s) => (
            <button key={s.id} onClick={() => setPicked(s)} className="rounded-xl border border-leaf-200 bg-white px-3 py-3 text-left font-semibold hover:bg-leaf-50 flex items-center gap-2">
              <UserRound className="w-4 h-4 text-leaf-700 shrink-0" /> <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <div className="rounded-xl bg-leaf-50 px-4 py-3 font-bold text-lg flex items-center gap-2"><UserRound className="w-5 h-5" /> {picked.label}</div>
      {state?.error && <Notice tone="error">{state.error === "tooMany" ? d.common.tooMany : state.error === "wrongCode" ? d.join.wrongCode : d.common.errorGeneric}</Notice>}
      <input type="hidden" name="class_code" value={classCode} />
      <input type="hidden" name="student_id" value={picked.id} />
      <div>
        <label className="label" htmlFor="code">{d.join.personalCode}</label>
        <input id="code" name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="input font-mono text-2xl tracking-[0.4em] text-center" autoFocus />
        <p className="text-xs text-muted mt-1">{d.join.personalCodeHelp}</p>
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.loading : d.join.enter}</button>
      <button type="button" className="btn btn-ghost w-full" onClick={() => setPicked(null)}>{d.join.notYou}</button>
    </form>
  );
}
