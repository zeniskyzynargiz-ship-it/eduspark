import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getDict } from "@/lib/i18n/server";
import { requireStudent } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentShell } from "@/components/student/StudentShell";
import { BASELINE_TASKS } from "@/lib/baseline";
import { publicTask } from "@/lib/lesson";
import type { PublicTask } from "@/components/student/TaskInput";
import { BaselineForm } from "./BaselineForm";

export default async function BaselinePage() {
  const st = await requireStudent();
  const { d } = await getDict();
  const { data: done } = await supabaseAdmin().from("baseline_attempts").select("id").eq("student_id", st.id).maybeSingle();
  return (
    <StudentShell st={st} d={d}>
      <h1 className="text-2xl font-bold">{d.student.baselineTitle}</h1>
      <p className="text-sm text-muted mt-1">{d.student.baselineIntro}</p>
      {done ? (
        <div className="card p-6 mt-5 text-center">
          <CheckCircle2 className="w-12 h-12 text-leaf-600 mx-auto" />
          <p className="mt-2">{d.student.baselineAlready}</p>
          <Link href="/student" className="btn btn-primary mt-4">{d.common.back}</Link>
        </div>
      ) : (
        <BaselineForm tasks={BASELINE_TASKS.map((t) => publicTask(t, { revealKey: false }) as unknown as PublicTask)} />
      )}
    </StudentShell>
  );
}
