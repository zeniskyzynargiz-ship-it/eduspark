"use client";
import { useActionState } from "react";
import { updateProfileAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

export function ProfileForm({ name }: { name: string }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="full_name">{d.auth.fullName}</label>
      <input id="full_name" name="full_name" defaultValue={name} className="input" required minLength={3} maxLength={100} />
      {state?.ok && <Notice tone="ok">{d.common.saved}</Notice>}
      {state?.error && <Notice tone="error">{d.auth.nameShort}</Notice>}
      <button className="btn btn-primary btn-sm" disabled={pending}>{d.common.save}</button>
    </form>
  );
}
