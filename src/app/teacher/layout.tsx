import { requireTeacher } from "@/lib/teacher";
import { TeacherShell } from "@/components/teacher/TeacherShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await requireTeacher();
  const [{ data: teacher }, { data: classes }] = await Promise.all([
    sb.from("teachers").select("full_name").eq("id", user.id).maybeSingle(),
    sb.from("classes").select("id, name").order("created_at"),
  ]);
  return (
    <TeacherShell name={teacher?.full_name || user.email || ""} classes={classes ?? []}>
      {children}
    </TeacherShell>
  );
}
