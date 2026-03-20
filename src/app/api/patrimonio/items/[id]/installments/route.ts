import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface InstallmentSerialized {
  id: string;
  wealthItemId: string;
  month: number;
  year: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  paidAt: string | null;
}

export interface InstallmentStatusResponse {
  installment: InstallmentSerialized | null;
  paidCount: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  const item = await prisma.wealthItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  const [installment, paidCount] = await Promise.all([
    !isNaN(month) && !isNaN(year)
      ? prisma.wealthItemInstallment.findUnique({
          where: { wealthItemId_month_year: { wealthItemId: id, month, year } },
        })
      : Promise.resolve(null),
    prisma.wealthItemInstallment.count({
      where: { wealthItemId: id, status: "PAID" },
    }),
  ]);

  return NextResponse.json({
    installment: installment
      ? {
          id: installment.id,
          wealthItemId: installment.wealthItemId,
          month: installment.month,
          year: installment.year,
          status: installment.status as "PENDING" | "PAID" | "OVERDUE",
          paidAt: installment.paidAt?.toISOString() ?? null,
        }
      : null,
    paidCount,
  } satisfies InstallmentStatusResponse);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { month, year, status } = body;

  const item = await prisma.wealthItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  if (!["PAID", "OVERDUE", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  if (typeof month !== "number" || month < 1 || month > 12) {
    return NextResponse.json({ error: "Mês inválido" }, { status: 400 });
  }
  if (typeof year !== "number" || year < 2020 || year > 2050) {
    return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
  }

  const installment = await prisma.wealthItemInstallment.upsert({
    where: { wealthItemId_month_year: { wealthItemId: id, month, year } },
    create: {
      wealthItemId: id,
      month,
      year,
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
    update: {
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: installment.id,
    wealthItemId: installment.wealthItemId,
    month: installment.month,
    year: installment.year,
    status: installment.status as "PENDING" | "PAID" | "OVERDUE",
    paidAt: installment.paidAt?.toISOString() ?? null,
  } satisfies InstallmentSerialized);
}
