import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { ForgotForm } from "./ForgotForm";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { d } = await getDict();
  const sp = await searchParams;
  return (
    <AuthCard title={d.auth.forgotTitle} sub={d.auth.forgotSub}>
      <ForgotForm msg={sp.msg} />
    </AuthCard>
  );
}
