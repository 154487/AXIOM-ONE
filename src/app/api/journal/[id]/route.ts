import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JournalEntry } from "@/generated/prisma/client";

function serializeEntry(entry: JournalEntry) {
  return {
    ...entry,
    sustainableSurplusAtTime: entry.sustainableSurplusAtTime
      ? parseFloat(String(entry.sustainableSurplusAtTime))
      : null,
    date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (entry.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, content, entryType, tags, date } = body;

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...(title     !== undefined && { title: title.trim() }),
      ...(content   !== undefined && { content: content.trim() }),
      ...(entryType !== undefined && { entryType }),
      ...(tags      !== undefined && { tags }),
      ...(date      !== undefined && { date: new Date(date) }),
      // healthScoreAtTime: NUNCA atualizar — snapshot imutável
    },
  });

  return NextResponse.json(serializeEntry(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (entry.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.journalEntry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
