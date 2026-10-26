"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resendAction } from "../actions";
import { FormMessage } from "@/components/auth/FormMessage";
import { useLang } from "@/lib/i18n/client";

export function ResendForm({ email }: { email: string }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(resendAction, null);
  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="email" value={email} />
      <FormMessage ok={state?.ok} error={state?.error} />
      <button className="btn btn-outline w-full" disabled={pending}>{d.auth.resend}</button>
      <Link href="/auth/login" className="btn btn-primary w-full">{d.auth.loginBtn}</Link>
    </form>
  );
}
