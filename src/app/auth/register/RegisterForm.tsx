"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { registerAction } from "../actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormMessage } from "@/components/auth/FormMessage";
import { useLang } from "@/lib/i18n/client";
import { strongEnough } from "@/lib/password";

export function RegisterForm() {
  const { d } = useLang();
  const [state, action, pending] = useActionState(registerAction, null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const match = p2.length > 0 && p1 === p2;
  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <FormMessage error={state?.error} />
      <div>
        <label className="label" htmlFor="full_name">{d.auth.fullName}</label>
        <input id="full_name" name="full_name" required minLength={3} autoComplete="name" placeholder={d.auth.fullNamePh} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">{d.auth.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" placeholder="name@mail.kz" />
      </div>
      <PasswordField name="password" label={d.auth.password} autoComplete="new-password" value={p1} onChange={setP1} />
      <p className={`text-xs flex items-center gap-1 ${strongEnough(p1) ? "text-leaf-700" : "text-muted"}`}>
        {strongEnough(p1) ? <Check className="w-3.5 h-3.5" /> : null}
        {d.auth.passwordHint}
      </p>
      <PasswordField name="password2" label={d.auth.password2} autoComplete="new-password" value={p2} onChange={setP2} />
      {p2.length > 0 && (
        <p className={`text-xs flex items-center gap-1 ${match ? "text-leaf-700" : "text-danger"}`}>
          {match ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          {match ? "✓" : d.auth.mismatch}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={pending || !match || !strongEnough(p1)}>
        {pending ? d.common.loading : d.auth.registerBtn}
      </button>
      <p className="text-sm text-center">
        {d.auth.haveAccount} <Link href="/auth/login" className="font-semibold text-leaf-700 underline">{d.auth.loginBtn}</Link>
      </p>
    </form>
  );
}
