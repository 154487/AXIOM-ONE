export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { FireDashboard } from "@/components/patrimonio/FireDashboard";

export default async function IndependenciaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [defaultCurrency, locale] = await Promise.all([
    prisma.userCurrency.findFirst({
      where: { userId: session.user.id, isDefault: true },
    }),
    getLocale(),
  ]);

  const currency = defaultCurrency?.code ?? "BRL";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Independência Financeira</h1>
        <p className="text-sm text-axiom-muted mt-0.5">
          Plano FIRE: projeção, custo de vida real e caminho para a liberdade financeira
        </p>
      </div>
      <FireDashboard currency={currency} locale={locale} />
    </div>
  );
}
