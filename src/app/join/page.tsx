import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { ClassCodeForm } from "./ClassCodeForm";

export default async function JoinPage() {
  const { d } = await getDict();
  return (
    <AuthCard title={d.join.title} sub={d.join.codeHelp}>
      <ClassCodeForm />
    </AuthCard>
  );
}
