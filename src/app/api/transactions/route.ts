import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 200,
    include: { category: true },
  });

  const serialized = transactions.map((tx) => ({
    ...tx,
    amount: parseFloat(String(tx.amount)),
    date: tx.date.toISOString(),
  }));

  return NextResponse.json(serialized);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { description, amount, type, categoryId, date } = body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
  }

  if (!type || !["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido (INCOME ou EXPENSE)" }, { status: 400 });
  }

  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Categoria é obrigatória" }, { status: 400 });
  }

  if (!date || isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 403 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      description: description.trim(),
      amount,
      type,
      categoryId,
      date: new Date(date),
      userId: session.user.id,
    },
    include: { category: true },
  });

  const serialized = {
    ...transaction,
    amount: parseFloat(String(transaction.amount)),
    date: transaction.date.toISOString(),
  };

  return NextResponse.json(serialized, { status: 201 });
}
