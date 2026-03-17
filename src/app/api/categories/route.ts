import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, color, icon } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!color || typeof color !== "string" || !color.startsWith("#")) {
    return NextResponse.json({ error: "Cor inválida (deve iniciar com #)" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      color,
      icon: icon?.trim() || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
