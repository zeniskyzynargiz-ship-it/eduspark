"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, resendAction } from "../actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormMessage } from "@/components/auth/FormMessage";
import { useLang } from "@/lib/i18n/client";

export function LoginForm({ next, msg }: { next: string; msg?: string }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(loginAction, null);
  const [rs, resend, resending] = useActionState(resendAction, null);
  return (
    <div className="space-y-4">
      {msg && !state && <FormMessage ok={msg} />}
      <form action={action} className="space-y-4">
        <FormMessage error={state?.error} />
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">{d.auth.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" defaultValue={state?.email} />
        </div>
        <PasswordField name="password" label={d.auth.password} autoComplete="current-password" />
        <div className="text-right">
          <Link href="/auth/forgot" className="text-sm font-semibold text-leaf-700 underline">{d.auth.forgot}</Link>
        </div>
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.loading : d.auth.loginBtn}</button>
      </form>
      {state?.error === "notConfirmed" && state.email && (
        <form action={resend} className="space-y-2">
          <input type="hidden" name="email" value={state.email} />
          <FormMessage ok={rs?.ok} error={rs?.error} />
          <button className="btn btn-outline w-full" disabled={resending}>{d.auth.resend}</button>
        </form>
      )}
      <p className="text-sm text-center">
        {d.auth.noAccount} <Link href="/auth/register" className="font-semibold text-leaf-700 underline">{d.auth.registerBtn}</Link>
      </p>
      <p className="text-sm text-center">
        <Link href="/join" className="text-muted underline">{d.auth.studentLink}</Link>
      </p>
    </div>
  );
}
