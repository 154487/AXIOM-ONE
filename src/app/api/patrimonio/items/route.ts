import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface WealthItemSerialized {
  id: string;
  name: string;
  value: number;
  itemType: "ASSET" | "LIABILITY";
  category: string;
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
  notes: string | null;
  createdAt: Date;
}): WealthItemSerialized {
  return {
    id: item.id,
    name: item.name,
    value: parseFloat(String(item.value)),
    itemType: item.itemType as "ASSET" | "LIABILITY",
    category: item.category,
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
  const { name, value, itemType, category, notes } = body;

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

  const item = await prisma.wealthItem.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      value,
      itemType,
      category: category.trim(),
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(serialize(item), { status: 201 });
}
