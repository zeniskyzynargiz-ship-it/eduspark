import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { Logo } from "@/components/Logo";

export default async function NotFound() {
  const { d } = await getDict();
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <Logo />
        <h1 className="text-3xl font-bold mt-6">{d.common.notFound}</h1>
        <p className="text-muted mt-2">{d.common.notFoundText}</p>
        <Link href="/" className="btn btn-primary mt-6">{d.common.toHome}</Link>
      </div>
    </main>
  );
}
