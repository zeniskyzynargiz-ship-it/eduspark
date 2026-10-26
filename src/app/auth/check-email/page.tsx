import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { ResendForm } from "./ResendForm";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { d } = await getDict();
  const email = (await searchParams).email ?? "";
  return (
    <AuthCard title={d.auth.checkEmailTitle}>
      <MailCheck className="w-14 h-14 text-leaf-700" />
      <p className="mt-3">{fmt(d.auth.checkEmailText, { email })}</p>
      {email && <ResendForm email={email} />}
    </AuthCard>
  );
}
