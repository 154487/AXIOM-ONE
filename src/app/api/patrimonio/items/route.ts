import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCurrentValue } from "@/lib/wealthCalc";

export interface WealthItemSerialized {
  id: string;
  name: string;
  value: number;             // valor atual calculado (base * (1+rate)^anos)
  baseValue: number;         // valor original (para o formulário de edição)
  itemType: "ASSET" | "LIABILITY";
  category: string;
  appreciationRate: number | null; // % a.a. (+6 = valoriza, -10 = deprecia)
  appreciationStart: string;       // ISO date — ponto de partida do cálculo
  rateFrequency: "MONTHLY" | "ANNUAL";
  loanBank: string | null;
  loanInstallments: number | null;
  notes: string | null;
  createdAt: string;
}

export interface WealthItemsResponse {
  items: WealthItemSerialized[];
  totalAssets: number;
  totalLiabilities: number;
  net: number;
}

function serialize(item: {
  id: string;
  name: string;
  value: unknown;
  itemType: string;
  category: string;
  appreciationRate: unknown;
  appreciationStart: Date | null;
  rateFrequency: string;
  loanBank: string | null;
  loanInstallments: number | null;
  notes: string | null;
  createdAt: Date;
}): WealthItemSerialized {
  const baseValue = parseFloat(String(item.value));
  const rate = item.appreciationRate != null ? parseFloat(String(item.appreciationRate)) : null;
  const start = item.appreciationStart ?? item.createdAt;
  const frequency = (item.rateFrequency as "MONTHLY" | "ANNUAL") ?? "ANNUAL";
  const currentValue = calcCurrentValue(baseValue, rate, frequency, start);

  return {
    id: item.id,
    name: item.name,
    value: currentValue,
    baseValue,
    itemType: item.itemType as "ASSET" | "LIABILITY",
    category: item.category,
    appreciationRate: rate,
    appreciationStart: start.toISOString(),
    rateFrequency: frequency,
    loanBank: item.loanBank,
    loanInstallments: item.loanInstallments,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.wealthItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ itemType: "asc" }, { createdAt: "desc" }],
  });

  const items = rows.map(serialize);

  const totalAssets = items
    .filter((i) => i.itemType === "ASSET")
    .reduce((acc, i) => acc + i.value, 0);

  const totalLiabilities = items
    .filter((i) => i.itemType === "LIABILITY")
    .reduce((acc, i) => acc + i.value, 0);

  return NextResponse.json({
    items,
    totalAssets,
    totalLiabilities,
    net: totalAssets - totalLiabilities,
  } satisfies WealthItemsResponse);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, value, itemType, category, appreciationRate, rateFrequency, loanBank, loanInstallments, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  if (!value || typeof value !== "number" || value <= 0) {
    return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
  }
  if (itemType !== "ASSET" && itemType !== "LIABILITY") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  if (!category || typeof category !== "string" || category.trim().length === 0) {
    return NextResponse.json({ error: "Categoria é obrigatória" }, { status: 400 });
  }
  if (appreciationRate !== undefined && appreciationRate !== null &&
      (typeof appreciationRate !== "number" || appreciationRate < -100 || appreciationRate > 100)) {
    return NextResponse.json({ error: "Taxa inválida. Use valores entre -100 e 100." }, { status: 400 });
  }

  const item = await prisma.wealthItem.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      value,
      itemType,
      category: category.trim(),
      appreciationRate: appreciationRate ?? null,
      appreciationStart: new Date(),
      rateFrequency: rateFrequency ?? "ANNUAL",
      loanBank: loanBank ?? null,
      loanInstallments: loanInstallments ?? null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(serialize(item), { status: 201 });
}
