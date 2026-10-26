import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { isTeacherSignedIn } from "@/lib/session-hint";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; msg?: string }> }) {
  const { d } = await getDict();
  const sp = await searchParams;
  if (await isTeacherSignedIn()) redirect("/teacher");
  return (
    <AuthCard title={d.auth.loginTitle}>
      <LoginForm next={sp.next ?? "/teacher"} msg={sp.msg} />
    </AuthCard>
  );
}
