export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { InvestmentsShell } from "@/components/investments/InvestmentsShell";

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [defaultCurrency, locale] = await Promise.all([
    prisma.userCurrency.findFirst({
      where: { userId: session.user.id, isDefault: true },
    }),
    getLocale(),
  ]);

  const currency = defaultCurrency?.code ?? "BRL";

  return <InvestmentsShell initialCurrency={currency} initialLocale={locale} />;
}
