"use client";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { publishLessonAction } from "@/app/teacher/actions";
import { useLang } from "@/lib/i18n/client";
import { Notice } from "@/components/Shared";

export function PublishButton({ lessonId }: { lessonId: string }) {
  const { d } = useLang();
  const [state, action, pending] = useActionState(publishLessonAction, null);
  return (
    <form action={action} className="inline-flex flex-col gap-2">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <button
        className="btn btn-primary btn-sm"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(d.teacher.publishConfirm)) e.preventDefault();
        }}
      >
        <Send className="w-4 h-4" /> {pending ? d.common.loading : d.teacher.publish}
      </button>
      {state?.error && <Notice tone="error">{state.error === "approveFirst" ? d.teacher.approveFirst : d.common.errorGeneric}</Notice>}
    </form>
  );
}
