import Link from "next/link";
import { School, Users, ArrowRight } from "lucide-react";
import { requireTeacher } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { PageTitle, Empty } from "@/components/Shared";
import { NewClassForm } from "@/components/teacher/NewClassForm";

export default async function TeacherHome() {
  const { sb } = await requireTeacher();
  const { d } = await getDict();
  const { data: classes } = await sb.from("classes").select("id, name, grade_level, join_code, students(count)").order("created_at");
  return (
    <>
      <PageTitle title={d.teacher.sections.classes} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div>
          {!classes?.length ? (
            <Empty text={d.teacher.noClasses} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {classes.map((c) => {
                const n = (c.students as unknown as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <Link key={c.id} href={`/teacher/c/${c.id}/students`} className="card p-5 hover:-translate-y-0.5 transition block">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full bg-leaf-100 grid place-items-center"><School className="w-5 h-5 text-leaf-700" /></span>
                      <div className="min-w-0">
                        <div className="font-bold text-lg truncate">{c.name}</div>
                        <div className="text-sm text-muted truncate">{c.grade_level}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {fmt(d.teacher.studentsCount, { n })}</span>
                      <span className="font-mono font-bold tracking-wider">{c.join_code}</span>
                      <ArrowRight className="w-4 h-4 text-leaf-700" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <NewClassForm />
      </div>
    </>
  );
}
