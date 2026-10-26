import { PublicShell } from "@/components/PublicShell";
import { getDict } from "@/lib/i18n/server";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata = { title: "EduSpark" };

export default async function AboutPage() {
  const { d } = await getDict();
  return (
    <PublicShell>
      <AboutContent d={d} />
    </PublicShell>
  );
}
