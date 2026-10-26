"use client";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createClassAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

export function NewClassForm() {
  const { d } = useLang();
  const [state, action, pending] = useActionState(createClassAction, null);
  return (
    <form action={action} className="card p-5 space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5" /> {d.teacher.newClass}</h2>
      {state?.error && <Notice tone="error">{state.error === "required" ? d.common.required : d.common.errorGeneric}</Notice>}
      <div>
        <label className="label" htmlFor="name">{d.teacher.className}</label>
        <input id="name" name="name" required maxLength={60} className="input" placeholder={d.teacher.classNamePh} />
      </div>
      <div>
        <label className="label" htmlFor="grade">{d.teacher.grade}</label>
        <input id="grade" name="grade" maxLength={60} className="input" placeholder={d.teacher.gradePh} />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.loading : d.teacher.createClass}</button>
    </form>
  );
}
