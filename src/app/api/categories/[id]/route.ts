import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, color, icon, isEssential } = body;

  const category = await prisma.category.findUnique({ where: { id } });

  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(color && { color }),
      ...(icon !== undefined && { icon: icon?.trim() || null }),
      ...(isEssential !== undefined && { isEssential }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true } } },
  });

  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 403 });
  }

  if (category._count.transactions > 0) {
    return NextResponse.json(
      { error: "Categoria possui transações vinculadas" },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
