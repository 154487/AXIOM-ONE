import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const currency = await prisma.userCurrency.findUnique({ where: { id } });
  if (!currency || currency.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userCurrency.delete({ where: { id } });

  // If deleted currency was default, promote the oldest remaining one
  if (currency.isDefault) {
    const next = await prisma.userCurrency.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.userCurrency.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const currency = await prisma.userCurrency.findUnique({ where: { id } });
  if (!currency || currency.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Clear all defaults, then set this one
  await prisma.userCurrency.updateMany({
    where: { userId: session.user.id },
    data: { isDefault: false },
  });
  await prisma.userCurrency.update({ where: { id }, data: { isDefault: true } });

  return NextResponse.json({ ok: true });
}
