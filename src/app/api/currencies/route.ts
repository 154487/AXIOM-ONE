import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currencies = await prisma.userCurrency.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(currencies);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, symbol, name } = await req.json();
  if (!code || !symbol || !name) {
    return NextResponse.json({ error: "code, symbol and name are required" }, { status: 400 });
  }

  const existing = await prisma.userCurrency.findUnique({
    where: { userId_code: { userId: session.user.id, code } },
  });
  if (existing) {
    return NextResponse.json({ error: "already_added" }, { status: 409 });
  }

  // If first currency, set as default
  const count = await prisma.userCurrency.count({ where: { userId: session.user.id } });
  const isDefault = count === 0;

  const currency = await prisma.userCurrency.create({
    data: { code, symbol, name, isDefault, userId: session.user.id },
  });

  return NextResponse.json(currency, { status: 201 });
}
