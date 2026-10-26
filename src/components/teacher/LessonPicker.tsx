import Link from "next/link";
import type { Dict } from "@/lib/i18n";

export function LessonPicker({ lessons, current, base, d }: { lessons: { id: string; topic: string; status: string }[]; current?: string; base: string; d: Dict }) {
  if (!lessons.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1" aria-label={d.teacher.chooseLesson}>
      {lessons.map((l) => (
        <Link key={l.id} href={`${base}?lesson=${l.id}`} className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${current === l.id ? "bg-leaf-700 text-white border-leaf-700" : "bg-white border-leaf-200 hover:bg-leaf-50"}`}>
          <span className="font-semibold" lang="en">{l.topic}</span> <span className="opacity-75">· {d.teacher.status[l.status as "published"]}</span>
        </Link>
      ))}
    </div>
  );
}
