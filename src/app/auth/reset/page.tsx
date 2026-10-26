import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { ResetForm } from "./ResetForm";

export default async function ResetPage() {
  const { d } = await getDict();
  return (
    <AuthCard title={d.auth.resetTitle}>
      <ResetForm />
    </AuthCard>
  );
}
