import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHealthSnapshot } from "@/lib/healthSnapshot";
import { JournalEntry, Prisma } from "@/generated/prisma/client";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2026-03"
  const type  = searchParams.get("type");
  const tag   = searchParams.get("tag");

  const where: Prisma.JournalEntryWhereInput = {
    userId: session.user.id,
  };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59, 999) };
  }
  if (type) where.entryType = type as JournalEntry["entryType"];
  if (tag)  where.tags = { has: tag };

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(entries.map(serializeEntry));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, entryType, tags, date } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });

  const snapshot = await getHealthSnapshot(session.user.id);

  const entry = await prisma.journalEntry.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      content: content.trim(),
      entryType: entryType ?? "NOTE",
      tags: Array.isArray(tags) ? tags : [],
      date: date ? new Date(date) : new Date(),
      healthScoreAtTime: snapshot.healthScore,
      sustainableSurplusAtTime: snapshot.sustainableSurplus,
    },
  });

  return NextResponse.json(serializeEntry(entry), { status: 201 });
}
