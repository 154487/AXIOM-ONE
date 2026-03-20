import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WealthItemSerialized } from "../route";

function calcCurrentValue(baseValue: number, rate: number | null, start: Date): number {
  if (!rate) return baseValue;
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return baseValue * Math.pow(1 + rate / 100, years);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, value, category, appreciationRate, notes } = body;

  const item = await prisma.wealthItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  if (value !== undefined && (typeof value !== "number" || value <= 0)) {
    return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
  }
  if (appreciationRate !== undefined && appreciationRate !== null &&
      (typeof appreciationRate !== "number" || appreciationRate < -100 || appreciationRate > 100)) {
    return NextResponse.json({ error: "Taxa inválida. Use valores entre -100 e 100." }, { status: 400 });
  }

  const updated = await prisma.wealthItem.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(value !== undefined && {
        value,
        // Quando o valor é atualizado manualmente, reinicia o ponto de partida
        // para que a valorização continue a partir do novo valor informado
        appreciationStart: new Date(),
      }),
      ...(category && { category: category.trim() }),
      // appreciationRate pode ser null (para remover a taxa)
      ...(appreciationRate !== undefined && { appreciationRate: appreciationRate }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  });

  const baseValue = parseFloat(String(updated.value));
  const rate = updated.appreciationRate != null ? parseFloat(String(updated.appreciationRate)) : null;
  const start = updated.appreciationStart ?? updated.createdAt;

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    value: calcCurrentValue(baseValue, rate, start),
    baseValue,
    itemType: updated.itemType as "ASSET" | "LIABILITY",
    category: updated.category,
    appreciationRate: rate,
    appreciationStart: start.toISOString(),
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  } satisfies WealthItemSerialized);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.wealthItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  await prisma.wealthItem.delete({ where: { id } });
  return NextResponse.json({}, { status: 204 });
}
