"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { resetAction } from "../actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormMessage } from "@/components/auth/FormMessage";
import { useLang } from "@/lib/i18n/client";

export function ResetForm() {
  const { d } = useLang();
  const [state, action, pending] = useActionState(resetAction, null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  if (state?.ok)
    return (
      <div className="space-y-4">
        <FormMessage ok={state.ok} />
        <Link href="/teacher" className="btn btn-primary w-full">{d.nav.cabinet}</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <PasswordField name="password" label={d.auth.password} autoComplete="new-password" value={p1} onChange={setP1} />
      <p className="text-xs text-muted">{d.auth.passwordHint}</p>
      <PasswordField name="password2" label={d.auth.password2} autoComplete="new-password" value={p2} onChange={setP2} />
      {p2 && p1 !== p2 && <p className="text-xs text-danger">{d.auth.mismatch}</p>}
      <button className="btn btn-primary w-full" disabled={pending || !p1 || p1 !== p2}>{d.auth.resetBtn}</button>
    </form>
  );
}
