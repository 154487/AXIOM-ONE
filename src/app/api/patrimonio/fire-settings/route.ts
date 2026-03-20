import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface FireSettingsResponse {
  monthlyExpense: number | null;
  swr: number | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fireMonthlyExpense: true, fireSWR: true },
  });

  return NextResponse.json({
    monthlyExpense: user?.fireMonthlyExpense ? parseFloat(String(user.fireMonthlyExpense)) : null,
    swr: user?.fireSWR ? parseFloat(String(user.fireSWR)) : null,
  } satisfies FireSettingsResponse);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { monthlyExpense, swr } = await req.json();

  if (monthlyExpense !== null && monthlyExpense !== undefined && monthlyExpense <= 0)
    return NextResponse.json({ error: "Gasto deve ser maior que zero" }, { status: 400 });
  if (swr !== null && swr !== undefined && (swr < 0.5 || swr > 20))
    return NextResponse.json({ error: "SWR deve estar entre 0.5 e 20" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(monthlyExpense !== undefined && { fireMonthlyExpense: monthlyExpense ?? null }),
      ...(swr !== undefined && { fireSWR: swr ?? null }),
    },
  });

  return NextResponse.json({
    monthlyExpense: monthlyExpense ?? null,
    swr: swr ?? null,
  } satisfies FireSettingsResponse);
}
