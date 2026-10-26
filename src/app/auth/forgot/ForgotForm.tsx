"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction } from "../actions";
import { FormMessage } from "@/components/auth/FormMessage";
import { useLang } from "@/lib/i18n/client";

export function ForgotForm({ msg }: { msg?: string }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(forgotAction, null);
  return (
    <form action={action} className="space-y-4">
      {msg && !state && <FormMessage error={msg} />}
      <FormMessage error={state?.error} ok={state?.ok} />
      <div>
        <label className="label" htmlFor="email">{d.auth.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.loading : d.auth.sendLink}</button>
      <p className="text-sm text-center"><Link href="/auth/login" className="font-semibold text-leaf-700 underline">{d.auth.loginBtn}</Link></p>
    </form>
  );
}
