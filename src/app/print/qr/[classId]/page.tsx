import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { PrintShell } from "@/components/PrintShell";
import { QrImage } from "@/components/QrImage";

export default async function PrintQr({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { cls } = await requireClass(classId);
  const { d } = await getDict();
  const url = `${env.siteUrl()}/join/${cls.join_code}`;
  return (
    <PrintShell d={d} title={d.teacher.printQr}>
      <div className="text-center py-6">
        <div className="font-display font-bold text-3xl text-leaf-800">EduSpark</div>
        <h1 className="text-4xl font-bold mt-4">{cls.name}</h1>
        <p className="mt-2">{d.join.title}</p>
        <div className="flex justify-center mt-6"><QrImage value={url} size={360} /></div>
        <p className="mt-6 text-sm">{d.teacher.classCode}</p>
        <p className="font-mono text-5xl font-bold tracking-[0.25em]">{cls.join_code}</p>
        <p className="mt-4 font-mono text-sm break-all">{url}</p>
        <p className="mt-6 text-xs text-gray-600">{d.teacher.qrNote}</p>
      </div>
    </PrintShell>
  );
}
