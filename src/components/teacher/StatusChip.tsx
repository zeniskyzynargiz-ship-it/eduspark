import type { Dict } from "@/lib/i18n";

const CLS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-sky-100 text-sky-800",
  published: "bg-leaf-100 text-leaf-800",
  completed: "bg-violet-100 text-violet-800",
};

export function StatusChip({ status, d }: { status: string; d: Dict }) {
  return <span className={`chip ${CLS[status] ?? ""}`}>{d.teacher.status[status as keyof Dict["teacher"]["status"]] ?? status}</span>;
}
