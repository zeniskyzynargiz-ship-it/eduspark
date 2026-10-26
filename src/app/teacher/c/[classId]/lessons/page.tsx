import Link from "next/link";
import { Plus } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { PageTitle, Empty } from "@/components/Shared";
import { StatusChip } from "@/components/teacher/StatusChip";

export default async function LessonsPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d, lang } = await getDict();
  const { data: lessons } = await sb.from("lessons").select("id, topic, objective, status, duration_min, is_demo, created_at").eq("class_id", classId).order("created_at", { ascending: false });
  return (
    <>
      <PageTitle
        title={`${d.teacher.sections.lessons} · ${cls.name}`}
        actions={<Link href={`/teacher/c/${classId}/create`} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> {d.teacher.sections.create}</Link>}
      />
      {!lessons?.length ? (
        <Empty text={d.teacher.noLessons} />
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <Link key={l.id} href={`/teacher/c/${classId}/lessons/${l.id}`} className="card p-4 flex flex-wrap items-center gap-3 hover:bg-leaf-50">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate" lang="en">{l.topic}</div>
                <div className="text-sm text-muted line-clamp-1">{l.objective}</div>
              </div>
              {l.is_demo && <span className="chip !bg-amber-100 !text-amber-900">{d.common.demo}</span>}
              <span className="text-sm text-muted">{l.duration_min} {d.common.min} · {new Date(l.created_at).toLocaleDateString(lang === "kk" ? "kk-KZ" : "en-GB")}</span>
              <StatusChip status={l.status} d={d} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
