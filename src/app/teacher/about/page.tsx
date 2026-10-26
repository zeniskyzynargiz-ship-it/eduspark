import { requireTeacher } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { AboutContent } from "@/components/about/AboutContent";

export default async function TeacherAboutPage() {
  await requireTeacher();
  const { d } = await getDict();
  return <AboutContent d={d} />;
}
