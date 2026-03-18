import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReviewedRow } from "@/lib/import/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows: ReviewedRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { rows } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nenhuma transação para importar" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Máximo de 500 transações por importação" }, { status: 400 });
  }

  // Collect all unique categoryIds
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean) as string[])];

  // Validate all categoryIds belong to user
  const userCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId: session.user.id },
    select: { id: true },
  });

  const validCategoryIds = new Set(userCategories.map((c) => c.id));
  const invalidRow = rows.find((r) => r.categoryId && !validCategoryIds.has(r.categoryId));
  if (invalidRow) {
    return NextResponse.json({ error: "Categoria inválida ou sem permissão" }, { status: 403 });
  }

  const userId = session.user.id as string;

  // Bulk insert
  await prisma.transaction.createMany({
    data: rows.map((row) => ({
      description: row.description.trim() || row.cleanDescription,
      amount: row.amount,
      type: row.type,
      date: new Date(row.date),
      userId,
      categoryId: row.categoryId as string,
    })),
  });

  // Create system notification
  await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      title: "Importação concluída",
      message: `${rows.length} transações importadas com sucesso.`,
    },
  });

  return NextResponse.json({ imported: rows.length }, { status: 201 });
}
