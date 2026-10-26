import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const { d } = await getDict();
  return (
    <AuthCard title={d.auth.registerTitle} sub={d.auth.registerSub}>
      <RegisterForm />
    </AuthCard>
  );
}
