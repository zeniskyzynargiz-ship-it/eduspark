"use client";
import { useActionState } from "react";
import { goToClassAction } from "./actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

export function ClassCodeForm() {
  const { d } = useLang();
  const [state, action, pending] = useActionState(goToClassAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{state.error === "tooMany" ? d.common.tooMany : d.join.badCode}</Notice>}
      <div>
        <label className="label" htmlFor="code">{d.join.codeLabel}</label>
        <input id="code" name="code" required maxLength={6} autoCapitalize="characters" autoComplete="off" className="input font-mono text-2xl tracking-[0.3em] uppercase text-center" placeholder="K7M2QX" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.loading : d.join.go}</button>
    </form>
  );
}
