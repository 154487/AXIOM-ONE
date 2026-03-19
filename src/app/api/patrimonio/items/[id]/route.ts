import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, value, category, notes } = body;

  const item = await prisma.wealthItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  if (value !== undefined && (typeof value !== "number" || value <= 0)) {
    return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
  }

  const updated = await prisma.wealthItem.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(value !== undefined && { value }),
      ...(category && { category: category.trim() }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    value: parseFloat(String(updated.value)),
    itemType: updated.itemType as "ASSET" | "LIABILITY",
    category: updated.category,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  });
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
