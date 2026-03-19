export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { ReportsShell } from "@/components/reports/ReportsShell";

export default async function ReportsPage() {
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
    <ReportsShell initialCurrency={currency} initialLocale={locale} />
  );
}
