import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { PrintShell } from "@/components/PrintShell";

/** Cut-out cards: each student gets their own personal code. The QR poster never contains these codes. */
export default async function PrintCards({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d } = await getDict();
  const { data: students } = await sb.from("students").select("id, first_name, last_name, personal_code").eq("class_id", classId).order("first_name");
  const url = `${env.siteUrl()}/join/${cls.join_code}`;
  return (
    <PrintShell d={d} title={d.teacher.printCards}>
      <div className="grid grid-cols-2 gap-3">
        {(students ?? []).map((s) => (
          <div key={s.id} className="avoid-break border-2 border-dashed border-gray-400 rounded-lg p-3">
            <div className="font-display font-bold text-leaf-800 text-sm">EduSpark · {cls.name}</div>
            <div className="text-lg font-bold mt-1">{s.first_name} {s.last_name}</div>
            <div className="text-xs mt-2">{d.teacher.classCode}: <b className="font-mono text-base">{cls.join_code}</b></div>
            <div className="text-xs">{d.join.personalCode}: <b className="font-mono text-xl tracking-widest">{s.personal_code}</b></div>
            <div className="text-[9pt] font-mono mt-1 break-all text-gray-600">{url}</div>
          </div>
        ))}
      </div>
    </PrintShell>
  );
}
