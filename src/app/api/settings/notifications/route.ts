import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notifTransactions, notifBudgetAlerts, notifMonthlyReport } = await req.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(typeof notifTransactions === "boolean" && { notifTransactions }),
      ...(typeof notifBudgetAlerts === "boolean" && { notifBudgetAlerts }),
      ...(typeof notifMonthlyReport === "boolean" && { notifMonthlyReport }),
    },
  });

  return NextResponse.json({ ok: true });
}
