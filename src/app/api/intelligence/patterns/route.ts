import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface PatternPoint {
  date: string;       // ISO "2026-01-15"
  score: number;      // healthScoreAtTime
  entryType: string;  // "NOTE"|"APORTE"|"RESGATE"|"REFLEXAO"|"META"
  title: string;
}

export interface PatternsResponse {
  points: PatternPoint[];
  insight: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, healthScoreAtTime: { not: null } },
    orderBy: { date: "asc" },
    select: { date: true, healthScoreAtTime: true, entryType: true, title: true },
  });

  const points: PatternPoint[] = entries.map((e) => ({
    date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10),
    score: e.healthScoreAtTime!,
    entryType: e.entryType,
    title: e.title,
  }));

  // Calcular insight: compara score médio após aportes vs. média geral
  let insight: string | null = null;
  const aportePoints = points.filter((p) => p.entryType === "APORTE");

  if (aportePoints.length >= 3 && points.length >= 3) {
    const avgAll = points.reduce((acc, p) => acc + p.score, 0) / points.length;

    // Para cada aporte, pegar o score dele próprio e os próximos 2 pontos (dentro de 30 dias)
    let sumAfter = 0;
    let countAfter = 0;
    for (const ap of aportePoints) {
      const apDate = new Date(ap.date).getTime();
      const nearby = points.filter((p) => {
        const d = new Date(p.date).getTime();
        return d >= apDate && d <= apDate + 30 * 24 * 60 * 60 * 1000;
      });
      for (const p of nearby) {
        sumAfter += p.score;
        countAfter++;
      }
    }

    if (countAfter > 0) {
      const avgAfter = sumAfter / countAfter;
      const diff = Math.round(avgAfter - avgAll);
      if (diff > 0) {
        insight = `Após aportes, seu score ficou em média ${diff} pts acima da sua média geral.`;
      } else if (diff < 0) {
        insight = `Após aportes, seu score ficou em média ${Math.abs(diff)} pts abaixo da sua média geral.`;
      } else {
        insight = `Seus aportes coincidem com períodos de score na média (${Math.round(avgAll)} pts).`;
      }
    }
  }

  return NextResponse.json({ points, insight } satisfies PatternsResponse);
}
