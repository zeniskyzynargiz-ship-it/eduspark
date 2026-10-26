"use client";
import { useActionState, useRef, useEffect } from "react";
import { addStudentsAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";
import { fmt } from "@/lib/i18n";

export function AddStudents({ classId }: { classId: string }) {
  const { d } = useLang();
  const [s1, a1, p1] = useActionState(addStudentsAction, null);
  const [s2, a2, p2] = useActionState(addStudentsAction, null);
  const f1 = useRef<HTMLFormElement>(null);
  const f2 = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s1?.ok) f1.current?.reset(); }, [s1]);
  useEffect(() => { if (s2?.ok) f2.current?.reset(); }, [s2]);
  const msg = (s: typeof s1) =>
    s?.ok ? <Notice tone="ok">{fmt(d.teacher.added, { n: s.message ?? "" })}</Notice> : s?.error ? <Notice tone="error">{s.error === "required" ? d.common.required : d.common.errorGeneric}</Notice> : null;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <form ref={f1} action={a1} className="card p-5 space-y-3">
        <h2 className="font-bold">{d.teacher.addOne}</h2>
        {msg(s1)}
        <input type="hidden" name="class_id" value={classId} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="first_name">{d.teacher.firstName}</label>
            <input id="first_name" name="first_name" required maxLength={40} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="last_name">{d.teacher.lastName}</label>
            <input id="last_name" name="last_name" maxLength={60} className="input" />
          </div>
        </div>
        <button className="btn btn-primary w-full" disabled={p1}>{d.common.add}</button>
      </form>
      <form ref={f2} action={a2} className="card p-5 space-y-3">
        <h2 className="font-bold">{d.teacher.addList}</h2>
        {msg(s2)}
        <input type="hidden" name="class_id" value={classId} />
        <textarea name="list" rows={4} required className="input font-mono text-sm" placeholder={d.teacher.listHelp} aria-label={d.teacher.addList} />
        <button className="btn btn-primary w-full" disabled={p2}>{d.teacher.addListBtn}</button>
      </form>
    </div>
  );
}
